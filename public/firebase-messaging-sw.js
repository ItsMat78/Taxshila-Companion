
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

// This file must be named firebase-messaging-sw.js and be in the public folder.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Added this line
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// The rest of your service worker logic for handling background messages would go here.
// For now, we just need the file to exist and initialize messaging.
self.addEventListener('install', () => {
  self.skipWaiting();
});
