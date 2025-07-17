
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK directly at the module level
try {
  if (!admin.apps.length) {
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKeyRaw) {
      console.error("[API Route (migrate-users)] FIREBASE_PRIVATE_KEY environment variable is NOT SET. Admin SDK cannot initialize.");
      throw new Error("FIREBASE_PRIVATE_KEY environment variable is not set.");
    }
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    
    console.log("[API Route (migrate-users)] Attempting to initialize Firebase Admin SDK...");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("[API Route (migrate-users)] Firebase Admin SDK initialized successfully.");
  }
} catch (e: any) {
  console.error('[API Route (migrate-users)] Firebase Admin SDK initialization error:', e.message, e);
}

const getDb = () => {
  if (!admin.apps.length) {
    console.error("[API Route (migrate-users)] Firebase Admin SDK not initialized when getDb() was called.");
    throw new Error("Firebase Admin SDK not initialized. This is a server-side configuration issue.");
  }
  return admin.firestore();
};

const getAuth = () => {
  if (!admin.apps.length) {
    console.error("[API Route (migrate-users)] Firebase Admin SDK not initialized when getAuth() was called.");
    throw new Error("Firebase Admin SDK not initialized. This is a server-side configuration issue.");
  }
  return admin.auth();
};

export async function POST(request: NextRequest) {
  if (!admin.apps.length) {
    console.error("[API Route (migrate-users)] Cannot process request because Firebase Admin SDK is not initialized. Check server logs for initialization errors.");
    return NextResponse.json({ success: false, error: "Firebase Admin SDK not initialized on server. Check logs." }, { status: 500 });
  }

  try {
    const db = getDb();
    const auth = getAuth();

    const studentsSnapshot = await db.collection('students').get();
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const student = studentDoc.data();

      if (!student.email || !student.password) {
        skippedCount++;
        continue;
      }

      try {
        await auth.getUserByEmail(student.email);
        skippedCount++;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          try {
            await auth.createUser({
              email: student.email,
              password: student.password,
              displayName: student.name,
              disabled: false,
            });
            createdCount++;
          } catch (creationError: any) {
            console.error(`Error creating user for ${student.email}:`, creationError.message);
            errors.push(`Failed to create ${student.email}: ${creationError.code}`);
            errorCount++;
          }
        } else {
          console.error(`Error checking user ${student.email}:`, error.message);
          errors.push(`Error checking ${student.email}: ${error.code}`);
          errorCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Migration process completed.',
      createdCount,
      skippedCount,
      errorCount,
      errors,
    });
  } catch (error: any) {
    console.error('[API Route (migrate-users)] A top-level error occurred during POST:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
