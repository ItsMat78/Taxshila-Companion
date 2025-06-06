
// Firebase V9 Service Worker
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// IMPORTANT: REPLACE THESE WITH YOUR ACTUAL FIREBASE CONFIG VALUES
// These values should be directly embedded here.
// The service worker CANNOT access process.env or any dynamic environment variables.
const firebaseConfig = {
  apiKey: "%NEXT_PUBLIC_FIREBASE_API_KEY%",
  authDomain: "%NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN%",
  projectId: "%NEXT_PUBLIC_FIREBASE_PROJECT_ID%",
  storageBucket: "%NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET%",
  messagingSenderId: "%NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID%",
  appId: "%NEXT_PUBLIC_FIREBASE_APP_ID%",
};

// Initialize the Firebase app in the service worker
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error('Service Worker: Firebase app initialization error', e);
}

let messaging;
if (app) {
  try {
    messaging = getMessaging(app);
    console.log('Service Worker: Firebase Messaging initialized.');
  } catch (e) {
    console.error('Service Worker: Firebase Messaging initialization error', e);
  }
} else {
  console.error('Service Worker: Firebase app not initialized, messaging cannot be set up.');
}

if (messaging) {
  onBackgroundMessage(messaging, (payload) => {
    console.log('[sw.js] Received background message: ', payload);

    // --- Customize notification here ---
    // The server should send a 'data' payload with 'title', 'body', and optionally 'icon' and 'url'.
    // The 'notification' payload from FCM is often handled differently by browsers or might be ignored
    // if the app is in the background on some platforms, so relying on 'data' is more robust.

    const notificationData = payload.data || {}; // Use data payload
    const notificationTitle = notificationData.title || 'New Notification';
    const notificationOptions = {
      body: notificationData.body || 'You have a new update.',
      icon: notificationData.icon || '/logo.png', // Default icon
      image: notificationData.image, // Optional image
      badge: notificationData.badge || '/badge-icon.png', // Optional: monochrome icon for status bar
      vibrate: notificationData.vibrate || [200, 100, 200], // Optional vibration pattern
      data: { // Pass along data for click handling
        url: notificationData.url || '/', // URL to open on click, defaults to root
        // ...any other data you want to associate with the notification
      },
      // tag: notificationData.tag, // Optional: for replacing existing notifications
      // renotify: notificationData.renotify === 'true', // Optional
      // requireInteraction: notificationData.requireInteraction === 'true', // Optional
      // actions: payload.data.actions ? JSON.parse(payload.data.actions) : [] // Optional: for notification actions
    };

    // Fallback to payload.notification if payload.data is not structured as expected
    if (!payload.data && payload.notification) {
      console.log('[sw.js] Using payload.notification as fallback for title/body.');
      notificationOptions.body = payload.notification.body || notificationOptions.body;
      if (payload.notification.title) {
        // Overwrite title only if present in payload.notification
         (notificationOptions as any).title = payload.notification.title;
      }
      if (payload.notification.icon) {
        notificationOptions.icon = payload.notification.icon;
      }
      if (payload.notification.image) {
        notificationOptions.image = payload.notification.image;
      }
      if (payload.notification.click_action) {
        notificationOptions.data.url = payload.notification.click_action;
      }
    }


    self.registration.showNotification(notificationTitle, notificationOptions)
      .catch(err => console.error("Error showing notification: ", err));
  });
} else {
  console.log('Service Worker: Firebase Messaging not available, onBackgroundMessage not set.');
}

self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.', event.notification);
  event.notification.close(); // Close the notification

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/'; // Default to opening the root of your app

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Use a more flexible URL check if needed, e.g., client.url.endsWith(urlToOpen.pathname)
        if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('[sw.js] Service Worker installing.');
  // Perform install steps, like caching assets (optional)
  // event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', (event) => {
  console.log('[sw.js] Service Worker activating.');
  // Perform activate steps, like cleaning up old caches (optional)
  // event.waitUntil(clients.claim()); // Take control of open pages immediately
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[sw.js] Push subscription changed.');
  // Here you might want to re-subscribe or send the new subscription to your server
  // For example:
  // event.waitUntil(
  //   self.registration.pushManager.subscribe(event.oldSubscription.options)
  //   .then(subscription => {
  //     // Send new subscription to your server
  //     console.log('New subscription: ', subscription);
  //     // return fetch('/update-subscription', { method: 'POST', ... });
  //   })
  // );
});
