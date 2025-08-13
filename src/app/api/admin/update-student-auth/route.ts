import { NextResponse } from 'next/server';
// Import the service getters directly from your firebase-admin setup file
import { getAuth, getDb } from '@/lib/firebase-admin';

// Initialize the services by calling the getter functions.
// They will automatically use the initialized admin app.
const auth = getAuth();
const db = getDb();

export async function POST(request: Request) {
  try {
    const { uid, email, password, phone } = await request.json();

    if (!uid) {
      return NextResponse.json({ success: false, error: "User UID is required." }, { status: 400 });
    }

    // --- Part 1: Update Firebase Authentication ---
    const authUpdatePayload: { email?: string; password?: string; phoneNumber?: string } = {};
    if (email) authUpdatePayload.email = email;
    if (password) authUpdatePayload.password = password;
    if (phone) authUpdatePayload.phoneNumber = phone.startsWith('+') ? phone : `+91${phone}`;

    if (Object.keys(authUpdatePayload).length > 0) {
        await auth.updateUser(uid, authUpdatePayload);
    }

    // --- Part 2: Find the matching document in Firestore and update it ---
    const studentsRef = db.collection('students');
    const snapshot = await studentsRef.where('uid', '==', uid).limit(1).get();

    if (snapshot.empty) {
        return NextResponse.json({ success: false, error: `No student document found in Firestore with uid: ${uid}` }, { status: 404 });
    }

    const studentDocRef = snapshot.docs[0].ref;
    
    const firestoreUpdate: { email?: string, phone?: string } = {};
    if (email) firestoreUpdate.email = email;
    if (phone) firestoreUpdate.phone = phone;

    if (Object.keys(firestoreUpdate).length > 0) {
        await studentDocRef.update(firestoreUpdate);
    }
    
    return NextResponse.json({ success: true, message: "User authentication and profile updated successfully." });

  } catch (error: any) {
    console.error("Update Auth API Error:", error);
    let errorMessage = "An unexpected error occurred.";
    if(error.code === 'auth/user-not-found') {
        errorMessage = "The user was not found in Firebase Authentication.";
    } else if (error.message) {
        errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
