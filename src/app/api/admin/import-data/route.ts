
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { Student } from '@/types/student';

// This is a simplified 'upsert' function. 
// In a real-world scenario, you'd add more robust error handling and validation.
async function upsertStudents(data: any[]) {
    const db = getDb();
    const batch = db.batch();
    const studentsRef = db.collection('students');
    let count = 0;

    for (const record of data) {
        // Find student by studentId, which should be unique
        const q = studentsRef.where('studentId', '==', record.studentId);
        const snapshot = await q.get();

        const dataToSave: Partial<Student> = { ...record };
        
        // Convert string numbers to actual numbers if necessary
        if (dataToSave.seatNumber) dataToSave.seatNumber = String(dataToSave.seatNumber);

        if (snapshot.empty) {
            // INSERT: Document doesn't exist, so we create it.
            const newDocRef = studentsRef.doc(); // Firestore auto-generates an ID
            batch.set(newDocRef, dataToSave);
        } else {
            // UPDATE: Document exists, so we update it.
            const docRef = snapshot.docs[0].ref;
            batch.update(docRef, dataToSave);
        }
        count++;
    }
    await batch.commit();
    return count;
}

// A simple function to add attendance records. It doesn't check for duplicates.
async function insertAttendance(data: any[]) {
    const db = getDb();
    const batch = db.batch();
    const attendanceRef = db.collection('attendanceRecords');
    let count = 0;

    for (const record of data) {
        const newDocRef = attendanceRef.doc();
        batch.set(newDocRef, record);
        count++;
    }
    await batch.commit();
    return count;
}


export async function POST(request: Request) {
    try {
        const { type, data } = await request.json();

        if (!type || !data || !Array.isArray(data)) {
            return NextResponse.json({ success: false, error: 'Invalid request body. "type" and "data" array are required.' }, { status: 400 });
        }

        let count = 0;
        switch (type) {
            case 'students':
                count = await upsertStudents(data);
                break;
            case 'attendance':
                count = await insertAttendance(data);
                break;
            // The 'payments' case is more complex because it's nested.
            // A dedicated function would be needed to find the correct student
            // and append the payment to their paymentHistory array.
            // This is omitted for simplicity here but is important for a full solution.
            case 'payments':
                return NextResponse.json({ success: false, error: 'Payment import is not yet supported by this endpoint.' }, { status: 501 });
            default:
                return NextResponse.json({ success: false, error: 'Invalid import type specified.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `Successfully imported ${count} ${type} records.` });

    } catch (error: any) {
        console.error(`Import API Error for type:`, error);
        return NextResponse.json({ success: false, error: 'An unexpected server error occurred.' }, { status: 500 });
    }
}
