
import { NextResponse } from 'next/server';
import { getAuth, getDb } from '@/lib/firebase-admin';
import type { UserRecord, CreateRequest } from 'firebase-admin/auth';

const isValidIndianPhoneNumber = (phone: string): boolean => {
    const regex = /^[6-9]\d{9}$/;
    return typeof phone === 'string' && regex.test(phone);
};

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
      const studentName = student.name || 'N/A';
      
      // Skip if student already has a UID
      if (student.uid) {
        continue;
      }
      
      // Ensure phone number is valid before proceeding
      if (!student.phone || !isValidIndianPhoneNumber(student.phone)) {
        errors.push(`Skipping ${studentName}: Invalid or missing phone number.`);
        errorCount++;
        continue;
      }

      const phoneNumber = `+91${student.phone}`;
      const email = student.email || `${student.phone}@taxshila-auth.com`; // Fallback email
      const password = student.password || student.phone; // Fallback password

      try {
        let userRecord: UserRecord | null = null;
        
        // Check for existing user by email or phone
        try { 
            userRecord = await auth.getUserByEmail(email); 
        } catch (e: any) { 
            if (e.code !== 'auth/user-not-found') throw e; 
        }
        
        if (!userRecord) {
            try { 
                userRecord = await auth.getUserByPhoneNumber(phoneNumber); 
            } catch (e: any) { 
                if (e.code !== 'auth/user-not-found') throw e; 
            }
        }

        if (userRecord) {
          // User exists, link it
          await studentDoc.ref.update({ uid: userRecord.uid, email: userRecord.email || email });
          updatedCount++;
        } else {
          // User does not exist, create it
          const createRequest: CreateRequest = {
            email: email,
            phoneNumber: phoneNumber,
            password: password,
            displayName: studentName,
            photoURL: student.profilePictureUrl || undefined,
            disabled: student.activityStatus === 'Left',
          };
          
          const newUserRecord = await auth.createUser(createRequest);
          // Save the new UID and the generated email back to the database record
          await studentDoc.ref.update({ uid: newUserRecord.uid, email: email });
          createdCount++;
        }
        
      } catch (userError: any) {
        errors.push(`Error processing ${studentName} (${email}): ${userError.message}`);
        errorCount++;
      }
    }

    return NextResponse.json({ success: true, processedCount, updatedCount, createdCount, errorCount, errors });

  } catch (e: any) {
    console.error("User Migration Error:", e);
    return NextResponse.json({ success: false, error: "An unexpected server error occurred during migration." }, { status: 500 });
  }
}
