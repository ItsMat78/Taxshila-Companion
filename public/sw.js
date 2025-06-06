// public/sw.js

// Shim for 'process' if it's causing issues with Firebase SDK in SW context
if (typeof self.process === 'undefined') {
  self.process = { env: {} };
}

importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// ==========================================================================================
// !!! CRITICAL: ENSURE THIS CONFIG MATCHES YOUR ACTUAL FIREBASE PROJECT'S CONFIG !!!
// ==========================================================================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // <<< --- REPLACE THIS!
  authDomain: "YOUR_AUTH_DOMAIN", // <<< --- REPLACE THIS!
  projectId: "YOUR_PROJECT_ID", // <<< --- REPLACE THIS!
  storageBucket: "YOUR_STORAGE_BUCKET", // <<< --- REPLACE THIS!
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // <<< --- REPLACE THIS!
  appId: "YOUR_APP_ID", // <<< --- REPLACE THIS!
  measurementId: "YOUR_MEASUREMENT_ID" // Optional
};
// ==========================================================================================

if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_")) {
  try {
    firebase.initializeApp(firebaseConfig);

    if (firebase.messaging.isSupported()) {
      const messaging = firebase.messaging();
      console.log('[Service Worker] Firebase Messaging initialized successfully.');

      messaging.onBackgroundMessage((payload) => {
        console.log('[Service Worker] Received background message ', payload);

        if (!payload.data || !payload.data.title) {
          console.log('[Service Worker] Background message missing title, not showing notification.');
          return;
        }

        const notificationTitle = payload.data.title;
        const notificationOptions = {
          body: payload.data.body || 'New message',
          icon: payload.data.icon || '/logo.png', // Default icon
          data: {
              url: payload.data.url || '/', // URL to open on click
              ...(payload.data || {}) // Pass along other data
          }
        };
        
        console.log('[Service Worker] Showing notification:', notificationTitle, notificationOptions);
        self.registration.showNotification(notificationTitle, notificationOptions)
          .catch(err => console.error('[Service Worker] Error showing notification:', err));
      });
    } else {
      console.log('[Service Worker] Firebase Messaging is not supported in this browser (within sw.js).');
    }
  } catch (e) {
    console.error('[Service Worker] Error initializing Firebase app in service worker:', e);
  }
} else {
  console.error('[Service Worker] Firebase config is not set or still contains placeholders in sw.js. Push notifications WILL NOT WORK.');
}

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open at the target URL.
      for (const client of clientList) {
        // If we find an existing client and it can be focused, focus it.
        if (new URL(client.url).pathname === new URL(targetUrl, self.location.origin).pathname && 'focus' in client) {
          return client.focus();
        }
      }
      // If no existing client was found or focused, open a new window.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }).catch(err => console.error('[Service Worker] Error handling notification click:', err))
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Service Worker] Push subscription changed (e.g., token refresh):', event);
  // Here you would typically re-subscribe and send the new subscription (token) to your server.
  // This event is important for keeping FCM tokens up-to-date.
  // The main app (`firebase-messaging-client.ts`) also tries to get and save the token on load,
  // which often covers this, but handling `pushsubscriptionchange` is best practice.
});

// Add a basic install event listener to ensure the SW activates
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event fired.');
  // event.waitUntil(self.skipWaiting()); // Optional: forces the waiting service worker to become the active service worker
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event fired.');
  // event.waitUntil(self.clients.claim()); // Optional: allows an active service worker to take control of the page immediately
});
