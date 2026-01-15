
import { NextResponse, type NextRequest } from 'next/server';
import { getDailyAttendanceDetails } from '@/services/attendance-service';
import { getAuth } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    
    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
    }

    try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        if (!decodedToken.admin) {
             return NextResponse.json({ error: 'Unauthorized: Not an admin.' }, { status: 403 });
        }
    } catch (error) {
        console.error("Error verifying admin ID token:", error);
        return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'A valid date in YYYY-MM-DD format is required.' }, { status: 400 });
    }

    try {
        const attendanceDetails = await getDailyAttendanceDetails(date);
        return NextResponse.json(attendanceDetails);
    } catch (error: any) {
        console.error(`[API /admin/attendance] Error fetching details for date ${date}:`, error);
        return NextResponse.json({ error: 'Failed to fetch attendance details.', details: error.message }, { status: 500 });
    }
}
