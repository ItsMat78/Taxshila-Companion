
// Service Worker for Firebase Cloud Messaging (FCM)

// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here, other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// =====================================================================================
// !!! IMPORTANT: INITIALIZE FIREBASE IN THE SERVICE WORKER
// You MUST replace the following config object with your Firebase project's
// configuration. You can find this in your Firebase project settings.
// =====================================================================================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('[Service Worker] Firebase initialized.');
  } else {
    firebase.app(); // if already initialized, use that one
    console.log('[Service Worker] Firebase app already initialized.');
  }
} catch (e) {
  console.error('[Service Worker] Error initializing Firebase:', e);
}


let messaging = null;
if (firebase.messaging.isSupported()) {
    try {
        messaging = firebase.messaging();
        console.log('[Service Worker] Firebase Messaging initialized in SW.');
    } catch (e) {
        console.error('[Service Worker] Error initializing Firebase Messaging in SW:', e);
    }
} else {
    console.log('[Service Worker] Firebase Messaging is not supported in this browser (in SW).');
}


// If you want to customize the background notification handling:
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[Service Worker] Received background message ', payload);

    // Customize notification here
    // The payload.data will contain the data sent from your server.
    const notificationTitle = payload.data?.title || 'New Notification';
    const notificationOptions = {
      body: payload.data?.body || 'You have a new update.',
      icon: payload.data?.icon || '/logo.png', // Ensure this icon path is correct from public root
      data: {
        url: payload.data?.url || '/', // URL to open on click
        // Add any other data you want to pass to the click handler
      },
    };

    // Check if service worker has permission to show notifications
    if (self.registration.scope && Notification.permission === 'granted') {
        self.registration.showNotification(notificationTitle, notificationOptions)
          .then(() => console.log('[Service Worker] Notification shown.'))
          .catch(err => console.error('[Service Worker] Error showing notification:', err));
    } else {
        console.warn('[Service Worker] Notification permission not granted or scope unavailable.');
    }
  });
}

// Optional: Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.', event.notification.data);
  event.notification.close(); // Close the notification

  const urlToOpen = event.notification.data?.url || '/';

  // This looks to see if the current is already open and focuses it.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Check if the client URL matches or is a base of the notification URL
        if (client.url === urlToOpen || (client.url.startsWith(self.location.origin) && urlToOpen.startsWith('/'))) {
          try {
            return client.focus();
          } catch (focusError) {
            console.warn('[Service Worker] Could not focus existing client:', focusError);
            // Fallback to opening a new window if focus fails
            return clients.openWindow(urlToOpen);
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }).catch(err => {
        console.error('[Service Worker] Error handling notification click:', err);
        if (clients.openWindow) {
            return clients.openWindow(urlToOpen); // Fallback if matchAll fails
        }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Service Worker] Push subscription changed.');
  // Here you might want to re-subscribe or re-send the new subscription to your server.
  // For this app, token refresh is handled by the client-side `firebase-messaging-client.ts` when the app is active.
});
