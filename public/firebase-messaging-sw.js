// public/firebase-messaging-sw.js

// Using importScripts for service worker compatibility
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// This is a special file that is used by the browser to handle push notifications.
// It must be in the public directory and named exactly 'firebase-messaging-sw.js'.

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  // Take control of all clients as soon as the service worker is activated.
  event.waitUntil(self.clients.claim());
});


try {
  const urlParams = new URLSearchParams(self.location.search);
  const firebaseConfig = {
    apiKey: urlParams.get('apiKey'),
    authDomain: urlParams.get('authDomain'),
    projectId: urlParams.get('projectId'),
    storageBucket: urlParams.get('storageBucket'),
    messagingSenderId: urlParams.get('messagingSenderId'),
    appId: urlParams.get('appId'),
    measurementId: urlParams.get('measurementId'),
  };

  if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    firebase.messaging();
  }
} catch (e) {
  // Errors are expected here if the config is not yet available.
}
