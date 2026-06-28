"use client";

import { setupPushNotifications, removePushNotifications } from './notification-setup';
import { isMedianApp, promptOneSignalRegistration, disableOneSignal, getOneSignalState } from './onesignal-median';

type Role = 'admin' | 'member';

export type PushState = 'on' | 'off' | 'blocked' | 'unsupported';
export type EnablePushResult = 'enabled' | 'blocked' | 'dismissed' | 'failed';

/**
 * Turns on push for this device on the correct channel:
 *  - Inside the Median app  → OneSignal native push (triggers the OS prompt).
 *  - In a browser / PWA     → Firebase Cloud Messaging web push.
 */
export async function enablePush(firestoreId: string, role: Role): Promise<EnablePushResult> {
  if (isMedianApp()) {
    return (await promptOneSignalRegistration(firestoreId, role)) ? 'enabled' : 'failed';
  }

  await setupPushNotifications(firestoreId, role);
  if (typeof window === 'undefined' || !('Notification' in window)) return 'failed';
  if (Notification.permission === 'granted') return 'enabled';
  if (Notification.permission === 'denied') return 'blocked';
  return 'dismissed';
}

/** Turns push off for this device on whichever channel it uses. */
export async function disablePush(firestoreId: string, role: Role): Promise<void> {
  if (isMedianApp()) {
    await disableOneSignal(firestoreId, role);
    return;
  }
  await removePushNotifications(firestoreId, role);
}

/** Current push state for this device, channel-aware. */
export async function getPushState(firestoreId: string): Promise<PushState> {
  if (isMedianApp()) {
    // 'unavailable' (bridge not ready) is treated as off so the prompt can show.
    return (await getOneSignalState()) === 'on' ? 'on' : 'off';
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const hasToken = !!localStorage.getItem(`fcmToken_${firestoreId}`);
  return Notification.permission === 'granted' && hasToken ? 'on' : 'off';
}
