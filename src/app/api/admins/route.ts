
import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// GET: Fetches all current admins
export async function GET() {
  try {
    const db = getDb();
    const adminsSnapshot = await db.collection('admins').get();
    const admins = adminsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ success: true, admins });
  } catch (error: any) {
    console.error("Error fetching admins:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch admins." }, { status: 500 });
  }
}

// POST: Adds a new admin by email
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
    }

    const db = getDb();
    // Check if admin with this email already exists
    const existingAdminQuery = await db.collection('admins').where('email', '==', email).limit(1).get();
    if (!existingAdminQuery.empty) {
        return NextResponse.json({ success: false, error: 'An admin with this email already exists.' }, { status: 409 });
    }
    
    const newAdminRef = await db.collection('admins').add({
      email: email,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: newAdminRef.id, email });
  } catch (error: any) {
    console.error("Error adding admin:", error);
    return NextResponse.json({ success: false, error: "Failed to add new admin." }, { status: 500 });
  }
}

// DELETE: Removes an admin by their document ID
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Admin ID is required." }, { status: 400 });
    }

    const db = getDb();
    await db.collection('admins').doc(id).delete();

    return NextResponse.json({ success: true, message: 'Admin removed successfully.' });
  } catch (error: any) {
    console.error("Error removing admin:", error);
    return NextResponse.json({ success: false, error: "Failed to remove admin." }, { status: 500 });
  }
}
