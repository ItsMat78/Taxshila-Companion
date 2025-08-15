

"use server";

import { getDb, getMessaging } from '@/lib/firebase-admin';
import type { AlertItem, FeedbackItem } from '@/types/communication';
import type { Student } from '@/types/student';
import type { Admin } from '@/types/auth';
import { FieldValue } from 'firebase-admin/firestore';

const messaging = getMessaging();

/**
 * Sends a push notification to a single student.
 * @param student The student object from Firestore.
 * @param alert The alert item to be sent.
 */
async function sendNotificationToStudent(student: Student, alert: AlertItem) {
    if (!student.fcmTokens || student.fcmTokens.length === 0) {
        return;
    }

    const payload = {
        notification: {
            title: alert.title,
            body: alert.message,
            icon: "/logo.png",
        },
        data: {
          url: '/member/alerts'
        }
    };

    // sendToDevice expects an array of tokens
    const response = await messaging.sendToDevice(student.fcmTokens, payload);
    await cleanupStudentTokens(response, student);
}

/**
 * Sends a push notification to all active students.
 * @param allStudents A list of all student objects from Firestore.
 * @param alert The alert item to be sent.
 */
async function sendNotificationToAllStudents(allStudents: Student[], alert: AlertItem) {
    const activeStudents = allStudents.filter(s => s.activityStatus === 'Active' && s.fcmTokens && s.fcmTokens.length > 0);
    const allTokens = activeStudents.flatMap(s => s.fcmTokens!);
    
    if (allTokens.length === 0) {
        return;
    }
    
    const uniqueTokens = [...new Set(allTokens)];

    const tokenChunks = [];
    for (let i = 0; i < uniqueTokens.length; i += 500) {
        tokenChunks.push(uniqueTokens.slice(i, i + 500));
    }

    const payload = {
        notification: {
            title: alert.title,
            body: alert.message,
            icon: "/logo.png",
        },
        data: {
          url: '/member/alerts'
        }
    };

    for (const chunk of tokenChunks) {
        const message = { ...payload, tokens: chunk };
        await messaging.sendEachForMulticast(message);
    }
}

/**
 * Sends a push notification to all admins.
 * @param allAdmins A list of all admin objects from Firestore.
 * @param feedback The feedback item that was submitted.
 */
async function sendNotificationToAdmins(allAdmins: Admin[], feedback: FeedbackItem) {
    const adminTokens = allAdmins.flatMap(a => a.fcmTokens || []);

    if (adminTokens.length === 0) {
        return;
    }
    
    const uniqueTokens = [...new Set(adminTokens)];

    const messageBody = feedback.studentName 
        ? `From ${feedback.studentName}: "${feedback.message.substring(0, 100)}..."` 
        : `An anonymous user submitted feedback: "${feedback.message.substring(0, 100)}..."`;

    const payload = {
        notification: {
            title: `New Feedback: ${feedback.type}`,
            body: messageBody,
            icon: "/logo.png",
        },
        data: {
          url: '/admin/feedback'
        }
    };

    const message = { ...payload, tokens: uniqueTokens };
    const response = await messaging.sendEachForMulticast(message);
    await cleanupAdminTokens(response, allAdmins, uniqueTokens);
}


export async function triggerAlertNotification(alert: AlertItem) {
  const db = getDb();
  if (alert.studentId) {
    const studentQuery = await db.collection('students').where('studentId', '==', alert.studentId).limit(1).get();
    if (!studentQuery.empty) {
      const student = { ...studentQuery.docs[0].data(), firestoreId: studentQuery.docs[0].id } as Student;
      await sendNotificationToStudent(student, alert);
    }
  } else {
    const studentsSnapshot = await db.collection('students').get();
    const allStudents = studentsSnapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }) as Student);
    await sendNotificationToAllStudents(allStudents, alert);
  }
}

export async function triggerFeedbackNotification(feedback: FeedbackItem) {
    // This function will now be called from the API route, not directly from the service.
    // It is kept here for potential direct server-to-server use if needed.
    const db = getDb();
    const adminsSnapshot = await db.collection('admins').get();
    const allAdmins = adminsSnapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id, id: doc.id }) as Admin & {id: string});
    await sendNotificationToAdmins(allAdmins, feedback);
}


// --- Helper functions for cleaning up invalid tokens ---

async function cleanupStudentTokens(response: any, student: Student) {
    const db = getDb();
    const tokensToRemove: string[] = [];
    response.results.forEach((result: any, index: number) => {
        const error = result.error;
        if (error) {
            const tokenInError = student.fcmTokens![index];
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                tokensToRemove.push(tokenInError);
            }
        }
    });

    if (tokensToRemove.length > 0 && student.firestoreId) {
        const studentRef = db.collection('students').doc(student.firestoreId);
        await studentRef.update({
            fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
        });
    }
}

async function cleanupAdminTokens(response: any, allAdmins: Admin[], sentTokens: string[]) {
    const db = getDb();
    const tokensToRemove: string[] = [];
    response.responses.forEach((result: any, index: number) => {
        const error = result.error;
        if (error) {
            const invalidToken = sentTokens[index];
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                tokensToRemove.push(invalidToken);
            }
        }
    });

    if (tokensToRemove.length > 0) {
        const batch = db.batch();
        const adminsToUpdate = allAdmins.filter(admin => admin.fcmTokens?.some(token => tokensToRemove.includes(token)));

        adminsToUpdate.forEach(admin => {
            if (admin.firestoreId) {
                const adminRef = db.collection('admins').doc(admin.firestoreId);
                batch.update(adminRef, { fcmTokens: FieldValue.arrayRemove(...tokensToRemove) });
            }
        });
        await batch.commit();
    }
}
