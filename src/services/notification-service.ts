

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
    console.log(`SNS: Attempting to send notification to student: ${student.studentId}`);
    if (!student.fcmTokens || student.fcmTokens.length === 0) {
        console.log(`SNS: No FCM tokens found for student ${student.studentId}. Aborting.`);
        return;
    }
    console.log(`SNS: Found tokens for student ${student.studentId}:`, student.fcmTokens.length);


    const payload = {
        notification: {
            title: alert.title,
            body: alert.message,
            icon: "/logo.png",
        },
        webpush: {
            fcmOptions: {
                link: `/member/alerts`,
            },
        },
    };

    const response = await messaging.sendToDevice(student.fcmTokens, payload);
    console.log(`SNS: FCM response for student ${student.studentId}:`, response);
    await cleanupStudentTokens(response, student);
}

/**
 * Sends a push notification to all active students.
 * @param allStudents A list of all student objects from Firestore.
 * @param alert The alert item to be sent.
 */
async function sendNotificationToAllStudents(allStudents: Student[], alert: AlertItem) {
    console.log("SNS: Attempting to send notification to all students.");
    const activeStudents = allStudents.filter(s => s.activityStatus === 'Active' && s.fcmTokens && s.fcmTokens.length > 0);
    const allTokens = activeStudents.flatMap(s => s.fcmTokens!);
    
    if (allTokens.length === 0) {
        console.log("SNS: No active students with FCM tokens found. Aborting broadcast.");
        return;
    }
    
    const uniqueTokens = [...new Set(allTokens)];
    console.log(`SNS: Broadcasting to ${uniqueTokens.length} unique tokens.`);

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
        webpush: {
            fcmOptions: {
                link: `/member/alerts`,
            },
        },
    };

    for (const chunk of tokenChunks) {
        const message = { ...payload, tokens: chunk };
        const response = await messaging.sendEachForMulticast(message);
        console.log(`SNS: Broadcast chunk response: Success ${response.successCount}, Failure ${response.failureCount}`);
        // Comprehensive cleanup would be more complex here, maybe handled separately.
    }
}

/**
 * Sends a push notification to all admins.
 * @param allAdmins A list of all admin objects from Firestore.
 * @param feedback The feedback item that was submitted.
 */
async function sendNotificationToAdmins(allAdmins: Admin[], feedback: FeedbackItem) {
    console.log("SNS: Attempting to send feedback notification to admins.");
    const adminTokens = allAdmins.flatMap(a => a.fcmTokens || []);

    if (adminTokens.length === 0) {
        console.log("SNS: No admin FCM tokens found. Aborting admin notification.");
        return;
    }
    
    const uniqueTokens = [...new Set(adminTokens)];
    console.log(`SNS: Sending admin notification to ${uniqueTokens.length} unique tokens.`);

    const messageBody = feedback.studentName 
        ? `From ${feedback.studentName}: "${feedback.message.substring(0, 100)}..."` 
        : `An anonymous user submitted feedback: "${feedback.message.substring(0, 100)}..."`;

    const payload = {
        notification: {
            title: `New Feedback: ${feedback.type}`,
            body: messageBody,
            icon: "/logo.png",
        },
        webpush: {
            fcmOptions: {
                link: `/admin/feedback`,
            },
        },
    };

    const message = { ...payload, tokens: uniqueTokens };
    const response = await messaging.sendEachForMulticast(message);
    console.log(`SNS: Admin notification response: Success ${response.successCount}, Failure ${response.failureCount}`);
    await cleanupAdminTokens(response, allAdmins, uniqueTokens);
}


export async function triggerAlertNotification(alert: AlertItem) {
  console.log(`SNS: triggerAlertNotification called for alert ID: ${alert.id}`);
  const db = getDb();
  if (alert.studentId) {
    const studentQuery = await db.collection('students').where('studentId', '==', alert.studentId).limit(1).get();
    if (!studentQuery.empty) {
      const student = { ...studentQuery.docs[0].data(), firestoreId: studentQuery.docs[0].id } as Student;
      await sendNotificationToStudent(student, alert);
    } else {
      console.warn(`SNS: Student with ID ${alert.studentId} not found for targeted alert.`);
    }
  } else {
    console.log("SNS: This is a general alert. Fetching all students.");
    const studentsSnapshot = await db.collection('students').get();
    const allStudents = studentsSnapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }) as Student);
    await sendNotificationToAllStudents(allStudents, alert);
  }
}

export async function triggerFeedbackNotification(feedback: FeedbackItem) {
    console.log(`SNS: triggerFeedbackNotification called for feedback ID: ${feedback.id}`);
    const db = getDb();
    const adminsSnapshot = await db.collection('admins').get();
    const allAdmins = adminsSnapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }) as Admin);
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
            console.warn(`SNS: Error sending to token ${tokenInError.substring(0,10)}... for student ${student.studentId}. Error: ${error.code}`);
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                tokensToRemove.push(tokenInError);
            }
        }
    });

    if (tokensToRemove.length > 0 && student.firestoreId) {
        console.log(`SNS: Removing ${tokensToRemove.length} invalid tokens for student ${student.studentId}`);
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
            console.warn(`SNS: Error sending to admin token ${invalidToken.substring(0,10)}... Error: ${error.code}`);
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                tokensToRemove.push(invalidToken);
            }
        }
    });

    if (tokensToRemove.length > 0) {
        console.log(`SNS: Found ${tokensToRemove.length} invalid admin tokens to remove.`);
        const batch = db.batch();
        const adminsToUpdate = allAdmins.filter(admin => admin.fcmTokens?.some(token => tokensToRemove.includes(token)));

        adminsToUpdate.forEach(admin => {
            if (admin.firestoreId) {
                console.log(`SNS: Removing tokens from admin ${admin.email}`);
                const adminRef = db.collection('admins').doc(admin.firestoreId);
                batch.update(adminRef, { fcmTokens: FieldValue.arrayRemove(...tokensToRemove) });
            }
        });
        await batch.commit();
    }
}
