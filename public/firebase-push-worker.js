
// public/firebase-push-worker.js

// Import and configure the Firebase SDK
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'; // Use the /sw import

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize the Firebase app in the service worker
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// This command is crucial to ensure the new service worker activates
// immediately and can start handling push events without a page refresh.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(self.clients.claim());
});

// onBackgroundMessage is the correct handler for when the app is not in focus.
onBackgroundMessage(messaging, (payload) => {
  console.log('[Service Worker] Received background message: ', payload);

  if (payload.notification) {
    const notificationTitle = payload.notification.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification.body || 'You have a new message.',
      icon: payload.notification.icon || '/logo.png',
      // The 'data' property allows us to attach a URL to open when the notification is clicked
      data: {
        url: payload.fcmOptions?.link || payload.webpush?.fcmOptions?.link || '/',
      }
    };
    
    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});

// This listener handles the click event on the notification
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.', event.notification);
  event.notification.close();

  // This opens the URL we defined in the 'data' property of the notification
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // If a window for the app is already open, focus it. Otherwise, open a new one.
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
