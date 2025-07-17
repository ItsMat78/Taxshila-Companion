
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  // Check if the app is already initialized to prevent errors
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Read credentials from environment variables
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  // Validate that all required environment variables are present
  if (!privateKey || !clientEmail || !projectId) {
    console.error("[API Route (migrate-users)] Missing Firebase Admin credentials in environment.");
    throw new Error("Server configuration error: Missing Firebase Admin environment variables.");
  }
  
  try {
    // Initialize the app with credentials
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        // IMPORTANT: Replace escaped newlines with actual newlines
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error(`[API Route (migrate-users)] Firebase Admin SDK initialization error: ${error.message}`);
    throw new Error(`Could not initialize Firebase Admin SDK. Check your .env file. Internal error: ${error.message}`);
  }
}


export async function POST(request: NextRequest) {
  try {
    initializeFirebaseAdmin();
    const db = admin.firestore();
    const auth = admin.auth();

    const studentsSnapshot = await db.collection('students').get();
    
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const student = studentDoc.data();
      const studentId = student.studentId;

      if (!student.email || !student.password) {
        skippedCount++;
        continue; // Skip students without an email or password
      }

      try {
        // Check if a user with this email already exists in Firebase Auth
        await auth.getUserByEmail(student.email);
        skippedCount++;
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // User does not exist, so we can create them
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
          // Some other error occurred when checking for the user
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
    console.error('[API Route (migrate-users)] A top-level error occurred:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
