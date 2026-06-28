"use client";

import { saveOneSignalPlayerId, removeOneSignalPlayerId } from '@/services/student-service';

type Role = 'admin' | 'member';

interface MedianOneSignalSubscription {
  id?: string;
  token?: string;
  /** Authoritative push opt-in flag in OneSignal v5. */
  optedIn?: boolean;
}

interface MedianOneSignalInfo {
  subscription?: MedianOneSignalSubscription;
  oneSignalId?: string;
  oneSignalUserId?: string;
}

interface MedianBridge {
  onesignal?: {
    info?: () => Promise<MedianOneSignalInfo>;
    /** Triggers the native push-permission prompt + OneSignal registration. */
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

/** Reads the device's OneSignal info from the Median bridge, or null. */
async function readOneSignalInfo(): Promise<MedianOneSignalInfo | null> {
  const info = getMedian()?.onesignal?.info;
  if (!info) return null;
  try {
    return await info();
  } catch (err) {
    console.error('[OneSignal] info() failed:', err);
    return null;
  }
}

/** The id used to target this device for push (subscription id, then fallbacks). */
function subscriptionIdFrom(data: MedianOneSignalInfo | null): string | null {
  return data?.subscription?.id || data?.oneSignalId || data?.oneSignalUserId || null;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * Whether this device is opted in to OneSignal push. Retries briefly because the
 * bridge can report nothing for a moment right after launch. 'unavailable' means
 * we're not in the Median app (or the bridge never answered).
 */
export async function getOneSignalState(): Promise<'on' | 'off' | 'unavailable'> {
  if (!getMedian()?.onesignal?.info) return 'unavailable';
  for (let attempt = 0; attempt < 3; attempt++) {
    const data = await readOneSignalInfo();
    if (data) {
      if (data.subscription?.optedIn === true) return 'on';
      if (data.subscription?.optedIn === false) return 'off';
      // Older bridges don't report optedIn — fall back to id presence.
      if (subscriptionIdFrom(data)) return 'on';
    }
    if (attempt < 2) await sleep(800);
  }
  return 'off';
}

/**
 * Explicit opt-in for OneSignal native push (the "turn on notifications" gesture
 * inside the Median app). Triggers the native permission prompt via the bridge,
 * then polls for the resulting subscription id and persists it so the backend can
 * target this device. Returns true once an opted-in id is captured.
 */
export async function promptOneSignalRegistration(firestoreId: string, role: Role): Promise<boolean> {
  const median = getMedian();
  if (!median?.onesignal) return false;

  try {
    median.onesignal.register?.();
  } catch (err) {
    console.error('[OneSignal] register() failed:', err);
  }

  const storageKey = `oneSignalPlayerId_${firestoreId}`;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const data = await readOneSignalInfo();
    if (data?.subscription?.optedIn === false) return false; // user declined the prompt
    const id = subscriptionIdFrom(data);
    if (id) {
      if (localStorage.getItem(storageKey) !== id) {
        await saveOneSignalPlayerId(firestoreId, role, id);
        localStorage.setItem(storageKey, id);
      }
      return true;
    }
    await sleep(1200);
  }
  return false;
}

/**
 * Stops this device from receiving OneSignal pushes by removing its subscription
 * id from the user's record (the backend only targets ids it knows about). The
 * device stays registered with OneSignal, but we no longer target it.
 */
export async function disableOneSignal(firestoreId: string, role: Role): Promise<void> {
  const storageKey = `oneSignalPlayerId_${firestoreId}`;
  let id = localStorage.getItem(storageKey);
  if (!id) id = subscriptionIdFrom(await readOneSignalInfo());
  if (id) {
    try {
      await removeOneSignalPlayerId(firestoreId, role, id);
    } catch (err) {
      console.error('[OneSignal] failed to remove player id:', err);
    }
  }
  localStorage.removeItem(storageKey);
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
