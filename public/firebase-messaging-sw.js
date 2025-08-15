// public/firebase-messaging-sw.js
console.log('SW: Service Worker script evaluating.');

// Note: The 'firebase' and 'app' imports are not available in a service worker.
// We need to use importScripts to load the Firebase SDK.
try {
  importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');
  console.log('SW: Firebase scripts imported successfully.');
} catch (e) {
  console.error('SW: Error importing Firebase scripts.', e);
}


self.addEventListener('install', (event) => {
  console.log('SW: Install event triggered.');
  // Force the waiting service worker to become the active service worker.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activate event triggered.');
  // Take control of all clients as soon as the service worker is activated.
  event.waitUntil(self.clients.claim());
});


if (self.firebase && typeof self.firebase.initializeApp === 'function') {
  // Your web app's Firebase configuration
  // The config is passed as a query parameter from notification-setup.ts
  const urlParams = new URLSearchParams(location.search);
  const firebaseConfig = {
    apiKey: urlParams.get('apiKey'),
    authDomain: urlParams.get('authDomain'),
    projectId: urlParams.get('projectId'),
    storageBucket: urlParams.get('storageBucket'),
    messagingSenderId: urlParams.get('messagingSenderId'),
    appId: urlParams.get('appId'),
    measurementId: urlParams.get('measurementId'), // Ensure this is passed
  };

  console.log('SW: Firebase config parsed from URL:', firebaseConfig);

  try {
    const app = self.firebase.initializeApp(firebaseConfig);
    console.log('SW: Firebase app initialized successfully.');
    
    const messaging = self.firebase.messaging(app);
    console.log('SW: Firebase messaging initialized successfully.');
    
    // Optional: Set a background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('SW: [firebase-messaging-sw.js] Received background message ', payload);

      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png', // Or use payload.notification.icon
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

  } catch (error) {
    console.error('SW: Error initializing Firebase in Service Worker', error);
  }

} else {
  console.error('SW: Firebase is not available on self. Firebase scripts might not have been loaded correctly.');
}
