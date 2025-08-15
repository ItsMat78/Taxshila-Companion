
import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';

// Initialize Admin SDK services
const auth = getAuth();
const db = getDb();

// Define collection names for consistency
const STUDENTS_COLLECTION = "students";
const ATTENDANCE_COLLECTION = "attendanceRecords";
const FEEDBACK_COLLECTION = "feedbackItems";
const ALERTS_COLLECTION = "alertItems";

export async function POST(request: Request) {
  const { uid, studentId } = await request.json();

  // Both uid (for Auth) and studentId (for database records) are required.
  if (!uid || !studentId) {
      return NextResponse.json({ success: false, error: "User UID and Student ID are required for complete deletion." }, { status: 400 });
  }

  // --- Step 1: Delete the user from Firebase Authentication using their UID ---
  try {
    await auth.deleteUser(uid);
  } catch (error: any) {
    // If the user doesn't exist in Auth, we can ignore the error and proceed with database cleanup.
    // This makes the function idempotent.
    if (error.code !== 'auth/user-not-found') {
      console.error(`Failed to delete auth user with UID ${uid}:`, error);
      // We stop here because if we can't delete the auth user, we shouldn't delete their data.
      return NextResponse.json({ success: false, error: `Failed to delete authentication user: ${error.message}` }, { status: 500 });
    }
    console.log(`Authentication user with UID ${uid} was not found. Proceeding with database cleanup anyway.`);
  }

  // --- Step 2: Delete the student's data from Firestore ---
  try {
    const studentQuery = await db.collection(STUDENTS_COLLECTION).where('studentId', '==', studentId).limit(1).get();

    if (studentQuery.empty) {
      // If no document is found, it means the database is already clean for this studentId.
      return NextResponse.json({ success: true, message: `Auth user deleted (or did not exist). No database records found for Student ID: ${studentId}.` });
    }
    
    const studentDoc = studentQuery.docs[0];
    const batch = db.batch();

    // 1. Delete the main student document
    batch.delete(studentDoc.ref);

    // 2. Query and delete all related records in other collections that use studentId
    const collectionsToDeleteFrom = [ATTENDANCE_COLLECTION, FEEDBACK_COLLECTION, ALERTS_COLLECTION];
    for (const collectionName of collectionsToDeleteFrom) {
        const snapshot = await db.collection(collectionName).where("studentId", "==", studentId).get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => batch.delete(doc.ref));
        }
    }

    // 3. Commit all deletions at once
    await batch.commit();

    return NextResponse.json({ success: true, message: `Student ${studentId} and their authentication account were deleted successfully.` });

  } catch (dbError: any) {
      console.error("Database Deletion Error:", dbError);
      return NextResponse.json({ success: false, error: `Failed to delete database records: ${dbError.message}` }, { status: 500 });
  }
}
