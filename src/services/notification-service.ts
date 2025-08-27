
"use server";

import { getMessaging } from '@/lib/firebase-admin';
import type { Student, Admin } from '@/types/student';
import { getStudentByCustomId, getAdminByEmail } from '@/services/student-service';
import { getDb } from '@/lib/firebase-admin';
import type { AlertItem } from '@/types/communication';

// Define a type for the notification payload for clarity
interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  click_action?: string;
}

/**
 * Sends a push notification to a single student.
 * @param studentId The custom student ID (e.g., TSMEM0001).
 * @param payload The notification content.
 */
async function sendNotificationToStudent(studentId: string, payload: NotificationPayload): Promise<void> {
  console.log(`[Notification Service] Attempting to send notification to student: ${studentId}`);
  const student = await getStudentByCustomId(studentId);
  if (!student || !student.fcmTokens || student.fcmTokens.length === 0) {
    console.warn(`[Notification Service] Student ${studentId} not found or has no FCM tokens.`);
    return;
  }
  
  const tokens = student.fcmTokens;
  console.log(`[Notification Service] Found tokens for student ${studentId}:`, tokens);

  const message = {
    tokens: tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    webpush: {
      notification: {
        icon: payload.icon || '/logo.png',
      },
      fcmOptions: {
        link: payload.click_action || '/',
      },
    },
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`[Notification Service] Successfully sent message to ${response.successCount} tokens for student ${studentId}.`);
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error(`[Notification Service] Token failed for student ${studentId}:`, tokens[idx], resp.error);
        }
      });
      // Optional: Add logic here to remove failed tokens from the user's document in Firestore
    }
  } catch (error) {
    console.error(`[Notification Service] Error sending multicast message to student ${studentId}:`, error);
    throw new Error('Failed to send push notifications.');
  }
}

/**
 * Sends a push notification to all admin users.
 */
async function sendNotificationToAllAdmins(payload: NotificationPayload): Promise<void> {
  console.log('[Notification Service] Attempting to send notification to all admins.');
  const db = getDb();
  const adminsSnapshot = await db.collection('admins').get();
  
  if (adminsSnapshot.empty) {
    console.warn('[Notification Service] No admin users found to send notification.');
    return;
  }

  const allAdminTokens: string[] = [];
  adminsSnapshot.forEach(doc => {
    const admin = doc.data() as Admin;
    if (admin.fcmTokens && admin.fcmTokens.length > 0) {
      allAdminTokens.push(...admin.fcmTokens);
    }
  });

  if (allAdminTokens.length === 0) {
    console.warn('[Notification Service] No admin users have FCM tokens.');
    return;
  }
  
  const uniqueTokens = [...new Set(allAdminTokens)];
  console.log(`[Notification Service] Found ${uniqueTokens.length} unique admin tokens.`);

  const message = {
    tokens: uniqueTokens,
    notification: {
        title: payload.title,
        body: payload.body,
    },
     webpush: {
      notification: {
        icon: payload.icon || '/logo.png',
      },
      fcmOptions: {
        link: payload.click_action || '/',
      },
    },
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`[Notification Service] Successfully sent message to ${response.successCount} admin tokens.`);
  } catch (error) {
    console.error('[Notification Service] Error sending multicast message to admins:', error);
    throw new Error('Failed to send push notifications to admins.');
  }
}

/**
 * Triggers a notification based on a newly created alert item.
 * This function will be called from an API route.
 * @param alert The alert item that was just created.
 */
export async function triggerAlertNotification(alert: AlertItem): Promise<void> {
  console.log(`[Notification Service] Triggered for Alert ID: ${alert.id}, Student ID: ${alert.studentId}`);
  
  const payload: NotificationPayload = {
    title: alert.title,
    body: alert.message,
    icon: '/logo.png',
    click_action: alert.studentId ? '/member/alerts' : '/admin/alerts/history',
  };

  try {
    if (alert.studentId) {
      // It's a targeted alert for a student
      await sendNotificationToStudent(alert.studentId, payload);
    } else {
      // It's a general alert. Send to all students.
      // This is a placeholder for future implementation as sending to all students
      // at once can be complex. For now, we assume general alerts are seen in-app.
      // A better approach would be to send to topics or handle this via a backend loop.
      console.log(`[Notification Service] General alert created (ID: ${alert.id}). Notification sending to all students is not yet implemented via this function.`);
    }
  } catch (error) {
      console.error(`[Notification Service] Failed to trigger alert notification for alert ${alert.id}. Error:`, error);
      // Re-throw the error so the API route can catch it and return a 500 status.
      throw error;
  }
}

/**
 * Triggers a notification to all admins about a new feedback submission.
 * @param studentName The name of the student who submitted feedback.
 * @param feedbackType The type of feedback submitted.
 */
export async function triggerAdminFeedbackNotification(studentName: string, feedbackType: string): Promise<void> {
    console.log(`[Notification Service] Triggered for new feedback from: ${studentName}`);
    const payload: NotificationPayload = {
        title: 'New Feedback Submitted',
        body: `${studentName} has submitted a new piece of feedback (${feedbackType}).`,
        icon: '/logo.png',
        click_action: '/admin/feedback',
    };

    try {
        await sendNotificationToAllAdmins(payload);
    } catch (error) {
        console.error(`[Notification Service] Failed to trigger admin feedback notification. Error:`, error);
        throw error;
    }
}
