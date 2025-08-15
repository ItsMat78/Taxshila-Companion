
// src/app/api/admin/update-student-auth/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';
import type { UpdateRequest } from 'firebase-admin/auth';

const isValidIndianPhoneNumber = (phone: string): boolean => {
    const regex = /^[6-9]\d{9}$/;
    return typeof phone === 'string' && regex.test(phone);
};

export async function POST(request: Request) {
  try {
    const { uid, email, phone } = await request.json();

    if (!uid) {
        return NextResponse.json({ success: false, error: "User UID is required." }, { status: 400 });
    }

    const auth = getAuth();
    const updatePayload: UpdateRequest = {};

    // Validate and add email to payload if provided
    if (email) {
        try {
            await auth.getUserByEmail(email);
            // If the above line does not throw, it means the email is already in use by another user.
            return NextResponse.json({ success: false, error: "This email address is already in use by another account." }, { status: 409 });
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') {
                 // Re-throw unexpected errors
                throw error;
            }
            // Email is not in use, so it's safe to add it to the payload.
            updatePayload.email = email;
        }
    }

    // Validate and add phone number to payload if provided
    if (phone) {
        if (!isValidIndianPhoneNumber(phone)) {
            return NextResponse.json({ success: false, error: "Invalid phone number format." }, { status: 400 });
        }
        const fullPhoneNumber = `+91${phone}`;
         try {
            await auth.getUserByPhoneNumber(fullPhoneNumber);
            // If the above line does not throw, it means the phone number is already in use.
            return NextResponse.json({ success: false, error: "This phone number is already in use by another account." }, { status: 409 });
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') {
                // Re-throw unexpected errors
                throw error;
            }
             // Phone number is not in use, so it's safe to add it to the payload.
            updatePayload.phoneNumber = fullPhoneNumber;
        }
    }
    
    // If there's nothing to update, return early.
    if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ success: true, message: "No authentication details needed to be updated." });
    }

    // Perform the update
    const userRecord = await auth.updateUser(uid, updatePayload);

    // Return a successful response
    return NextResponse.json({ success: true, uid: userRecord.uid });

  } catch (error: any) {
    console.error("Update Student Auth API Error:", error);
    if (error.code?.startsWith('auth/')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "An unexpected server error occurred during auth update." }, { status: 500 });
  }
}
