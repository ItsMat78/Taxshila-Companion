
// This file must be in the /public directory.

// The service worker must have access to the same Firebase config as your web app.
// It's recommended to store this in environment variables.
// In this example, we'll construct the config object manually,
// assuming the variables are available in the service worker's scope.
// IMPORTANT: `process.env` is not directly available in service workers.
// The values need to be passed in or handled by your build process.
// A common pattern is to have a build step that replaces these placeholders.
// For this environment, we assume the build system handles this replacement.

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize the Firebase app in the service worker
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[sw.js] Received background message ', payload);

  if (payload.notification) {
    const notificationTitle = payload.notification.title || "New Notification";
    const notificationOptions = {
      body: payload.notification.body || "You have a new message.",
      icon: payload.notification.icon || '/logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});
