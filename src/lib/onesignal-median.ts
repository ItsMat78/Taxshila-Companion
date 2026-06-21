"use client";

import { saveOneSignalPlayerId } from '@/services/student-service';

type Role = 'admin' | 'member';

interface MedianOneSignalInfo {
  subscription?: { id?: string };
  oneSignalId?: string;
  oneSignalUserId?: string;
}

interface MedianBridge {
  onesignal?: {
    info?: () => Promise<MedianOneSignalInfo>;
    register?: () => void;
  };
}

function getMedian(): MedianBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { median?: MedianBridge }).median;
}

/** True when running inside the Median native wrapper (where OneSignal lives). */
export function isMedianApp(): boolean {
  return !!getMedian();
}

/**
 * Harvests this device's OneSignal subscription id from the Median native
 * wrapper and persists it for the user. Returns a cleanup function.
 *
 * Robustness: rather than giving up after a fixed 30s window (the old behaviour,
 * which permanently missed late registrations until a full app reload), this:
 *   1. attempts immediately,
 *   2. polls briefly for the common "registers a moment after launch" case, then
 *   3. re-attempts whenever the app regains focus / comes back online.
 * Step 3 is the key fix — a permission granted minutes later, or a registration
 * that completes after the poll window, is still captured the next time the user
 * returns to the app, with no reload required.
 *
 * Outside the Median app this is a no-op (web users use FCM instead).
 */
export function registerOneSignalPlayerId(firestoreId: string, role: Role): () => void {
  const median = getMedian();
  if (!median?.onesignal?.info) return () => {};

  const storageKey = `oneSignalPlayerId_${firestoreId}`;
  let done = false;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  function onFocus() { void attempt(); }
  function onVisible() { if (document.visibilityState === 'visible') void attempt(); }

  const stopPolling = () => {
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
  };

  const cleanup = () => {
    stopPolling();
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('online', onFocus);
    document.removeEventListener('visibilitychange', onVisible);
  };

  async function attempt(): Promise<void> {
    if (done) return;
    const info = median?.onesignal?.info;
    if (!info) return;
    try {
      const data = await info();
      const targetId = data?.subscription?.id || data?.oneSignalId || data?.oneSignalUserId;
      if (!targetId) return; // Not registered yet — try again later.

      done = true;
      if (localStorage.getItem(storageKey) !== targetId) {
        await saveOneSignalPlayerId(firestoreId, role, targetId);
        localStorage.setItem(storageKey, targetId);
      }
      cleanup(); // Got it — stop polling and detach listeners.
    } catch (err) {
      console.error('[OneSignal] Error reading median.onesignal.info():', err);
    }
  }

  // 1. Try immediately.
  void attempt();

  // 2. Poll briefly for the common case.
  const POLL_INTERVAL = 2000;
  const POLL_DURATION = 60000;
  let elapsed = 0;
  intervalId = setInterval(() => {
    elapsed += POLL_INTERVAL;
    void attempt();
    if (done || elapsed >= POLL_DURATION) stopPolling();
  }, POLL_INTERVAL);

  // 3. Re-attempt on focus / reconnect — survives the poll window closing.
  window.addEventListener('focus', onFocus);
  window.addEventListener('online', onFocus);
  document.addEventListener('visibilitychange', onVisible);

  return cleanup;
}
