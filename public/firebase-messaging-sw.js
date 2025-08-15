
// This file must be in the public folder.

importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");

self.addEventListener('fetch', () => {
  // This is a placeholder to ensure the service worker is considered active.
});

// Parse query parameters from the service worker URL
const urlParams = new URL(self.location).searchParams;
const firebaseConfig = Object.fromEntries(urlParams.entries());

// Initialize the Firebase app in the service worker with the parsed config
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message.',
      icon: payload.notification?.icon || '/logo.png',
      data: {
        url: payload.data?.url || '/' // Default to root if no URL is provided
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
    console.error("Firebase config not found in service worker query parameters.");
}


self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if a window is already open and focus it.
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

