
// src/app/api/firebase-config/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };

    // Verify all keys are present
    for (const [key, value] of Object.entries(firebaseConfig)) {
      if (!value) {
        throw new Error(`Missing environment variable for Firebase config key: ${key}`);
      }
    }

    return NextResponse.json(firebaseConfig);
  } catch (error: any) {
    console.error('[API Firebase Config] Error:', error.message);
    return NextResponse.json({ success: false, error: 'Server error fetching Firebase configuration.' }, { status: 500 });
  }
}
