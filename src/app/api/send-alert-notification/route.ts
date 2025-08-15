

import { NextResponse, type NextRequest } from 'next/server';
import { getDb, getAuth, getMessaging } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Auth, CreateRequest, UserRecord } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

const isValidIndianPhoneNumber = (phone: string): boolean => {
    const regex = /^[6-9]\d{9}$/;
    return typeof phone === 'string' && regex.test(phone);
};

async function findUser(auth: Auth, email?: string, phoneNumber?: string): Promise<UserRecord | null> {
    if (email) {
        try {
            return await auth.getUserByEmail(email);
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') throw error;
        }
    }
    if (phoneNumber) {
        try {
            return await auth.getUserByPhoneNumber(phoneNumber);
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') throw error;
        }
    }
    return null;
}

async function handleUserMigration(db: Firestore, auth: Auth) {
  let created = 0, updated = 0, disabled = 0, skipped = 0, errors = 0;
  const errorDetails: string[] = [];

  // --- 1. Protect Admins ---
  const adminEmails = new Set<string>();
  try {
      const adminsSnapshot = await db.collection('admins').get();
      adminsSnapshot.forEach(doc => {
          const adminData = doc.data();
          if (adminData.email) {
              adminEmails.add(adminData.email);
          }
      });
  } catch (e: any) {
      errors++;
      errorDetails.push(`Could not fetch admin list: ${e.message}`);
      // If we can't get the admin list, we should not proceed with the migration.
      return { success: false, message: 'Migration failed: Could not protect admin accounts.', created, updated, disabled, skipped, errors, errorDetails };
  }


  const studentsSnapshot = await db.collection('students').get();
  for (const studentDoc of studentsSnapshot.docs) {
    const student = studentDoc.data();
    const studentIdentifier = student.email || student.phone || student.studentId;

    // --- 2. Never Touch Admins ---
    if (student.email && adminEmails.has(student.email)) {
        skipped++;
        continue; // Skip this record entirely.
    }
    
    try {
        // --- 3. Use the Correct Field ---
        const isStudentMarkedAsLeft = student.activityStatus && student.activityStatus.toLowerCase() === 'left';
        const phoneNumber = (student.phone && isValidIndianPhoneNumber(student.phone)) ? `+91${student.phone}` : undefined;

        const existingUser = await findUser(auth, student.email, phoneNumber);

        if (isStudentMarkedAsLeft) {
            // --- 4. Disable "Left" Students ---
            if (existingUser && !existingUser.disabled) {
                await auth.updateUser(existingUser.uid, { disabled: true });
                disabled++;
            } else {
                skipped++; // Already disabled or doesn't exist.
            }
        } else { // --- 5. Enable "Active" Students ---
            if (!student.password) {
                skipped++; // Can't process active students without a password.
                continue;
            }

            if (existingUser) { // Update existing active user
                const updates: { disabled?: boolean; phoneNumber?: string; email?: string; } = {};
                if (existingUser.disabled) updates.disabled = false; // Re-enable them if they were 'Left' before.
                if (phoneNumber && existingUser.phoneNumber !== phoneNumber) updates.phoneNumber = phoneNumber;
                if (student.email && existingUser.email !== student.email) updates.email = student.email;

                if (Object.keys(updates).length > 0) {
                    await auth.updateUser(existingUser.uid, updates);
                    updated++;
                } else {
                    skipped++;
                }
            } else { // Create new active user
                const userPayload: CreateRequest = {
                    password: student.password,
                    displayName: student.name,
                    disabled: false,
                };
                if (student.email) userPayload.email = student.email;
                if (phoneNumber) userPayload.phoneNumber = phoneNumber;

                if (userPayload.email || userPayload.phoneNumber) {
                    await auth.createUser(userPayload);
                    created++;
                } else {
                    errors++;
                    errorDetails.push(`Skipping creation for ${studentIdentifier}: no valid email or phone.`);
                }
            }
        }
    } catch (error: any) {
        errors++;
        errorDetails.push(`Failed to process student ${studentIdentifier}: ${error.message}`);
    }
  }

  return {
    success: true,
    message: 'Migration process completed.',
    created,
    updated,
    disabled,
    skipped,
    errors,
    errorDetails,
  };
}


interface AlertPayload {
  alertId: string;
  title: string;
  message: string;
  type: string;
  studentId?: string;
  originalFeedbackId?: string;
  originalFeedbackMessageSnippet?: string;
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const auth = getAuth();
    
    const requestBody = await request.json();

    // Check if the request is for user migration
    if (requestBody.action === 'migrateUsers') {
      const migrationResult = await handleUserMigration(db, auth);
      return NextResponse.json(migrationResult);
    }

    // Assume it's an alert payload if not a migration action
    let alertPayload: AlertPayload = requestBody;
    
    const messaging = getMessaging();
    const notification = {
        title: alertPayload.title,
        body: alertPayload.message,
        icon: "/logo.png",
    };
    
    const dataPayload = {
        ...notification,
        url: '/member/alerts'
    };


    if (alertPayload.studentId) {
      // Send to a specific student
      const studentQuery = await db.collection('students').where('studentId', '==', alertPayload.studentId).limit(1).get();
      if (!studentQuery.empty) {
        const student = studentQuery.docs[0].data();
        if (student.fcmTokens && student.fcmTokens.length > 0) {
            await messaging.sendEachForMulticast({ tokens: student.fcmTokens, data: dataPayload });
        }
      }
    } else {
      // Send to all active students
      const studentsSnapshot = await db.collection('students').where('activityStatus', '==', 'Active').get();
      const allTokens = studentsSnapshot.docs.flatMap(doc => doc.data().fcmTokens || []);
      const uniqueTokens = [...new Set(allTokens)];

      if (uniqueTokens.length > 0) {
        // Break into chunks of 500 for multicast
        for (let i = 0; i < uniqueTokens.length; i += 500) {
          const chunk = uniqueTokens.slice(i, i + 500);
          await messaging.sendEachForMulticast({ tokens: chunk, data: dataPayload });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Alert notification process initiated." });

  } catch (error: any) {
    console.error("API Route (send-alert-notification): Error processing request:", error);
    return NextResponse.json({ success: false, error: error.message || "An unexpected server error occurred." }, { status: 500 });
  }
}
