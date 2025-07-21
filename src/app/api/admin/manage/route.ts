import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';

// Helper to check if the requester is an admin and self-heal permissions
async function verifyAndHealAdmin(request: Request): Promise<boolean> {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return false;
    }

    try {
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);

        if (decodedToken.admin === true) {
            return true;
        }

        const db = getDb();
        const adminDoc = await db.collection('admins').doc(decodedToken.uid).get();

        if (adminDoc.exists) {
            await auth.setCustomUserClaims(decodedToken.uid, { admin: true });
            return true;
        }

        return false;
    } catch (error) {
        console.error("Error in admin verification:", error);
        return false;
    }
}

// GET - Fetch all admins
export async function GET(request: Request) {
    const isAuthorized = await verifyAndHealAdmin(request);
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    try {
        const db = getDb();
        const adminsSnapshot = await db.collection('admins').get();
        const admins = adminsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        return NextResponse.json({ admins });
    } catch (error: any) {
        return NextResponse.json({ error: 'An unexpected server error occurred while fetching admins.' }, { status: 500 });
    }
}

// POST - Add a new admin
export async function POST(request: Request) {
    const isAuthorized = await verifyAndHealAdmin(request);
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { name, email, password } = await request.json();
        if (!name || !email || !password || password.length < 6) {
            return NextResponse.json({ error: 'Name, email, and a password of at least 6 characters are required.' }, { status: 400 });
        }

        const auth = getAuth();
        const db = getDb();

        const userRecord = await auth.createUser({ email, password, displayName: name });
        await auth.setCustomUserClaims(userRecord.uid, { admin: true });

        await db.collection('admins').doc(userRecord.uid).set({
            name,
            email,
            role: 'admin',
        });

        return NextResponse.json({ uid: userRecord.uid, name, email });

    } catch (error: any) {
        if (error.code === 'auth/email-already-exists') {
            return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
        }
        console.error("Error adding admin:", error);
        return NextResponse.json({ error: 'An unexpected server error occurred while adding the admin.' }, { status: 500 });
    }
}

// DELETE - Remove an admin
export async function DELETE(request: Request) {
    const isAuthorized = await verifyAndHealAdmin(request);
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { uid } = await request.json();
        if (!uid) {
            return NextResponse.json({ error: 'UID is required to remove an admin.' }, { status: 400 });
        }

        const auth = getAuth();
        const db = getDb();

        await auth.deleteUser(uid);
        await db.collection('admins').doc(uid).delete();

        return NextResponse.json({ message: 'Admin removed successfully.' });

    } catch (error: any) {
        console.error("Error removing admin:", error);
        return NextResponse.json({ error: 'An unexpected server error occurred while removing the admin.' }, { status: 500 });
    }
}
