"use server";

import { getMessaging } from '@/lib/firebase-admin';
import type { Student, Admin } from '@/types/student';
import { getStudentByCustomId, getAllStudents } from '@/services/student-service';
import { getDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore'; // Import FieldValue for arrayRemove
import type { AlertItem } from '@/types/communication';

// --- Configuration ---
const DEFAULT_LINK = '/';
const FALLBACK_DOMAIN = 'https://taxshilacompanion.vercel.app';
const ONE_SIGNAL_BATCH_SIZE = 2000; 
const FCM_BATCH_SIZE = 500;         
// 🔴 CHANGE THIS: Make sure it is a full URL
const DEFAULT_ICON = `${FALLBACK_DOMAIN}/logo.png`;

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  click_action?: string;
}

// ==========================================
// 1. CLEANUP HELPER (The Advanced Fix)
// ==========================================

/**
 * Locates users possessing the invalid IDs and removes them from Firestore.
 * checks both 'students' and 'admins' collections.
 */
async function cleanupInvalidOneSignalIds(invalidIds: string[]) {
  if (!invalidIds || invalidIds.length === 0) return;

  console.log(`[Notification Service] 🧹 Cleaning up ${invalidIds.length} invalid OneSignal IDs...`);
  const db = getDb();

  // We process each ID individually to ensure we find the correct user owner
  // This runs in the background so it won't slow down the response significantly
  const cleanupPromises = invalidIds.map(async (invalidId) => {
    try {
      // 1. Try to find the user in 'students'
      const studentQuery = await db.collection('students')
        .where('oneSignalPlayerIds', 'array-contains', invalidId)
        .get();

      if (!studentQuery.empty) {
        studentQuery.forEach(doc => {
          doc.ref.update({
            oneSignalPlayerIds: FieldValue.arrayRemove(invalidId)
          });
          console.log(`[Notification Service] Removed dead ID ${invalidId} from Student ${doc.id}`);
        });
        return; // Found in students, stop looking
      }

      // 2. If not found, try 'admins'
      const adminQuery = await db.collection('admins')
        .where('oneSignalPlayerIds', 'array-contains', invalidId)
        .get();

      if (!adminQuery.empty) {
        adminQuery.forEach(doc => {
          doc.ref.update({
            oneSignalPlayerIds: FieldValue.arrayRemove(invalidId)
          });
          console.log(`[Notification Service] Removed dead ID ${invalidId} from Admin ${doc.id}`);
        });
      }
      
    } catch (err) {
      console.error(`[Notification Service] Failed to cleanup ID ${invalidId}:`, err);
    }
  });

  await Promise.all(cleanupPromises);
}

// ==========================================
// 2. SENDING HELPERS
// ==========================================

async function sendFcmBatch(tokens: string[], payload: NotificationPayload) {
  if (!tokens.length) return;
  const messaging = getMessaging();
  const chunks = [];

  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    chunks.push(tokens.slice(i, i + FCM_BATCH_SIZE));
  }

  await Promise.all(chunks.map(async (tokenChunk) => {
    try {
      await messaging.sendEachForMulticast({
        tokens: tokenChunk,
        notification: { title: payload.title, body: payload.body },
        webpush: {
          notification: { icon: payload.icon || DEFAULT_ICON },
          fcmOptions: { link: payload.click_action || DEFAULT_LINK },
        },
      });
      console.log(`[Notification Service] FCM batch sent to ${tokenChunk.length} devices.`);
    } catch (error) {
      console.error('[Notification Service] FCM Batch Error:', error);
    }
  }));
}

async function sendOneSignalBatch(playerIds: string[], payload: NotificationPayload) {
  const APP_ID = process.env.ONE_SIGNAL_APP_ID;
  const API_KEY = process.env.ONE_SIGNAL_REST_API_KEY;

  if (!playerIds.length || !APP_ID || !API_KEY) return;

  const relativePath = payload.click_action || DEFAULT_LINK;
  const targetUrl = relativePath.startsWith('http') 
    ? relativePath 
    : `${FALLBACK_DOMAIN}${relativePath}`;
  // 1. Prepare the Icon URL (Must be Absolute)
  let iconUrl = payload.icon || DEFAULT_ICON;
  if (iconUrl.startsWith('/')) {
      iconUrl = `${FALLBACK_DOMAIN}${iconUrl}`;
  }
  const chunks = [];
  for (let i = 0; i < playerIds.length; i += ONE_SIGNAL_BATCH_SIZE) {
    chunks.push(playerIds.slice(i, i + ONE_SIGNAL_BATCH_SIZE));
  }

  

  await Promise.all(chunks.map(async (idChunk) => {
    try {
      const response = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Key ${API_KEY}`
        },
        body: JSON.stringify({
          app_id: APP_ID,
          include_player_ids: idChunk,
          headings: { "en": payload.title },
          contents: { "en": payload.body },
          data: { targetUrl: targetUrl }, 
          large_icon: iconUrl,
        })
      });

      const responseData = await response.json();

      // --- 🚨 DETECT AND CLEANUP DEAD IDS 🚨 ---
      if (responseData.invalid_player_ids && Array.isArray(responseData.invalid_player_ids)) {
         // Don't await this, let it run in background to keep API fast
         cleanupInvalidOneSignalIds(responseData.invalid_player_ids).catch(e => console.error(e));
      }
      // ----------------------------------------

      if (!response.ok) {
        console.error('[Notification Service] OneSignal API Error:', responseData);
      } else {
        console.log(`[Notification Service] OneSignal batch sent. Recipients: ${responseData.recipients}`);
      }
    } catch (error) {
      console.error('[Notification Service] OneSignal Fetch Error:', error);
    }
  }));
}

// ==========================================
// 3. EXPORTED FUNCTIONS
// ==========================================

export async function sendNotificationToStudent(studentId: string, payload: NotificationPayload): Promise<void> {
  // console.log(`[Notification Service] Sending to student: ${studentId}`);
  const student = await getStudentByCustomId(studentId);
  
  if (!student) {
      console.warn(`[Notification Service] Student ${studentId} not found.`);
      return;
  }

  await Promise.all([
    sendFcmBatch(student.fcmTokens || [], payload),
    sendOneSignalBatch(student.oneSignalPlayerIds || [], payload)
  ]);
}

export async function sendNotificationToAllAdmins(payload: NotificationPayload): Promise<void> {
  // console.log('[Notification Service] Sending to all admins.');
  const db = getDb();
  const adminsSnapshot = await db.collection('admins').get();
  
  if (adminsSnapshot.empty) return;

  const allFcmTokens: string[] = [];
  const allOneSignalIds: string[] = [];

  adminsSnapshot.docs.forEach(doc => {
    const admin = doc.data() as Admin;
    if (admin.fcmTokens) allFcmTokens.push(...admin.fcmTokens);
    if (admin.oneSignalPlayerIds) allOneSignalIds.push(...admin.oneSignalPlayerIds);
  });

  await Promise.all([
    sendFcmBatch(allFcmTokens, payload),
    sendOneSignalBatch(allOneSignalIds, payload)
  ]);
}

export async function sendNotificationToAllStudents(payload: NotificationPayload): Promise<void> {
  console.log(`[Notification Service] Sending general alert to ALL students.`);
  
  const allStudents = await getAllStudents();
  const activeStudents = allStudents.filter(s => s.activityStatus === 'Active');
  
  if (activeStudents.length === 0) {
    console.warn('[Notification Service] No active students found.');
    return;
  }

  const allFcmTokens = activeStudents.flatMap(s => s.fcmTokens || []);
  const allOneSignalIds = activeStudents.flatMap(s => s.oneSignalPlayerIds || []);

  console.log(`[Notification Service] Targets: ${allFcmTokens.length} FCM, ${allOneSignalIds.length} OneSignal.`);

  await Promise.all([
    sendFcmBatch(allFcmTokens, payload),
    sendOneSignalBatch(allOneSignalIds, payload)
  ]);
}

export async function triggerAlertNotification(alert: AlertItem): Promise<void> {
  console.log(`[Notification Service] Trigger: Alert ${alert.id}`);
  
  const payload: NotificationPayload = {
    title: alert.title,
    body: alert.message,
    icon: DEFAULT_ICON,
    click_action: alert.studentId && alert.studentId !== '__GENERAL__' 
      ? '/member/alerts' 
      : '/admin/alerts/history',
  };

  try {
    if (alert.studentId && alert.studentId !== '__GENERAL__') {
      await sendNotificationToStudent(alert.studentId, payload);
    } else {
      await sendNotificationToAllStudents(payload);
    }
  } catch (error) {
    console.error(`[Notification Service] Failed to trigger alert ${alert.id}:`, error);
  }
}

export async function triggerAdminFeedbackNotification(studentName: string, feedbackType: string): Promise<void> {
    const payload: NotificationPayload = {
        title: 'New Feedback Submitted',
        body: `${studentName} has submitted a new piece of feedback (${feedbackType}).`,
        icon: DEFAULT_ICON,
        click_action: '/admin/feedback',
    };

    try {
        await sendNotificationToAllAdmins(payload);
    } catch (error) {
        console.error(`[Notification Service] Failed to notify admins:`, error);
    }
}