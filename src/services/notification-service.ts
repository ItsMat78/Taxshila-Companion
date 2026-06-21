"use server";

import { getMessaging } from '@/lib/firebase-admin';
import type { Student, Admin } from '@/types/student';
import { getStudentByCustomId, getAllStudents } from '@/services/student-service';
import { getDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore'; // Import FieldValue for arrayRemove
import type { AlertItem, NotificationResult, MemberDelivery, AlertDispatchResult } from '@/types/communication';

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

function emptyResult(): NotificationResult {
  return { fcm: { sent: 0, failed: 0 }, oneSignal: { sent: 0, failed: 0 }, recipients: 0 };
}

function mergeResults(a: NotificationResult, b: NotificationResult): NotificationResult {
  return {
    fcm: { sent: a.fcm.sent + b.fcm.sent, failed: a.fcm.failed + b.fcm.failed },
    oneSignal: { sent: a.oneSignal.sent + b.oneSignal.sent, failed: a.oneSignal.failed + b.oneSignal.failed },
    recipients: a.recipients + b.recipients,
  };
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
        });
      }
      
    } catch (err) {
      console.error(`[Notification Service] Failed to cleanup ID ${invalidId}:`, err);
    }
  });

  await Promise.all(cleanupPromises);
}

/**
 * Locates users holding stale/unregistered FCM tokens and removes them.
 * Mirrors the OneSignal cleanup so dead web-push tokens don't accumulate.
 */
async function cleanupInvalidFcmTokens(invalidTokens: string[]) {
  if (!invalidTokens || invalidTokens.length === 0) return;

  const db = getDb();

  const cleanupPromises = invalidTokens.map(async (token) => {
    try {
      const studentQuery = await db.collection('students')
        .where('fcmTokens', 'array-contains', token)
        .get();

      if (!studentQuery.empty) {
        studentQuery.forEach(doc => {
          doc.ref.update({ fcmTokens: FieldValue.arrayRemove(token) });
        });
        return;
      }

      const adminQuery = await db.collection('admins')
        .where('fcmTokens', 'array-contains', token)
        .get();

      if (!adminQuery.empty) {
        adminQuery.forEach(doc => {
          doc.ref.update({ fcmTokens: FieldValue.arrayRemove(token) });
        });
      }
    } catch (err) {
      console.error('[Notification Service] Failed to cleanup FCM token:', err);
    }
  });

  await Promise.all(cleanupPromises);
}

// FCM error codes that mean the token is permanently dead and should be pruned.
const DEAD_FCM_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

// ==========================================
// 2. SENDING HELPERS
// ==========================================

/**
 * Sends FCM in batches and returns per-token success aligned to `tokens` order,
 * so callers can attribute each result back to its owner. Dead tokens are pruned
 * in the background.
 */
async function sendFcmBatchDetailed(tokens: string[], payload: NotificationPayload): Promise<boolean[]> {
  if (!tokens.length) return [];
  const messaging = getMessaging();
  const outcomes = new Array<boolean>(tokens.length).fill(false);

  const chunks: { start: number; tokens: string[] }[] = [];
  for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
    chunks.push({ start: i, tokens: tokens.slice(i, i + FCM_BATCH_SIZE) });
  }

  await Promise.all(chunks.map(async ({ start, tokens: tokenChunk }) => {
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenChunk,
        notification: { title: payload.title, body: payload.body },
        webpush: {
          notification: { icon: payload.icon || DEFAULT_ICON },
          fcmOptions: { link: payload.click_action || DEFAULT_LINK },
        },
      });

      // Per-token outcome + collect permanently-dead tokens for pruning.
      const deadTokens: string[] = [];
      response.responses.forEach((r, i) => {
        outcomes[start + i] = r.success;
        if (!r.success && r.error && DEAD_FCM_ERROR_CODES.has(r.error.code)) {
          deadTokens.push(tokenChunk[i]);
        }
      });
      if (deadTokens.length) {
        cleanupInvalidFcmTokens(deadTokens).catch(e => console.error(e));
      }
    } catch (error) {
      console.error('[Notification Service] FCM Batch Error:', error);
      // Whole chunk failed → outcomes stay false.
    }
  }));

  return outcomes;
}

async function sendFcmBatch(tokens: string[], payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
  const outcomes = await sendFcmBatchDetailed(tokens, payload);
  const sent = outcomes.filter(Boolean).length;
  return { sent, failed: outcomes.length - sent };
}

/**
 * Sends OneSignal in batches and returns the set of player ids that FAILED —
 * i.e. ids OneSignal flagged as invalid, plus every id in a chunk that errored
 * outright (non-2xx, network error, or missing config). Anything not in the
 * returned set was accepted. Invalid ids are pruned in the background.
 *
 * Returning the failed set (rather than just counts) lets the broadcast path
 * attribute outcomes back to each member from a single batched request, instead
 * of calling the OneSignal API once per member.
 */
async function sendOneSignalBatchDetailed(playerIds: string[], payload: NotificationPayload): Promise<Set<string>> {
  const failed = new Set<string>();
  if (!playerIds.length) return failed;

  const APP_ID = process.env.ONE_SIGNAL_APP_ID;
  const API_KEY = process.env.ONE_SIGNAL_REST_API_KEY;

  if (!APP_ID || !API_KEY) {
    // Loud, so a misconfiguration doesn't masquerade as a silent "success".
    console.error('[Notification Service] OneSignal is not configured (missing ONE_SIGNAL_APP_ID or ONE_SIGNAL_REST_API_KEY). Skipping %d recipient(s).', playerIds.length);
    playerIds.forEach(id => failed.add(id));
    return failed;
  }

  const relativePath = payload.click_action || DEFAULT_LINK;
  const targetUrl = relativePath.startsWith('http')
    ? relativePath
    : `${FALLBACK_DOMAIN}${relativePath}`;
  // Icon URL must be absolute.
  let iconUrl = payload.icon || DEFAULT_ICON;
  if (iconUrl.startsWith('/')) {
      iconUrl = `${FALLBACK_DOMAIN}${iconUrl}`;
  }

  const chunks: string[][] = [];
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
          // `include_subscription_ids` is the current (player-model) field;
          // `include_player_ids` is its deprecated alias.
          include_subscription_ids: idChunk,
          headings: { "en": payload.title },
          contents: { "en": payload.body },
          data: { targetUrl: targetUrl },
          large_icon: iconUrl,
        })
      });

      const responseData = await response.json().catch(() => ({}));

      // --- 🚨 DETECT AND CLEANUP DEAD IDS 🚨 ---
      const invalidIds: string[] = Array.isArray(responseData.invalid_player_ids)
        ? responseData.invalid_player_ids
        : [];
      invalidIds.forEach(id => failed.add(id));
      if (invalidIds.length) {
         // Don't await this, let it run in background to keep the response fast.
         cleanupInvalidOneSignalIds(invalidIds).catch(e => console.error(e));
      }
      // ----------------------------------------

      if (!response.ok) {
        console.error('[Notification Service] OneSignal API Error:', responseData);
        idChunk.forEach(id => failed.add(id));
      }
    } catch (error) {
      console.error('[Notification Service] OneSignal Fetch Error:', error);
      idChunk.forEach(id => failed.add(id));
    }
  }));

  return failed;
}

async function sendOneSignalBatch(playerIds: string[], payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
  if (!playerIds.length) return { sent: 0, failed: 0 };
  const failed = await sendOneSignalBatchDetailed(playerIds, payload);
  return { sent: playerIds.length - failed.size, failed: failed.size };
}

// ==========================================
// 3. EXPORTED FUNCTIONS
// ==========================================

/** Runs both channels in parallel and folds their counts into one result. */
async function deliver(fcmTokens: string[], oneSignalIds: string[], payload: NotificationPayload): Promise<NotificationResult> {
  const [fcm, oneSignal] = await Promise.all([
    sendFcmBatch(fcmTokens, payload),
    sendOneSignalBatch(oneSignalIds, payload),
  ]);
  return { fcm, oneSignal, recipients: fcmTokens.length + oneSignalIds.length };
}

export async function sendNotificationToStudent(studentId: string, payload: NotificationPayload): Promise<NotificationResult> {
  const student = await getStudentByCustomId(studentId);

  if (!student) {
      console.warn(`[Notification Service] Student ${studentId} not found.`);
      return emptyResult();
  }

  return deliver(student.fcmTokens || [], student.oneSignalPlayerIds || [], payload);
}

export async function sendNotificationToAllAdmins(payload: NotificationPayload): Promise<NotificationResult> {
  const db = getDb();
  const adminsSnapshot = await db.collection('admins').get();

  if (adminsSnapshot.empty) return emptyResult();

  const allFcmTokens: string[] = [];
  const allOneSignalIds: string[] = [];

  adminsSnapshot.docs.forEach(doc => {
    const admin = doc.data() as Admin;
    if (admin.fcmTokens) allFcmTokens.push(...admin.fcmTokens);
    if (admin.oneSignalPlayerIds) allOneSignalIds.push(...admin.oneSignalPlayerIds);
  });

  return deliver(allFcmTokens, allOneSignalIds, payload);
}

export async function sendNotificationToAllStudents(payload: NotificationPayload): Promise<NotificationResult> {
  const allStudents = await getAllStudents();
  const activeStudents = allStudents.filter(s => s.activityStatus === 'Active');

  if (activeStudents.length === 0) {
    console.warn('[Notification Service] No active students found.');
    return emptyResult();
  }

  const allFcmTokens = activeStudents.flatMap(s => s.fcmTokens || []);
  const allOneSignalIds = activeStudents.flatMap(s => s.oneSignalPlayerIds || []);

  return deliver(allFcmTokens, allOneSignalIds, payload);
}

/**
 * Like sendNotificationToAllStudents, but delivers per-member so we can report
 * exactly who was reached. The push fan-out happens here (one server request);
 * the caller still creates a single shared "general" alert document.
 */
export async function sendNotificationToAllStudentsDetailed(payload: NotificationPayload): Promise<{ aggregate: NotificationResult; perMember: MemberDelivery[] }> {
  const allStudents = await getAllStudents();
  const activeStudents = allStudents.filter(s => s.activityStatus === 'Active');

  if (activeStudents.length === 0) {
    console.warn('[Notification Service] No active students found.');
    return { aggregate: emptyResult(), perMember: [] };
  }

  // Flatten every token/id while remembering which member owns it, so we can
  // send in single batched requests and still attribute results per member.
  const fcmEntries: { token: string; studentId: string }[] = [];
  const osEntries: { id: string; studentId: string }[] = [];
  for (const s of activeStudents) {
    (s.fcmTokens || []).forEach(token => fcmEntries.push({ token, studentId: s.studentId }));
    (s.oneSignalPlayerIds || []).forEach(id => osEntries.push({ id, studentId: s.studentId }));
  }

  const [fcmOutcomes, osFailed] = await Promise.all([
    sendFcmBatchDetailed(fcmEntries.map(e => e.token), payload),
    sendOneSignalBatchDetailed(osEntries.map(e => e.id), payload),
  ]);

  // Seed every active member so those with no devices still appear.
  const byStudent = new Map<string, NotificationResult>();
  for (const s of activeStudents) byStudent.set(s.studentId, emptyResult());

  fcmEntries.forEach((e, i) => {
    const r = byStudent.get(e.studentId)!;
    r.recipients++;
    if (fcmOutcomes[i]) r.fcm.sent++; else r.fcm.failed++;
  });
  osEntries.forEach((e) => {
    const r = byStudent.get(e.studentId)!;
    r.recipients++;
    if (osFailed.has(e.id)) r.oneSignal.failed++; else r.oneSignal.sent++;
  });

  const perMember: MemberDelivery[] = activeStudents.map(s => ({
    studentId: s.studentId,
    name: s.name,
    result: byStudent.get(s.studentId)!,
  }));
  const aggregate = perMember.reduce((acc, m) => mergeResults(acc, m.result), emptyResult());
  return { aggregate, perMember };
}

export async function triggerAlertNotification(alert: AlertItem): Promise<AlertDispatchResult> {
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
      return await sendNotificationToStudent(alert.studentId, payload);
    }
    // General broadcast: fan out per-member so the summary can show who was reached.
    const { aggregate, perMember } = await sendNotificationToAllStudentsDetailed(payload);
    return { ...aggregate, perMember };
  } catch (error) {
    console.error(`[Notification Service] Failed to trigger alert ${alert.id}:`, error);
    return emptyResult();
  }
}

export async function triggerAdminFeedbackNotification(studentName: string, feedbackType: string): Promise<NotificationResult> {
    const payload: NotificationPayload = {
        title: 'New Feedback Submitted',
        body: `${studentName} has submitted a new piece of feedback (${feedbackType}).`,
        icon: DEFAULT_ICON,
        click_action: '/admin/feedback',
    };

    try {
        return await sendNotificationToAllAdmins(payload);
    } catch (error) {
        console.error(`[Notification Service] Failed to notify admins:`, error);
        return emptyResult();
    }
}

export async function triggerAdminPaymentVerificationNotification(
  studentName: string,
  studentId: string,
  amount: number,
  txnId?: string
): Promise<NotificationResult> {
  const body = txnId
    ? `${studentName} (${studentId}) paid Rs.${amount} via UPI. Txn: ${txnId}. Please verify and update their account.`
    : `${studentName} (${studentId}) has made a UPI payment of Rs.${amount}. Please verify and update their account.`;

  const payload: NotificationPayload = {
    title: 'Payment Pending Verification',
    body,
    icon: DEFAULT_ICON,
    click_action: `/admin/students/edit/${studentId}`,
  };

  try {
    return await sendNotificationToAllAdmins(payload);
  } catch (error) {
    console.error('[Notification Service] Failed to notify admins of payment:', error);
    return emptyResult();
  }
}