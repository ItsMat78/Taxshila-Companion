
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { getFirestore, collection, getDocs } from 'firebase-admin/firestore';

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

  // Check that all required environment variables are present
  if (!privateKey || !clientEmail || !projectId) {
    console.error("[API Route (migrate-users)] Missing Firebase Admin credentials in .env file.");
    throw new Error("Server configuration error: Missing Firebase Admin environment variables.");
  }

  try {
    // Initialize the app with the credentials
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        // Replace escaped newlines from the environment variable with actual newlines
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error(`[API Route (migrate-users)] Firebase Admin SDK initialization error: ${error.message}`);
    throw new Error(`Could not initialize Firebase Admin SDK. Check your .env file. Internal error: ${error.message}`);
  }
}

export async function POST() {
  try {
    initializeFirebaseAdmin();
    const db = getFirestore();
    const auth = admin.auth();
    console.log("[API Route (migrate-users)] Firebase Admin SDK initialized successfully.");

    // Step 1: Fetch all students from Firestore
    const studentsSnapshot = await getDocs(collection(db, 'students'));
    const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalStudents = students.length;
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const phoneOnlyUsers: string[] = [];

    console.log(`[API Route (migrate-users)] Found ${totalStudents} students to process.`);
    
    for (const student of students) {
        if (student.email && student.password) {
            try {
                await auth.createUser({
                    email: student.email,
                    password: student.password,
                    displayName: student.name,
                    // We can associate the Firestore doc ID with the Auth user for easy lookup
                    customClaims: { firestoreId: student.id, studentId: student.studentId }
                });
                createdCount++;
            } catch (error: any) {
                if (error.code === 'auth/email-already-exists') {
                    // This is expected if you run the script multiple times.
                    skippedCount++;
                } else {
                    console.error(`Failed to create user for ${student.email}:`, error.message);
                    errors.push(`Student ${student.studentId} (${student.email}): ${error.message}`);
                    errorCount++;
                }
            }
        } else if (student.phone && !student.email) {
            phoneOnlyUsers.push(`Student ${student.studentId} (${student.phone})`);
            skippedCount++;
        } else {
            // Student has no email or no password
            skippedCount++;
        }
    }

    const summary = {
        totalStudents,
        createdCount,
        skippedCount,
        errorCount,
        phoneOnlyUsersCount: phoneOnlyUsers.length,
        errors,
        phoneOnlyUsers,
    };
    
    console.log("[API Route (migrate-users)] Migration summary:", summary);

    return NextResponse.json({
      success: true,
      message: `Migration process completed. Created: ${createdCount}, Skipped: ${skippedCount}, Errors: ${errorCount}.`,
      summary: summary
    });

  } catch (error: any) {
    console.error("[API Route (migrate-users)] A top-level error occurred:", error.message);
    // Return a more informative error response
    return NextResponse.json(
      { success: false, error: `An error occurred during initialization: ${error.message}` },
      { status: 500 }
    );
  }
}
