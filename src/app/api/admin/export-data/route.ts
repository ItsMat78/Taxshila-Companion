
import { NextResponse } from 'next/server';
import { getDb, getAuth } from '@/lib/firebase-admin';
import JSZip from 'jszip';
import { Parser } from 'json2csv';
import { Student, PaymentRecord } from '@/types/student';

async function fetchCollectionData(collectionName: string) {
    const db = getDb();
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
}

async function fetchAllAuthUsers() {
    const auth = getAuth();
    const userRecords = [];
    let pageToken;
    do {
        const listUsersResult = await auth.listUsers(1000, pageToken);
        userRecords.push(...listUsersResult.users);
        pageToken = listUsersResult.pageToken;
    } while (pageToken);

    return userRecords.map(u => ({
        uid: u.uid,
        email: u.email,
        phone: u.phoneNumber,
        name: u.displayName,
        disabled: u.disabled,
        creationTime: u.metadata.creationTime,
        lastSignInTime: u.metadata.lastSignInTime
    }));
}

function toCsv(data: any[], fields: string[]): string {
    if (!data || data.length === 0) return 'No data available.';
    try {
        const parser = new Parser({ fields });
        return parser.parse(data);
    } catch (error) {
        console.error("Error converting to CSV:", error);
        return 'Error converting data to CSV.';
    }
}

export async function GET() {
    try {
        const zip = new JSZip();

        // 1. Fetch Firestore data
        const students = await fetchCollectionData('students') as Student[];
        const attendance = await fetchCollectionData('attendanceRecords');
        const feedback = await fetchCollectionData('feedbackItems');
        
        // Flatten payment history into its own table with student identifiers
        const payments = students.flatMap(s => 
            (s.paymentHistory || []).map((p: PaymentRecord) => ({ 
                studentId: s.studentId, 
                studentName: s.name, 
                ...p 
            }))
        );

        // 2. Fetch Auth data
        const authUsers = await fetchAllAuthUsers();

        // 3. Define complete fields and Convert to CSV
        const studentFields = [
            'uid', 'studentId', 'name', 'email', 'phone', 'address', 'shift', 'seatNumber', 
            'activityStatus', 'feeStatus', 'amountDue', 'registrationDate', 'lastPaymentDate', 
            'nextDueDate', 'leftDate', 'profilePictureUrl', 'idCardFileName'
        ];
        const attendanceFields = ['studentId', 'date', 'checkInTime', 'checkOutTime'];
        const paymentFields = ['studentId', 'studentName', 'paymentId', 'date', 'amount', 'method', 'transactionId'];
        const feedbackFields = ['studentId', 'studentName', 'type', 'message', 'status', 'dateSubmitted'];
        const authUserFields = ['uid', 'name', 'email', 'phone', 'disabled', 'creationTime', 'lastSignInTime'];

        // Add to Zip
        zip.file('students.csv', toCsv(students, studentFields));
        zip.file('attendance.csv', toCsv(attendance, attendanceFields));
        zip.file('payments.csv', toCsv(payments, paymentFields));
        zip.file('feedback.csv', toCsv(feedback, feedbackFields));
        zip.file('auth_users.csv', toCsv(authUsers, authUserFields));

        // 5. Generate Zip blob
        const content = await zip.generateAsync({ type: 'nodebuffer' });

        return new NextResponse(content, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="taxshila-backup-${new Date().toISOString().split('T')[0]}.zip"`,
            },
        });

    } catch (error: any) {
        console.error("Export Error:", error);
        return NextResponse.json({ success: false, error: "Failed to export data." }, { status: 500 });
    }
}