
// src/app/api/admin/health-check/route.ts
import { NextResponse } from 'next/server';
import { getDb, getAuth, getMessaging } from '@/lib/firebase-admin';

export async function GET() {
  console.log('[Health Check] Starting server-side Firebase health check...');
  const results: Record<string, { status: 'ok' | 'error'; message: string }> = {};

  // 1. Test Firestore Initialization
  try {
    const db = getDb();
    await db.listCollections(); // Simple, non-destructive read operation
    results.firestore = { status: 'ok', message: 'Firestore initialized and connected successfully.' };
    console.log('[Health Check] Firestore check successful.');
  } catch (error: any) {
    results.firestore = { status: 'error', message: `Firestore initialization failed: ${error.message}` };
    console.error('[Health Check] Firestore check FAILED:', error);
  }

  // 2. Test Auth Initialization
  try {
    const auth = getAuth();
    // Attempt to get a user by a non-existent UID. This tests connectivity without needing a real UID.
    // It's expected to throw a "user-not-found" error, which still proves the service is connected.
    await auth.getUser('health-check-test-user').catch(e => {
        if (e.code !== 'auth/user-not-found') {
            throw e; // Re-throw if it's a different error (e.g., connectivity issue)
        }
        // Otherwise, this is a successful test.
    });
    results.auth = { status: 'ok', message: 'Auth initialized and connected successfully.' };
    console.log('[Health Check] Auth check successful.');
  } catch (error: any) {
    results.auth = { status: 'error', message: `Auth initialization failed: ${error.message}` };
    console.error('[Health Check] Auth check FAILED:', error);
  }

  // 3. Test Messaging Initialization
  try {
    // The most important test is whether getMessaging() throws an error during initialization.
    // This happens if credentials are not found or are invalid.
    getMessaging();
    results.messaging = { status: 'ok', message: 'Messaging service initialized successfully (credentials found).' };
    console.log('[Health Check] Messaging check successful.');
  } catch (error: any) {
    results.messaging = { status: 'error', message: `Messaging initialization failed: ${error.message}` };
    console.error('[Health Check] Messaging check FAILED:', error);
  }
  
  const overallStatus = Object.values(results).every(r => r.status === 'ok') ? 200 : 500;
  
  console.log('[Health Check] Health check complete.');
  return NextResponse.json({ results }, { status: overallStatus });
}
