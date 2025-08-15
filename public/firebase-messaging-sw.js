// public/firebase-messaging-sw.js

// IMPORTANT: This service worker file CANNOT use ES modules (`import`).
// It must use `importScripts` to load the Firebase SDKs.

try {
  // Load the Firebase app and messaging libraries
  importScripts(
    'https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js'
  );

  // --- Configuration ---
  // The Firebase config object is passed in as a URL-encoded query string.
  // This allows the service worker to be a static file while still getting dynamic configuration.
  const urlParams = new URLSearchParams(location.search);
  const firebaseConfigString = urlParams.get('firebaseConfig');
  
  if (!firebaseConfigString) {
    throw new Error("Firebase config not found in service worker query parameters. Notifications will not work.");
  }

  const firebaseConfig = JSON.parse(decodeURIComponent(firebaseConfigString));

  // --- Initialization ---
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  const messaging = firebase.messaging();

  // --- Background Message Handler ---
  // This handles notifications when the app is in the background or closed.
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);

    // The payload.data contains the custom data sent from the server.
    const notificationTitle = payload.data?.title || "New Notification";
    const notificationOptions = {
      body: payload.data?.body || "You have a new message.",
      icon: payload.data?.icon || '/logo.png',
      // The 'data' field is for passing info to the 'notificationclick' event
      data: {
        url: payload.data?.url || '/', // Default to home page if no URL is provided
      },
    };

    // Show the notification to the user.
    self.registration.showNotification(notificationTitle, notificationOptions);
  });

  // --- Notification Click Handler ---
  // This handles what happens when a user clicks on the notification.
  self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received.', event);

    // Close the notification
    event.notification.close();

    // Get the URL from the notification's data payload
    const urlToOpen = event.notification.data.url;

    // This looks for an existing window and focuses it, or opens a new one.
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      }).then((clientList) => {
        // If a window for this app is already open, focus it.
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window.
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  });

  console.log('Firebase Messaging Service Worker setup complete.');

} catch (error) {
  console.error("Error in Firebase Messaging Service Worker: ", error);
}
