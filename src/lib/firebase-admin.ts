// src/lib/firebase-admin.ts

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

// Check if the app is already initialized to prevent re-initialization
if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // Ensure all required environment variables are present before initializing
  if (projectId && clientEmail && privateKey) {
    try {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL: `https://${projectId}.firebaseio.com`,
        projectId: projectId, // Add projectId here
      });
      console.log('Firebase Admin SDK has been initialized.');
    } catch (error) {
      console.error('Firebase Admin SDK initialization error:', error);
    }
  } else {
    // This log is crucial for debugging missing environment variables
    console.error('Firebase Admin SDK initialization failed: Missing required environment variables.');
  }
}

// By exporting the getter functions directly from the SDK,
// we ensure that any file importing them gets the properly initialized instance.
// We alias getFirestore to getDb to match the usage in your API routes.
export { getFirestore as getDb, getAuth, getMessaging };
