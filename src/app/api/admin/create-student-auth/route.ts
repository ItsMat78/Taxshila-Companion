

// src/app/api/admin/create-student-auth/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/firebase-admin';
import type { CreateRequest } from 'firebase-admin/auth';

const isValidIndianPhoneNumber = (phone: string): boolean => {
    const regex = /^[6-9]\d{9}$/;
    return typeof phone === 'string' && regex.test(phone);
};

export async function POST(request: Request) {
  try {
    const { email, phone, password, name } = await request.json();

    // --- Validation ---
    if (!name || !password || !phone) {
        return NextResponse.json({ success: false, error: "Missing required fields: name, phone, and password are required." }, { status: 400 });
    }
    if (!isValidIndianPhoneNumber(phone)) {
        return NextResponse.json({ success: false, error: "Invalid phone number format." }, { status: 400 });
    }
    if (password.length < 6) {
        return NextResponse.json({ success: false, error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const auth = getAuth();
    
    // Determine the email to be used for authentication
    const emailForAuth = email || `${phone}@taxshila-auth.com`;
    
    // --- Check for existing users ---
    try {
        await auth.getUserByEmail(emailForAuth);
        return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') throw error;
    }
    try {
        await auth.getUserByPhoneNumber(`+91${phone}`);
        return NextResponse.json({ success: false, error: 'An account with this phone number already exists.' }, { status: 409 });
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') throw error;
    }

    // --- Create Firebase Auth User ---
    const userPayload: CreateRequest = {
      password: password,
      displayName: name,
      disabled: false,
      phoneNumber: `+91${phone}`,
      email: emailForAuth, // Always include an email
    };
    
    const userRecord = await auth.createUser(userPayload);

    // --- Return a successful response with the new UID and the email used ---
    return NextResponse.json({ success: true, uid: userRecord.uid, email: emailForAuth });

  } catch (error: any) {
    console.error("Create Student Auth API Error:", error);
    if (error.code?.startsWith('auth/')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "An unexpected server error occurred during auth creation." }, { status: 500 });
  }
}

