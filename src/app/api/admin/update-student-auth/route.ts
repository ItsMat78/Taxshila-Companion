
import { NextResponse, type NextRequest } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';
import type { UpdateRequest } from 'firebase-admin/auth';

const isValidIndianPhoneNumber = (phone: string): boolean => {
    const regex = /^[6-9]\d{9}$/;
    return typeof phone === 'string' && regex.test(phone);
};

export async function POST(request: NextRequest) {
  try {
    const { uid, email, phone, password } = await request.json();

    if (!uid) {
        return NextResponse.json({ success: false, error: "User UID is required." }, { status: 400 });
    }

    const auth = getAuth();
    const updatePayload: UpdateRequest = {};

    if (email) updatePayload.email = email;
    if (password) updatePayload.password = password;
    if (phone) {
        if (!isValidIndianPhoneNumber(phone)) {
            return NextResponse.json({ success: false, error: "Invalid phone number format." }, { status: 400 });
        }
        updatePayload.phoneNumber = `+91${phone}`;
    }
    
    if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ success: true, message: "No authentication details to update." });
    }

    await auth.updateUser(uid, updatePayload);

    // Also update the corresponding student document in Firestore if email/phone changes
    const db = getDb();
    const studentRef = db.collection('students').doc(uid);
    const firestoreUpdate: { email?: string | null; phone?: string | null } = {};
    if (email) firestoreUpdate.email = email;
    if (phone) firestoreUpdate.phone = phone;

    if (Object.keys(firestoreUpdate).length > 0) {
        await studentRef.update(firestoreUpdate);
    }
    
    return NextResponse.json({ success: true, message: "User authentication details updated successfully." });

  } catch (error: any) {
    console.error("Update Auth Error:", error);
    return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
