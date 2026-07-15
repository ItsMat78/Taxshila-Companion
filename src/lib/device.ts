"use client";

export type InstallPlatform = 'android' | 'ios' | 'desktop';

/** Detects the platform for app-install routing (Play Store vs. PWA vs. desktop). */
export function getInstallPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent || '';

  if (/android/i.test(ua)) return 'android';

  // iPadOS 13+ reports as "Macintosh" but exposes multi-touch, unlike real Macs.
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(ua) || isIPadOS) return 'ios';

  return 'desktop';
}

/** True when the app is already running installed (standalone), not in a browser tab. */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}
