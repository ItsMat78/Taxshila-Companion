
// Import and configure the Firebase SDK
// This is the V9 modular SDK for service workers
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw"; // Correct import for SW

// Your web app's Firebase configuration
// IMPORTANT: Replace with your actual Firebase config values
const firebaseConfig = {
  apiKey: "%NEXT_PUBLIC_FIREBASE_API_KEY%",
  authDomain: "%NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN%",
  projectId: "%NEXT_PUBLIC_FIREBASE_PROJECT_ID%",
  storageBucket: "%NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET%",
  messagingSenderId: "%NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID%",
  appId: "%NEXT_PUBLIC_FIREBASE_APP_ID%",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

console.log("Firebase Messaging Service Worker registered and Firebase initialized.");

onBackgroundMessage(messaging, (payload) => {
  console.log('[sw.js] Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new update.",
    icon: payload.notification?.icon || '/logo.png', // Default icon
    image: payload.notification?.image,
    badge: '/badge-icon.png', // Optional: A small badge icon
    // --- Standard PWA Notification Options ---
    // actions: payload.data?.actions ? JSON.parse(payload.data.actions) : [], // e.g. [{ action: 'explore', title: 'Explore' }]
    // data: payload.data, // To pass data to notification click
    // dir: 'auto', // Text direction
    // lang: 'en-US', // Language
    // renotify: payload.data?.renotify === 'true', // Vibrate/sound again if already showing notification
    // requireInteraction: payload.data?.requireInteraction === 'true', // Keep notification until user dismisses/clicks
    // silent: payload.data?.silent === 'true', // No sound/vibration
    // sound: '/sounds/notification.mp3', // Custom sound
    // tag: payload.data?.tag, // Groups notifications
    // vibrate: [200, 100, 200], // Vibration pattern
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.', event.notification);
  event.notification.close();

  // This looks to see if the current is already open and focuses it.
  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's a window for this app open already.
        for (const client of clientList) {
          // Use a more specific URL if possible, or a base URL
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one.
        if (self.clients.openWindow) {
          // Default to opening the base URL if no specific path is provided in notification data
          const urlToOpen = event.notification.data?.url || '/';
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('[sw.js] Notification closed.', event.notification);
  // You can add analytics or other logic here if needed
});

// Standard service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[sw.js] Service worker installing...');
  // event.waitUntil(self.skipWaiting()); // Optional: forces the waiting service worker to become the active service worker
});

self.addEventListener('activate', (event) => {
  console.log('[sw.js] Service worker activating...');
  // event.waitUntil(self.clients.claim()); // Optional: allows an active service worker to take control of all clients within its scope
});

// Note: The placeholder values like "%NEXT_PUBLIC_FIREBASE_API_KEY%"
// are typically replaced during a build process if you're using a tool
// like `firebase-frameworks` or if you manually replace them.
// If these are not being replaced, you need to hardcode your actual Firebase config values here.
// For security, it's better if they are replaced by build environment variables.
// However, for client-side Firebase config, these values are generally considered public.
