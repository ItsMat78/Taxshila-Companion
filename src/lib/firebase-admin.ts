
// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  // Explicitly read server-side environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Crucially, replace \\n with \n for the private key to be parsed correctly.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  console.log('[Firebase Admin] Attempting to initialize...');
  console.log(`[Firebase Admin] Project ID from env: ${projectId ? 'Loaded' : 'MISSING'}`);
  console.log(`[Firebase Admin] Client Email from env: ${clientEmail ? 'Loaded' : 'MISSING'}`);
  console.log(`[Firebase Admin] Private Key from env: ${privateKey ? 'Loaded' : 'MISSING'}`);


  if (!projectId || !clientEmail || !privateKey) {
    console.error('[Firebase Admin] SDK initialization failed: Required environment variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY are missing.');
    throw new Error('Firebase Admin SDK is not configured properly. Missing environment variables.');
  }

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId: projectId, // Explicitly setting projectId here
    });
    console.log('[Firebase Admin] SDK has been initialized successfully.');
    return adminApp;
  } catch (error: any) {
    console.error('[Firebase Admin] SDK initialization error:', error.message);
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
}

// Export functions that ensure the app is initialized before returning the service
function getInitializedFirestore() {
  getAdminApp(); // Ensure app is initialized
  return getFirestore();
}

function getInitializedAuth() {
  getAdminApp(); // Ensure app is initialized
  return getAuth();
}

function getInitializedMessaging() {
  getAdminApp(); // Ensure app is initialized
  return getMessaging();
}

export { 
  getInitializedFirestore as getDb, 
  getInitializedAuth as getAuth, 
  getInitializedMessaging as getMessaging 
};
