
// src/app/api/admin/verify-and-set-claim/route.ts
import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';

// Helper to verify the token of the user making the request
async function getVerifiedUid(request: Request): Promise<string | null> {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return null;
    }
    try {
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        console.error("Error verifying ID token:", error);
        return null;
    }
}

// This endpoint is called by an admin right after they log in.
// It verifies their status and sets a custom claim if needed.
export async function POST(request: Request) {
    try {
        const uid = await getVerifiedUid(request);
        if (!uid) {
            return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token.' }, { status: 401 });
        }

        const auth = getAuth();
        const db = getDb();
        
        // Check if the user already has the claim
        const userRecord = await auth.getUser(uid);
        if (userRecord.customClaims?.['admin'] === true) {
            return NextResponse.json({ success: true, message: 'Admin claim already exists.' });
        }

        // If no claim, check the database
        const adminDoc = await db.collection('admins').doc(uid).get();

        if (adminDoc.exists) {
            // User is in the admins collection, so set the custom claim
            await auth.setCustomUserClaims(uid, { admin: true });
            return NextResponse.json({ success: true, message: 'Admin claim has been set successfully.' });
        } else {
            // User is not in the admins collection, they are not an admin.
            return NextResponse.json({ success: false, error: 'User is not registered as an admin.' }, { status: 403 });
        }

    } catch (error: any) {
        console.error("Verify and Set Claim API Error:", error);
        return NextResponse.json({ success: false, error: "An unexpected server error occurred." }, { status: 500 });
    }
}
