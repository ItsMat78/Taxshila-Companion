
import { NextResponse, type NextRequest } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { CreateRequest } from 'firebase-admin/auth';

const isValidIndianPhoneNumber = (phone: string): boolean => {
    const regex = /^[6-9]\d{9}$/;
    return typeof phone === 'string' && regex.test(phone);
};

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, address, shift, seatNumber, profilePictureUrl } = await request.json();

    // --- 1. Validation ---
    if (!name || !password || !address || !shift || !seatNumber || !phone) {
        return NextResponse.json({ success: false, error: "Missing required fields. All fields except email are mandatory." }, { status: 400 });
    }
    if (!isValidIndianPhoneNumber(phone)) {
        return NextResponse.json({ success: false, error: "Invalid phone number format. Must be 10 digits starting with 6-9." }, { status: 400 });
    }
    
    const auth = getAuth();
    const db = getDb();
    
    // --- 2. Check for Existing User and Seat Availability ---
    const seatQuery = db.collection('students').where('shift', '==', shift).where('seatNumber', '==', seatNumber).where('activityStatus', '==', 'Active');
    const seatSnapshot = await seatQuery.get();
    if (!seatSnapshot.empty) {
        return NextResponse.json({ success: false, error: `Seat ${seatNumber} is already taken for the ${shift} shift.` }, { status: 409 });
    }

    if (email) {
        try {
            await auth.getUserByEmail(email);
            return NextResponse.json({ success: false, error: 'An account with this email already exists in Firebase Auth.' }, { status: 409 });
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') throw error; // Re-throw unexpected errors
        }
    }
     try {
        await auth.getUserByPhoneNumber(`+91${phone}`);
        return NextResponse.json({ success: false, error: 'An account with this phone number already exists in Firebase Auth.' }, { status: 409 });
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') throw error; // Re-throw unexpected errors
    }

    // --- 3. Generate a new custom student ID ---
    const studentId = `TSMEM${String(Date.now()).slice(-6)}`;

    // --- 4. Create Firebase Auth User ---
    const userPayload: CreateRequest = {
      password: password,
      displayName: name,
      disabled: false,
      phoneNumber: `+91${phone}`,
    };
    if (email) userPayload.email = email;
    if (profilePictureUrl) userPayload.photoURL = profilePictureUrl;
    
    const userRecord = await auth.createUser(userPayload);

    // --- 5. Create Firestore Student Document ---
    // Use the auto-generated Firestore ID for the document, but store the custom studentId inside it.
    const studentDocRef = db.collection('students').doc(); 

    await studentDocRef.set({
      uid: userRecord.uid, // Save the Auth UID
      studentId, // Save the custom TSMEM... ID
      name,
      email: email || null,
      phone,
      address,
      shift,
      seatNumber,
      activityStatus: 'Active',
      profileSetupComplete: true,
      registrationDate: Timestamp.fromDate(new Date()),
      feeStatus: 'Due',
      profilePictureUrl: profilePictureUrl || null,
      createdAt: Timestamp.fromDate(new Date()),
    });

    // --- 6. Return a successful response ---
    return NextResponse.json({ success: true, studentId: studentId });

  } catch (error: any) {
    console.error("Admin Registration Error:", error);
    if (error.code?.startsWith('auth/')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "An unexpected server error occurred." }, { status: 500 });
  }
}
