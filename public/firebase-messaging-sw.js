// public/firebase-messaging-sw.js

// This file must be in the public folder.

// The service worker needs to import the Firebase app and messaging libraries.
// It uses `importScripts` because it runs in a different context than the main application.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// We hold the fetch promise for the config so we don't fetch it multiple times.
const firebaseConfigPromise = fetch('/api/firebase-config')
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch Firebase config');
    }
    return response.json();
  })
  .then(config => {
    if (!config || !config.apiKey) {
      throw new Error('Fetched Firebase config is invalid');
    }
    console.log('Service Worker: Successfully fetched Firebase config.');
    return config;
  })
  .catch(error => {
    console.error('Service Worker: Error fetching or parsing Firebase config:', error);
    return null; // Return null on failure
  });

// Initialize the Firebase app with the fetched config
const appPromise = firebaseConfigPromise.then(firebaseConfig => {
  if (firebaseConfig && firebase.apps.length === 0) {
    console.log('Service Worker: Initializing Firebase App...');
    return firebase.initializeApp(firebaseConfig);
  } else if (firebase.apps.length > 0) {
    console.log('Service Worker: Firebase App already initialized.');
    return firebase.app();
  }
  return null; // Return null if config failed to load
});


// This is the correct event listener for incoming push notifications.
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');

  // The event.data can be JSON, text, etc. We expect JSON from FCM.
  let notificationData = {};
  try {
    notificationData = event.data.json();
  } catch (e) {
    console.error('[Service Worker] Failed to parse push data as JSON.', e);
    // Create a fallback notification if data is not as expected
    notificationData = {
      notification: {
        title: 'New Notification',
        body: 'You have a new message.',
        icon: '/logo.png'
      }
    };
  }

  const { title, body, icon, click_action } = notificationData.notification || {};
  
  const notificationTitle = title || 'Taxshila Companion';
  const notificationOptions = {
    body: body || 'You have a new message.',
    icon: icon || '/logo.png',
    data: {
      url: click_action || '/' // Pass the URL to the click event
    }
  };

  // We must wrap the showNotification call in event.waitUntil to ensure
  // the service worker stays active until the notification is displayed.
  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// This handles what happens when a user clicks the notification.
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');

  // Close the notification
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  // This looks at all open tabs/windows and focuses one if it's already open.
  // Otherwise, it opens a new tab.
  event.waitUntil(
    clients.matchAll({
      type: "window"
    }).then(function(clientList) {
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
