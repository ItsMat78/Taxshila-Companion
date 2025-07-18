// src/app/api/admin/migrate-users/route.ts

import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';
import { headers } from 'next/headers'; // Import 'headers' to read request headers


const auth = getAuth();
const db = getDb();

export async function POST() {
  try {
    // --- Step 1: Secure the Endpoint ---
    const authorization = headers().get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized: No token provided.' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    let decodedToken;
    try {
        decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }
    
    // Check if the verified user has the 'admin' role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: User is not an administrator.' }, { status: 403 });
    }
    // --- End of Security Block ---
    
    const summary = {
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [] as string[],
    };

    const studentsSnapshot = await db.collection('students').get();

    for (const doc of studentsSnapshot.docs) {
      const student = doc.data();
      const studentDocRef = doc.ref;

      // This is the key change: We only check for a phone number and the absence of a real email.
      // We no longer require student.uid to be present.
      if (student.phone && (!student.email || student.email.trim() === '')) {
        try {
          // Use the phone number to find the corresponding user in Firebase Authentication.
          const authUser = await auth.getUserByPhoneNumber(`+91${student.phone}`);
          
          const proxyEmail = `${student.phone}@taxshila-auth.com`;
          let needsAuthUpdate = false;
          let needsDbUpdate = false;

          // Condition 1: Does the Authentication user need their email fixed?
          if (!authUser.email || authUser.email !== proxyEmail) {
            needsAuthUpdate = true;
          }

          // Condition 2: Does the database record need the uid added?
          if (!student.uid || student.uid !== authUser.uid) {
            needsDbUpdate = true;
          }

          if (needsAuthUpdate || needsDbUpdate) {
            // Update Auth if needed
            if (needsAuthUpdate) {
              await auth.updateUser(authUser.uid, { email: proxyEmail });
            }
            // Update the database with the uid if needed
            if (needsDbUpdate) {
              await studentDocRef.update({ uid: authUser.uid });
            }
            summary.updated++;
          } else {
            summary.skipped++;
          }
        } catch (error: any) {
          // This will catch cases where a user exists in the DB but not in Auth, or the phone number is not found.
          summary.errors++;
          summary.errorDetails.push(`Student ${student.studentId || student.name}: The user could not be found in the authentication system by their phone number.`);
        }
      } else {
        // Skip users who already have an email or are missing a phone number.
        summary.skipped++;
      }
    }

    return NextResponse.json({ success: true, summary });

  } catch (error: any) {
    console.error("Migration API Error:", error);
    return NextResponse.json({ success: false, error: "An unexpected server error occurred during migration." }, { status: 500 });
  }
}
