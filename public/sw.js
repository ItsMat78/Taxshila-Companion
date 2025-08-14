
// This service worker file is intentionally left with minimal content.
// It is required for the browser to register a service worker for push notifications.
// The actual Firebase messaging logic is handled by the Firebase SDK,
// which will use this file as its entry point.

// IMPORTANT: Do NOT add any custom logic here unless you are familiar with
// service worker lifecycles, as it can easily break push notifications.

// If you need to debug, you can add simple console logs:
// console.log("Service Worker loading...");

self.addEventListener('install', (event) => {
  // console.log('Service Worker installing.');
  // Optionally, use skipWaiting to activate the new service worker immediately.
  // self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // console.log('Service Worker activating.');
});

self.addEventListener('push', (event) => {
  // console.log('Push event received:', event);
  // Firebase SDK handles the notification display.
  // You would only add custom logic here for very advanced use cases.
});
