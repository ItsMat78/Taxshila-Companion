

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
  
  if (!student) {
      console.warn(`[Notification Service] Student ${studentId} not found.`);
      return;
  }

  // --- 1. Firebase (FCM) Notification Logic (Existing) ---
  if (student.fcmTokens && student.fcmTokens.length > 0) {
    const fcmTokens = student.fcmTokens;
    console.log(`[Notification Service] Found FCM tokens for student ${studentId}:`, fcmTokens.length);
    
    const fcmMessage = {
      tokens: fcmTokens,
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
      await getMessaging().sendEachForMulticast(fcmMessage);
      console.log(`[Notification Service] Successfully sent FCM message for student ${studentId}.`);
    } catch (error) {
      console.error(`[Notification Service] Error sending FCM message to student ${studentId}:`, error);
    }
  } else {
    console.warn(`[Notification Service] Student ${studentId} has no FCM tokens.`);
  }

  // --- 2. OneSignal Notification Logic (New) ---
  const ONE_SIGNAL_APP_ID = process.env.ONE_SIGNAL_APP_ID;
  const ONE_SIGNAL_REST_API_KEY = process.env.ONE_SIGNAL_REST_API_KEY;

  if (student.oneSignalPlayerIds && student.oneSignalPlayerIds.length > 0 && ONE_SIGNAL_APP_ID && ONE_SIGNAL_REST_API_KEY) {
    const oneSignalPlayerIds = student.oneSignalPlayerIds;
    console.log(`[Notification Service] Found OneSignal Player IDs for student ${studentId}:`, oneSignalPlayerIds.length);

    const oneSignalMessage = {
      app_id: ONE_SIGNAL_APP_ID,
      include_player_ids: oneSignalPlayerIds,
      headings: { "en": payload.title },
      contents: { "en": payload.body },
      web_url: payload.click_action || 'https://taxshila-companion.web.app' // Fallback URL
    };

    try {
      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Key ${ONE_SIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify(oneSignalMessage)
      });

      if (response.ok) {
        console.log(`[Notification Service] Successfully sent OneSignal notification for student ${studentId}.`);
      } else {
        const responseData = await response.json();
        console.error(`[Notification Service] Failed to send OneSignal notification for student ${studentId}:`, responseData);
      }
    } catch (error) {
      console.error(`[Notification Service] Error making fetch request to OneSignal for student ${studentId}:`, error);
    }
  } else {
    console.warn(`[Notification Service] Student ${studentId} has no OneSignal Player IDs, or OneSignal credentials are not configured.`);
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
  
  const ONE_SIGNAL_APP_ID = process.env.ONE_SIGNAL_APP_ID;
  const ONE_SIGNAL_REST_API_KEY = process.env.ONE_SIGNAL_REST_API_KEY;

  for (const doc of adminsSnapshot.docs) {
      const admin = doc.data() as Admin;
      
      // --- 1. Firebase (FCM) Notification Logic ---
      if (admin.fcmTokens && admin.fcmTokens.length > 0) {
          const fcmMessage = {
              tokens: admin.fcmTokens,
              notification: { title: payload.title, body: payload.body },
              webpush: { 
                  notification: { icon: payload.icon || '/logo.png' },
                  fcmOptions: { link: payload.click_action || '/' } 
              },
          };
          try {
              await getMessaging().sendEachForMulticast(fcmMessage);
              console.log(`[Notification Service] Sent FCM notification to admin ${admin.email}.`);
          } catch(e) { console.error(`Error sending FCM to ${admin.email}`, e)}
      }

      // --- 2. OneSignal Notification Logic ---
      if (admin.oneSignalPlayerIds && admin.oneSignalPlayerIds.length > 0 && ONE_SIGNAL_APP_ID && ONE_SIGNAL_REST_API_KEY) {
          const oneSignalMessage = {
              app_id: ONE_SIGNAL_APP_ID,
              include_player_ids: admin.oneSignalPlayerIds,
              headings: { "en": payload.title },
              contents: { "en": payload.body },
              web_url: payload.click_action || 'https://taxshila-companion.web.app'
          };
          try {
              const response = await fetch("https://onesignal.com/api/v1/notifications", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json; charset=utf-8",
                      "Authorization": `Key ${ONE_SIGNAL_REST_API_KEY}`
                  },
                  body: JSON.stringify(oneSignalMessage)
              });
               if (response.ok) {
                console.log(`[Notification Service] Successfully sent OneSignal notification for admin ${admin.email}.`);
              } else {
                const responseData = await response.json();
                console.error(`[Notification Service] Failed to send OneSignal notification for admin ${admin.email}:`, responseData);
              }
          } catch(e) { console.error(`Error sending OneSignal to ${admin.email}`, e)}
      }
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
    if (alert.studentId && alert.studentId !== '__GENERAL__') {
      // It's a targeted alert for a student
      await sendNotificationToStudent(alert.studentId, payload);
    } else {
      // This is a general alert. The logic to send to ALL students would be complex and resource-intensive.
      // A better approach is using FCM topics, but for now, we will not send push notifications for general alerts.
      // They will appear in the member's alert inbox when they open the app.
      console.log(`[Notification Service] General alert created (ID: ${alert.id}). Push notifications are not sent for general alerts.`);
    }
  } catch (error) {
      console.error(`[Notification Service] Failed to trigger alert notification for alert ${alert.id}. Error:`, error);
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
