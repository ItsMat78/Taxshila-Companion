
import { NextResponse, type NextRequest } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { CreateRequest } from 'firebase-admin/auth';

const isValidIndianPhoneNumber = (phone: string): boolean => {
    const regex = /^[6-9]\d{9}$/;
    return typeof phone === 'string' && regex.test(phone);
};

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, address, shift, seatNumber } = await request.json();

    // --- Validation ---
    if (!name || !password || !address || !shift || !seatNumber || !phone) {
        return NextResponse.json({ success: false, error: "Missing required fields. All fields except email are mandatory." }, { status: 400 });
    }
    if (!isValidIndianPhoneNumber(phone)) {
        return NextResponse.json({ success: false, error: "Invalid phone number format. Must be 10 digits starting with 6-9." }, { status: 400 });
    }
    
    const auth = getAuth();
    const db = getDb();
    
    // --- Seat Availability Check ---
    const seatQuery = db.collection('students').where('shift', '==', shift).where('seatNumber', '==', seatNumber).where('activityStatus', '==', 'Active');
    const seatSnapshot = await seatQuery.get();
    if (!seatSnapshot.empty) {
        return NextResponse.json({ success: false, error: `Seat ${seatNumber} is already taken for the ${shift} shift.` }, { status: 409 });
    }

    // --- Check for Existing User ---
    if (email) {
        const existingStudentByEmail = await db.collection('students').where('email', '==', email).limit(1).get();
        if (!existingStudentByEmail.empty) return NextResponse.json({ success: false, error: 'A student with this email already exists.' }, { status: 409 });
    }
    const existingStudentByPhone = await db.collection('students').where('phone', '==', phone).limit(1).get();
    if (!existingStudentByPhone.empty) return NextResponse.json({ success: false, error: 'A student with this phone number already exists.' }, { status: 409 });

    // --- Create Firebase Auth User ---
    const userPayload: CreateRequest = {
        password: password,
        displayName: name,
        disabled: false,
        phoneNumber: `+91${phone}`, // Phone is now mandatory
    };
    if (email) userPayload.email = email;
    
    const userRecord = await auth.createUser(userPayload);

    // --- Create Firestore Student Document ---
    const studentId = `TSL-${String(Date.now()).slice(-6)}`;
    await db.collection('students').doc(userRecord.uid).set({
      uid: userRecord.uid,
      studentId,
      name,
      email: email || null,
      phone,
      address,
      password,
      shift,
      seatNumber,
      activityStatus: 'Active',
      profileSetupComplete: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, studentId });

  } catch (error: any) {
    console.error("Admin Registration Error:", error);
    if (error.code?.startsWith('auth/')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "An unexpected server error occurred." }, { status: 500 });
  }
}
