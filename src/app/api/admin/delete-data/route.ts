
import { NextResponse } from 'next/server';
import { getDb, getAuth as getAdminAuth } from '@/lib/firebase-admin';
import { signInWithEmailAndPassword, getAuth as getClientAuth } from 'firebase/auth';
import { app } from '@/lib/firebase'; // Correctly import 'app'

// A (very) simple way to check the password. 
// IMPORTANT: In a real app, you'd want a more secure way to identify an admin,
// likely by checking a custom claim after they are authenticated.
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_EMAIL;

async function verifyAdminPassword(password: string): Promise<boolean> {
    if (!ADMIN_EMAIL) {
        console.error("Admin email is not configured in environment variables.");
        return false;
    }
    try {
        // Use the imported 'app' instance for client-side auth verification
        const clientAuth = getClientAuth(app); 
        await signInWithEmailAndPassword(clientAuth, ADMIN_EMAIL, password);
        return true;
    } catch (error) {
        // Don't log password verification failures as server errors unless debugging
        return false;
    }
}

async function deleteAllFirestoreData() {
    const db = getDb();
    const collections = await db.listCollections();
    const batch = db.batch();
    for (const collection of collections) {
        const snapshot = await collection.get();
        if(snapshot.empty) continue;
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
    await batch.commit();
}

async function deleteAllAuthUsers(adminUid: string | undefined) {
    const auth = getAdminAuth();
    const { users } = await auth.listUsers(1000);
    // Filter out the currently authenticated admin to avoid self-deletion
    const uidsToDelete = users.map(u => u.uid).filter(uid => uid !== adminUid); 
    if (uidsToDelete.length > 0) {
        await auth.deleteUsers(uidsToDelete);
    }
}


export async function POST(request: Request) {
    try {
        const { password } = await request.json();
        if (!password) {
            return NextResponse.json({ success: false, error: "Password is required." }, { status: 400 });
        }

        const isAdmin = await verifyAdminPassword(password);
        if (!isAdmin) {
            return NextResponse.json({ success: false, error: "Invalid admin password." }, { status: 403 });
        }
        
        const adminAuth = getAdminAuth();
        const adminUser = await adminAuth.getUserByEmail(ADMIN_EMAIL!);


        // Proceed with deletion
        await deleteAllFirestoreData();
        // Pass the admin's UID to prevent them from being deleted
        await deleteAllAuthUsers(adminUser.uid);

        return NextResponse.json({ success: true, message: "All application data has been deleted." });

    } catch (error: any) {
        console.error("Delete All Data Error:", error);
        return NextResponse.json({ success: false, error: "An unexpected error occurred during data deletion." }, { status: 500 });
    }
}
