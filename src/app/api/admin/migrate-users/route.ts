
import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';
import type { UserRecord, CreateRequest } from 'firebase-admin/auth';

// This is the primary admin email from your environment variables.
const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_FIREBASE_ADMIN_EMAIL;

export async function POST() {
  const auth = getAuth();
  const db = getDb();
  let processedCount = 0;
  let updatedCount = 0;
  let createdCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    const studentsSnapshot = await db.collection('students').get();
    processedCount = studentsSnapshot.docs.length;

    for (const studentDoc of studentsSnapshot.docs) {
      const student = studentDoc.data();
      const studentId = student.studentId || 'N/A';
      const studentName = student.name || 'N/A';

      if (!student.phone && !student.email) {
          errors.push(`Skipping student ${studentName} (${studentId}) due to missing phone and email.`);
          errorCount++;
          continue;
      }

      const userEmail = student.email || `${student.phone}@taxshila-auth.com`;
      const phoneNumber = student.phone ? (student.phone.startsWith('+') ? student.phone : `+91${student.phone}`) : undefined;

      try {
        let userRecord: UserRecord | null = null;
        
        // Find existing user by UID, Email, or Phone
        if (student.uid) {
            try { userRecord = await auth.getUser(student.uid); } catch (e: any) { if (e.code !== 'auth/user-not-found') throw e; }
        }
        if (!userRecord) {
            try { userRecord = await auth.getUserByEmail(userEmail); } catch (e: any) { if (e.code !== 'auth/user-not-found') throw e; }
        }
        if (!userRecord && phoneNumber) {
            try { userRecord = await auth.getUserByPhoneNumber(phoneNumber); } catch (e: any) { if (e.code !== 'auth/user-not-found') throw e; }
        }

        // --- Create or Update ---
        if (userRecord) {
          // UPDATE
          const updates: { email?: string; phoneNumber?: string; displayName?: string } = {};
          if (userRecord.email !== userEmail) updates.email = userEmail;
          if (phoneNumber && userRecord.phoneNumber !== phoneNumber) updates.phoneNumber = phoneNumber;
          if (userRecord.displayName !== studentName) updates.displayName = studentName;

          if (Object.keys(updates).length > 0) {
            await auth.updateUser(userRecord.uid, updates);
            updatedCount++;
          }
          if (student.uid !== userRecord.uid) {
            await studentDoc.ref.update({ uid: userRecord.uid, email: userEmail });
          }

        } else {
          // CREATE
          const createRequest: CreateRequest = {
            email: userEmail,
            displayName: studentName,
            password: student.password || student.phone,
          };
          if (phoneNumber) createRequest.phoneNumber = phoneNumber;
          
          const newUserRecord = await auth.createUser(createRequest);
          await studentDoc.ref.update({ uid: newUserRecord.uid, email: userEmail });
          userRecord = newUserRecord; // Use the new record for the claim step
          createdCount++;
        }

        // *** FIX: Grant Admin Privileges ***
        // If the user's email matches the super admin email, ensure they have the admin claim.
        if (userRecord && userRecord.email === SUPER_ADMIN_EMAIL) {
            if (userRecord.customClaims?.admin !== true) {
                await auth.setCustomUserClaims(userRecord.uid, { admin: true });
                // Also ensure they have a record in the 'admins' collection for consistency
                await db.collection('admins').doc(userRecord.uid).set({
                    name: userRecord.displayName,
                    email: userRecord.email,
                    role: 'admin'
                }, { merge: true });
                updatedCount++; // Count this as an update
            }
        }
        
      } catch (userError: any) {
        errors.push(`Error processing ${studentName} (${userEmail}): ${userError.message}`);
        errorCount++;
      }
    }

    return NextResponse.json({ success: true, processedCount, updatedCount, createdCount, errorCount, errors });

  } catch (e: any) {
    console.error("User Migration Error:", e);
    return NextResponse.json({ success: false, error: "An unexpected server error occurred during migration." }, { status: 500 });
  }
}
