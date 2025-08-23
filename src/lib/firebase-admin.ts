
// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

console.log('[Firebase Admin] Module loaded.');

let adminApp: App | null = null;

function getAdminApp(): App {
  console.log('[Firebase Admin] getAdminApp() called.');
  if (adminApp) {
    console.log('[Firebase Admin] Returning existing app instance.');
    return adminApp;
  }

  if (getApps().length > 0) {
    console.log('[Firebase Admin] Returning app from getApps().');
    adminApp = getApps()[0]!;
    return adminApp;
  }

  // Explicitly read server-side environment variables using the NEXT_PUBLIC_ prefix
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;
  // Crucially, replace \\n with \n for the private key to be parsed correctly.
  const privateKey = process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  console.log(`[Firebase Admin] Project ID from env: ${projectId ? 'Loaded' : 'MISSING'}`);
  console.log(`[Firebase Admin] Client Email from env: ${clientEmail ? 'Loaded' : 'MISSING'}`);
  console.log(`[Firebase Admin] Private Key from env: ${privateKey ? 'Loaded' : 'MISSING'}`);

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[Firebase Admin] SDK initialization failed: Required environment variables NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL, or NEXT_PUBLIC_FIREBASE_PRIVATE_KEY are missing.');
    throw new Error('Firebase Admin SDK is not configured properly. Missing environment variables.');
  }

  try {
    console.log('[Firebase Admin] Attempting to initialize app...');
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId: projectId, // Explicitly setting projectId
    });
    console.log('[Firebase Admin] App initialized successfully.');
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
  console.log('[Firebase Admin] getInitializedMessaging() called.');
  getAdminApp(); // Ensure app is initialized
  return getMessaging();
}

export { 
  getInitializedFirestore as getDb, 
  getInitializedAuth as getAuth, 
  getInitializedMessaging as getMessaging 
};
