
import { NextResponse, type NextRequest } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ success: false, error: "User UID is required." }, { status: 400 });
    }

    const auth = getAuth();
    const db = getDb();

    // 1. Delete Firebase Auth User
    await auth.deleteUser(uid);

    // 2. Delete Firestore Student Document (and related sub-collections if necessary)
    // This assumes the student document's ID is the same as their Auth UID.
    await db.collection('students').doc(uid).delete();

    // You might need to add logic here to delete related sub-collections or other data
    // associated with the student (e.g., attendance records, payments). This would typically
    // be handled via Firebase Cloud Functions triggered by the Firestore document deletion.
    // For a simple direct deletion, this covers the main document.

    return NextResponse.json({ success: true, message: `Student with UID ${uid} deleted successfully.` });

  } catch (error: any) {
    console.error("Admin Delete Student Error:", error);
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({ success: false, error: "User not found in Firebase Authentication." }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred during student deletion." }, { status: 500 });
  }
}
