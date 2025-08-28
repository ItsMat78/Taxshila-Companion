
// DO NOT CHANGE: This file must be in the public folder.
// DO NOT CHANGE: The file must be named firebase-messaging-sw.js.

// This is the standard, compatible way to import the Firebase libraries in a service worker.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// These variables are injected by the Webpack plugin in next.config.ts.
// They are not available at build time, only at runtime in the browser.
const firebaseConfig = {
    apiKey: self.FIREBASE_API_KEY,
    authDomain: self.FIREBASE_AUTH_DOMAIN,
    projectId: self.FIREBASE_PROJECT_ID,
    storageBucket: self.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
    appId: self.FIREBASE_APP_ID,
    measurementId: self.FIREBASE_MEASUREMENT_ID,
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

/**
 * THE CRITICAL PART: This is the event handler that listens for messages when the app is in the background.
 * It takes the data from the incoming message and uses the browser's native notification API to display it to the user.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize the notification appearance
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/logo.png' // Use icon from payload or default
  };

  // The `self.registration.showNotification` function is what actually creates the visible pop-up.
  self.registration.showNotification(notificationTitle, notificationOptions);
});
