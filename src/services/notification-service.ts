

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
        console.log(`Notification Service: Student ${student.studentId} has no FCM tokens. Skipping notification.`);
        return;
    }
    console.log(`Notification Service: Preparing to send alert titled "${alert.title}" to student ${student.studentId} with tokens:`, student.fcmTokens);


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
    console.log(`Notification Service: FCM response for student ${student.studentId}:`, JSON.stringify(response, null, 2));
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
        console.log("Notification Service: No active students with FCM tokens found for general alert. Skipping.");
        return;
    }
    
    const uniqueTokens = [...new Set(allTokens)];
    console.log(`Notification Service: Preparing to send general alert titled "${alert.title}" to ${uniqueTokens.length} unique tokens.`);

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
        const response = await messaging.sendEachForMulticast(message);
        console.log(`Notification Service: FCM response for general alert chunk: Success: ${response.successCount}, Failure: ${response.failureCount}`);
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
        console.log("Notification Service: No admin FCM tokens found for feedback notification. Skipping.");
        return;
    }
    
    const uniqueTokens = [...new Set(adminTokens)];
    console.log(`Notification Service: Preparing to send feedback notification to ${uniqueTokens.length} admin tokens.`);

    const messageBody = feedback.studentName 
        ? `From ${feedback.studentName}: "${feedback.message.substring(0, 100)}..."` 
        : `An anonymous user submitted feedback: "${feedback.message.substring(0, 100)}..."`;
    
    const notificationTitle = `New Feedback: ${feedback.type}`;

    const payload = {
        notification: {
            title: notificationTitle,
            body: messageBody,
            icon: "/logo.png",
        },
        data: {
          url: '/admin/feedback',
          title: notificationTitle,
          body: messageBody,
          icon: "/logo.png",
        }
    };

    const message = { ...payload, tokens: uniqueTokens };
    const response = await messaging.sendEachForMulticast(message);
    console.log(`Notification Service: FCM response for admin feedback: Success: ${response.successCount}, Failure: ${response.failureCount}`);
    await cleanupAdminTokens(response, allAdmins, uniqueTokens);
}


export async function triggerAlertNotification(alert: AlertItem) {
  console.log("Notification Service: Triggering alert notification for alert:", alert.id);
  const db = getDb();
  if (alert.studentId) {
    console.log(`Notification Service: Targeted alert for studentId: ${alert.studentId}`);
    const studentQuery = await db.collection('students').where('studentId', '==', alert.studentId).limit(1).get();
    if (!studentQuery.empty) {
      const student = { ...studentQuery.docs[0].data(), firestoreId: studentQuery.docs[0].id } as Student;
      await sendNotificationToStudent(student, alert);
    } else {
      console.warn(`Notification Service: Student with ID ${alert.studentId} not found in database.`);
    }
  } else {
    console.log("Notification Service: General alert for all students.");
    const studentsSnapshot = await db.collection('students').get();
    const allStudents = studentsSnapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }) as Student);
    await sendNotificationToAllStudents(allStudents, alert);
  }
}

export async function triggerFeedbackNotification(feedback: FeedbackItem) {
    console.log("Notification Service: Triggering feedback notification for feedback:", feedback.id);
    const db = getDb();
    const adminsSnapshot = await db.collection('admins').get();
    if(adminsSnapshot.empty) {
        console.log("Notification Service: No admins found to send feedback notification to.");
        return;
    }
    const allAdmins = adminsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Admin & {id: string});
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
            console.warn(`Notification Service: Invalid FCM token found for student ${student.studentId}. Token: ${tokenInError}, Error: ${error.code}`);
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                tokensToRemove.push(tokenInError);
            }
        }
    });

    if (tokensToRemove.length > 0 && student.firestoreId) {
        console.log(`Notification Service: Removing ${tokensToRemove.length} invalid tokens for student ${student.studentId}.`);
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
             console.warn(`Notification Service: Invalid FCM token found for admin. Token: ${invalidToken}, Error: ${error.code}`);
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                tokensToRemove.push(invalidToken);
            }
        }
    });

    if (tokensToRemove.length > 0) {
        console.log(`Notification Service: Removing ${tokensToRemove.length} invalid admin tokens.`);
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
