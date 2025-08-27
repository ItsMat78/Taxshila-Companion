
// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';

console.log('[Firebase Admin] Module loaded.');

// Log environment variables at the top level of the module to see what's available when the file is first parsed.
console.log(`[Firebase Admin] Reading env vars at module load time...`);
console.log(`[Firebase Admin] NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'Loaded' : 'MISSING'}`);
console.log(`[Firebase Admin] FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? 'Loaded' : 'MISSING'}`);
console.log(`[Firebase Admin] NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL: ${process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL ? 'Loaded' : 'MISSING'}`);
console.log(`[Firebase Admin] FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? 'Loaded' : 'MISSING'}`);
console.log(`[Firebase Admin] NEXT_PUBLIC_FIREBASE_PRIVATE_KEY: ${process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY ? 'Loaded' : 'MISSING'}`);
console.log(`[Firebase Admin] FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? 'Loaded' : 'MISSING'}`);

let adminApp: App | null = null;

function getAdminApp(): App {
  console.log('[Firebase Admin] getAdminApp() called.');
  if (adminApp) {
    console.log('[Firebase Admin] Returning existing app instance.');
    return adminApp;
  }

  if (getApps().length > 0) {
    const existingApp = getApps().find(app => app.name === '[DEFAULT]');
    if(existingApp) {
      console.log('[Firebase Admin] Returning default app from getApps().');
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

  console.log(`[Firebase Admin] Project ID from env within getAdminApp: ${projectId ? 'Loaded' : 'MISSING'}`);
  console.log(`[Firebase Admin] Client Email from env within getAdminApp: ${clientEmail ? 'Loaded' : 'MISSING'}`);
  console.log(`[Firebase Admin] Private Key from env within getAdminApp: ${privateKey ? 'Loaded' : 'MISSING'}`);

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[Firebase Admin] SDK initialization failed: One or more required Firebase Admin environment variables are missing.');
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
      projectId: projectId, 
    });
    console.log('[Firebase Admin] App initialized successfully.');
    return adminApp;
  } catch (error: any) {
    console.error('[Firebase Admin] SDK initialization error:', error.message);
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
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
  console.log('[Firebase Admin] getInitializedMessaging() called.');
  const app = getAdminApp();
  return getMessaging(app);
}

export { 
  getInitializedFirestore as getDb, 
  getInitializedAuth as getAuth, 
  getInitializedMessaging as getMessaging 
};
