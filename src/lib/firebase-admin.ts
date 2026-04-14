
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
    const existingApp = getApps().find(app => app.name === '[DEFAULT]');
    if(existingApp) {
      adminApp = existingApp;
      return adminApp;
    }
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel escapes newlines in env vars, so we need to replace them back
  const privateKey = (process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[Firebase Admin] SDK initialization failed: One or more required Firebase Admin environment variables are missing.');
    throw new Error('Firebase Admin SDK is not configured properly. Missing environment variables.');
  }

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId: projectId,
    });
    return adminApp;
  } catch (error: unknown) {
    console.error('[Firebase Admin] SDK initialization error:', (error instanceof Error ? error.message : String(error)));
    throw new Error(`Firebase Admin SDK initialization failed: ${(error instanceof Error ? error.message : String(error))}`);
  }
}

function getInitializedFirestore() {
  const app = getAdminApp();
  return getFirestore(app);
}

function getInitializedAuth() {
  const app = getAdminApp();
  return getAuth(app);
}

function getInitializedMessaging() {
  const app = getAdminApp();
  return getMessaging(app);
}

export {
  getInitializedFirestore as getDb,
  getInitializedAuth as getAuth,
  getInitializedMessaging as getMessaging
};
