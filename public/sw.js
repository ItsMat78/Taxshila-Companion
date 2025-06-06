
// Import and configure the Firebase SDK
// This import is needed in the service worker file to initialize the Firebase app and messaging.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// IMPORTANT: Replace with your project's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  if (!payload.notification) {
    console.log("No notification payload in background message.");
    return;
  }

  const notificationTitle = payload.notification.title || 'New Message';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new message.',
    icon: payload.notification.icon || '/logo.png', // Default icon
    data: payload.data // Pass along any data for click handling
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.', event.notification);

  event.notification.close();

  const targetUrl = event.notification.data && event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.notification && event.notification.data.FCM_MSG.notification.click_action
    ? event.notification.data.FCM_MSG.notification.click_action
    : '/';


  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Check if the client is already open and focused
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  console.log('[sw.js] Service worker installing...');
  // Perform install steps if any, like caching static assets
  // For now, just log.
});

self.addEventListener('activate', (event) => {
  console.log('[sw.js] Service worker activating...');
  // Perform activate steps if any, like cleaning up old caches
  // For now, just log.
  // Ensure clients take control immediately.
  event.waitUntil(clients.claim());
});
