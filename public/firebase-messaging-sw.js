// DO NOT USE import/export
// This file is a service worker and runs in a different context.

// Import the Firebase app and messaging libraries using the UMD build
self.importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
self.importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// --- Get Firebase Config from URL ---
// The service worker is loaded with a URL like:
// /firebase-messaging-sw.js?firebaseConfig=...
// This code extracts that config object.
const urlParams = new URL(location).searchParams;
const firebaseConfigParam = urlParams.get('firebaseConfig');

if (!firebaseConfigParam) {
  console.error("Firebase config not found in service worker. Notifications will not work.");
} else {
  try {
    const firebaseConfig = JSON.parse(decodeURIComponent(firebaseConfigParam));
    
    // Initialize the Firebase app in the service worker with the retrieved config
    firebase.initializeApp(firebaseConfig);

    // Get an instance of Firebase Messaging
    const messaging = firebase.messaging();
    console.log("Firebase Messaging service worker is initialized successfully.");

    // --- Standard 'push' event listener ---
    // This is the most reliable way to handle incoming notifications.
    self.addEventListener('push', (event) => {
      console.log('[Service Worker] Push Received.');
      
      // The data can be in different places depending on how it was sent.
      // We check both `event.data.json().notification` (standard) and `event.data.json().data` (FCM specific)
      const payload = event.data ? event.data.json() : {};
      
      const notificationData = payload.notification || payload.data;
      
      if (!notificationData) {
        console.warn('[Service Worker] Push event received, but no notification data found.');
        return;
      }

      const title = notificationData.title || 'New Notification';
      const options = {
        body: notificationData.body || '',
        icon: notificationData.icon || '/logo.png',
        data: {
          url: notificationData.url || '/' // URL to open on click
        }
      };

      // Use waitUntil to keep the service worker alive until the notification is shown
      event.waitUntil(self.registration.showNotification(title, options));
    });

    // --- Optional: Handle notification click ---
    self.addEventListener('notificationclick', (event) => {
      console.log('[Service Worker] Notification click Received.');

      event.notification.close();

      const urlToOpen = event.notification.data.url || '/';
      
      // This looks for an existing window and focuses it, or opens a new one
      event.waitUntil(
        clients.matchAll({
          type: "window"
        }).then((clientList) => {
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
      );
    });

  } catch (error) {
    console.error("Error initializing Firebase in service worker:", error);
  }
}
