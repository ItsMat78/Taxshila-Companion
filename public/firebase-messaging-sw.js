// public/firebase-messaging-sw.js

// Using importScripts to load the Firebase SDK
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js");

console.log('SW: Service Worker script evaluating.');

const firebaseConfig = {
  apiKey: self.location.search.split('apiKey=')[1].split('&')[0],
  authDomain: self.location.search.split('authDomain=')[1].split('&')[0],
  projectId: self.location.search.split('projectId=')[1].split('&')[0],
  storageBucket: self.location.search.split('storageBucket=')[1].split('&')[0],
  messagingSenderId: self.location.search.split('messagingSenderId=')[1].split('&')[0],
  appId: self.location.search.split('appId=')[1].split('&')[0],
  measurementId: self.location.search.split('measurementId=')[1].split('&')[0],
};

console.log('SW: Firebase config parsed from URL:', firebaseConfig);


try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('SW: Firebase app initialized successfully.');
  } else {
    firebase.app(); // if already initialized, use that one
    console.log('SW: Firebase app already initialized.');
  }

  const messaging = firebase.messaging();
  console.log('SW: Firebase messaging initialized successfully.');

  messaging.onBackgroundMessage((payload) => {
    console.log('SW: Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: '/logo.png', // Ensure this icon exists
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('SW: Error during Firebase initialization:', error);
}

self.addEventListener('install', (event) => {
  console.log('SW: Install event triggered.');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('SW: Activate event triggered.');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('SW: Push event received:', event.data.text());
});
