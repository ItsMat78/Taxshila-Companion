
// Service Worker (sw.js)

// IMPORTANT: IMMEDIATELY REPLACE THIS firebaseConfig WITH YOUR ACTUAL FIREBASE PROJECT CONFIGURATION!
// This is separate from your main app's Firebase config. The service worker needs its own.
// You can find this in your Firebase project settings:
// Project settings > General > Your apps > Web app > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", // <-- REPLACE
  authDomain: "YOUR_AUTH_DOMAIN_HERE", // <-- REPLACE
  projectId: "YOUR_PROJECT_ID_HERE", // <-- REPLACE
  storageBucket: "YOUR_STORAGE_BUCKET_HERE", // <-- REPLACE
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE", // <-- REPLACE
  appId: "YOUR_APP_ID_HERE", // <-- REPLACE
  measurementId: "YOUR_MEASUREMENT_ID_HERE" // <-- Optional, but good to include if you have it
};
// END OF IMPORTANT CONFIGURATION SECTION


// Import Firebase SDKs using importScripts (for service workers not using ES modules directly)
// Using more recent compat versions
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
} catch (e) {
  console.error('sw.js: Failed to import Firebase scripts.', e);
  // If scripts fail to load, the service worker won't work correctly.
  // This error will appear in the service worker console.
}

let app;
let messaging;

try {
  if (firebase.apps.length === 0) {
    app = firebase.initializeApp(firebaseConfig);
    console.log("sw.js: Firebase app initialized successfully.");
  } else {
    app = firebase.app(); // Get default app if already initialized
    console.log("sw.js: Firebase app already initialized.");
  }
} catch (e) {
  console.error('sw.js: Error initializing Firebase app:', e);
  // This often happens if firebaseConfig is incorrect.
}

try {
  if (app && firebase.messaging) {
    messaging = firebase.messaging();
    console.log("sw.js: Firebase Messaging initialized successfully.");

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('[sw.js] Received background message ', payload);

      if (payload.notification) {
        const notificationTitle = payload.notification.title || 'New Message';
        const notificationOptions = {
          body: payload.notification.body || 'You have a new message.',
          icon: payload.notification.icon || '/logo.png', // Default icon
          data: payload.data // Attach custom data to the notification
        };

        self.registration.showNotification(notificationTitle, notificationOptions)
          .catch(err => console.error("sw.js: Error showing notification:", err));
      } else {
        console.log("sw.js: Background message received without a 'notification' payload. Cannot display system notification directly.");
        // If you send data-only messages, you'd handle them here and potentially create a notification manually.
      }
    });
  } else {
    console.warn('sw.js: Firebase app or firebase.messaging not available for messaging initialization.');
  }
} catch (e) {
  console.error('sw.js: Error initializing Firebase Messaging:', e);
}


// Optional: Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.', event.notification);
  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.targetUrl
    ? event.notification.data.FCM_MSG.data.targetUrl
    : '/'; // Default URL to open

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Check if the client is already open and focused on the target URL.
        // This logic might need refinement based on your app's routing.
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If no existing window is found or focused, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('sw.js: Service worker installed');
  // event.waitUntil(self.skipWaiting()); // Optional: activate new SW immediately
});

self.addEventListener('activate', (event) => {
  console.log('sw.js: Service worker activated');
  // event.waitUntil(self.clients.claim()); // Optional: take control of open pages immediately
});
