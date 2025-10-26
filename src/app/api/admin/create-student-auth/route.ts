

// src/app/api/admin/create-student-auth/route.ts
import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin'; // Import getDb
import type { CreateRequest, UserRecord } from 'firebase-admin/auth';

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
    const db = getDb();
    
    const emailForAuth = email || `${phone}@taxshila-auth.com`;
    const phoneNumberForAuth = `+91${phone}`;

    let existingUser: UserRecord | null = null;
    
    // --- Check for existing users ---
    try {
        existingUser = await auth.getUserByEmail(emailForAuth);
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') throw error;
    }

    if (!existingUser) {
        try {
            existingUser = await auth.getUserByPhoneNumber(phoneNumberForAuth);
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') throw error;
        }
    }

    // --- HEALING LOGIC ---
    if (existingUser) {
        // Auth user exists. Now, check if they are already linked in Firestore.
        const studentsRef = db.collection('students');
        const studentQuery = await studentsRef.where('uid', '==', existingUser.uid).limit(1).get();
        
        if (studentQuery.empty) {
            // The auth user exists but is NOT in the database (orphaned).
            // This is a "healing" scenario. We'll return the existing UID to allow the client to create the DB record.
            return NextResponse.json({ success: true, uid: existingUser.uid, email: existingUser.email || emailForAuth });
        } else {
            // The auth user exists AND is in the database. This is a true duplicate.
            return NextResponse.json({ success: false, error: 'A student with this email or phone number is already fully registered.' }, { status: 409 });
        }
    }
    

    // --- Create New Firebase Auth User ---
    const userPayload: CreateRequest = {
      password: password,
      displayName: name,
      disabled: false,
      phoneNumber: phoneNumberForAuth,
      email: emailForAuth,
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

