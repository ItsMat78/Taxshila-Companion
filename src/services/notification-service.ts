"use server";

import { getMessaging } from '@/lib/firebase-admin';
import type { Student, Admin } from '@/types/student';
import { getStudentByCustomId, getAllStudents } from '@/services/student-service';
import { getDb } from '@/lib/firebase-admin';
import type { AlertItem } from '@/types/communication';

// --- Configuration ---
const DEFAULT_ICON = '/logo.png';
const DEFAULT_LINK = '/';
const FALLBACK_DOMAIN = 'https://taxshilacompanion.vercel.app';
const ONE_SIGNAL_BATCH_SIZE = 2000; // Safe limit for REST API
const FCM_BATCH_SIZE = 500;         // Strict Firebase limit

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  click_action?: string;
}

// ==========================================
// 1. HELPER FUNCTIONS (The Core Logic)
// ==========================================

/**
 * Sends FCM notifications in strict batches of 500 to avoid "Number of tokens exceeds 500" error.
 */
async function sendFcmBatch(tokens: string[], payload: NotificationPayload) {
  if (!tokens.length) return;

  const messaging = getMessaging();
  const chunks = [];

  // Split tokens into chunks of 500
  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    chunks.push(tokens.slice(i, i + FCM_BATCH_SIZE));
  }

  // Send all chunks in parallel
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

/**
 * Sends OneSignal notifications using the REST API.
 * Uses `data.targetUrl` specifically for Median.co apps.
 */
async function sendOneSignalBatch(playerIds: string[], payload: NotificationPayload) {
  const APP_ID = process.env.ONE_SIGNAL_APP_ID;
  const API_KEY = process.env.ONE_SIGNAL_REST_API_KEY;

  if (!playerIds.length || !APP_ID || !API_KEY) return;

  // Determine the Target URL (Deep Link)
  // If the payload path is relative (e.g., "/member/alerts"), we prepend the domain for safety
  const relativePath = payload.click_action || DEFAULT_LINK;
  const targetUrl = relativePath.startsWith('http') 
    ? relativePath 
    : `${FALLBACK_DOMAIN}${relativePath}`;

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
          
          // --- MEDIAN.CO CRITICAL CONFIG ---
          // Use 'data' instead of 'web_url' to keep the user inside the app
          data: { targetUrl: targetUrl }, 
          // --------------------------------
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Notification Service] OneSignal API Error:', errorData);
      } else {
        console.log(`[Notification Service] OneSignal batch sent to ${idChunk.length} devices.`);
      }
    } catch (error) {
      console.error('[Notification Service] OneSignal Fetch Error:', error);
    }
  }));
}

// ==========================================
// 2. EXPORTED FUNCTIONS
// ==========================================

export async function sendNotificationToStudent(studentId: string, payload: NotificationPayload): Promise<void> {
  console.log(`[Notification Service] Sending to student: ${studentId}`);
  const student = await getStudentByCustomId(studentId);
  
  if (!student) {
      console.warn(`[Notification Service] Student ${studentId} not found.`);
      return;
  }

  // Run both providers in parallel
  await Promise.all([
    sendFcmBatch(student.fcmTokens || [], payload),
    sendOneSignalBatch(student.oneSignalPlayerIds || [], payload)
  ]);
}

export async function sendNotificationToAllAdmins(payload: NotificationPayload): Promise<void> {
  console.log('[Notification Service] Sending to all admins.');
  const db = getDb();
  const adminsSnapshot = await db.collection('admins').get();
  
  if (adminsSnapshot.empty) return;

  // Aggregate ALL admin tokens first (Performance optimization)
  const allFcmTokens: string[] = [];
  const allOneSignalIds: string[] = [];

  adminsSnapshot.docs.forEach(doc => {
    const admin = doc.data() as Admin;
    if (admin.fcmTokens) allFcmTokens.push(...admin.fcmTokens);
    if (admin.oneSignalPlayerIds) allOneSignalIds.push(...admin.oneSignalPlayerIds);
  });

  // Send efficiently
  await Promise.all([
    sendFcmBatch(allFcmTokens, payload),
    sendOneSignalBatch(allOneSignalIds, payload)
  ]);
}

export async function sendNotificationToAllStudents(payload: NotificationPayload): Promise<void> {
  console.log(`[Notification Service] Sending general alert to ALL students.`);
  
  // NOTE: For very large datasets (>5000), consider using Firestore streams instead of getting all docs
  const allStudents = await getAllStudents();
  const activeStudents = allStudents.filter(s => s.activityStatus === 'Active');
  
  if (activeStudents.length === 0) {
    console.warn('[Notification Service] No active students found.');
    return;
  }

  // Flatten all tokens into single arrays
  const allFcmTokens = activeStudents.flatMap(s => s.fcmTokens || []);
  const allOneSignalIds = activeStudents.flatMap(s => s.oneSignalPlayerIds || []);

  console.log(`[Notification Service] Targets: ${allFcmTokens.length} FCM, ${allOneSignalIds.length} OneSignal.`);

  // Send using the chunking helpers
  await Promise.all([
    sendFcmBatch(allFcmTokens, payload),
    sendOneSignalBatch(allOneSignalIds, payload)
  ]);
}

/**
 * Triggered by API when an alert is created.
 */
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
    // throw error; // Optional: Uncomment if you want the API call to fail 
  }
}

/**
 * Triggered by API when feedback is submitted.
 */
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