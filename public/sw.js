
// Import the Firebase JS SDK
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// ** CRITICAL SETUP STEP **
// Replace the following firebaseConfig with your project's actual Firebase configuration.
// These values can be found in your Firebase project settings.
// IMPORTANT: Service workers run in a different context and cannot access 'process.env'
// or environment variables in the same way your Next.js app does.
// You MUST hardcode these values here or use a build-step replacement strategy.

const firebaseConfig = {
  apiKey: "YOUR_NEXT_PUBLIC_FIREBASE_API_KEY", // Replace with your actual API key
  authDomain: "YOUR_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", // Replace
  projectId: "YOUR_NEXT_PUBLIC_FIREBASE_PROJECT_ID", // Replace
  storageBucket: "YOUR_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", // Replace
  messagingSenderId: "YOUR_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", // Replace
  appId: "YOUR_NEXT_PUBLIC_FIREBASE_APP_ID", // Replace
  // measurementId: "YOUR_NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID" // Optional
};

// Initialize the Firebase app in the service worker
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

console.log('[sw.js] Firebase app initialized in Service Worker.');

onBackgroundMessage(messaging, (payload) => {
  console.log('[sw.js] Received background message: ', payload);

  const notificationTitle = payload.notification?.title || 'Taxshila Companion';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification.',
    icon: payload.notification?.icon || '/logo.png', // Default icon
    badge: '/logo-badge.png', // Optional: for Android notification tray
    image: payload.notification?.image, // Optional
    data: payload.data, // Pass along any data for notification click handling
  };

  self.registration.showNotification(notificationTitle, notificationOptions)
    .then(() => console.log('[sw.js] Notification shown.'))
    .catch(err => console.error('[sw.js] Error showing notification:', err));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.', event.notification);
  event.notification.close();

  // This looks to see if the current page is already open and focuses it.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's already a tab open with the target URL
      const targetUrl = event.notification.data?.url || '/'; // Default to home or use URL from data
      
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If no tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('[sw.js] Service worker installing...');
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

self.addEventListener('activate', (event) => {
  console.log('[sw.js] Service worker activating...');
  // Perform any activation steps, like cleaning up old caches
  event.waitUntil(clients.claim()); // Become available to all pages
});
