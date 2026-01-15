
import { NextResponse, type NextRequest } from 'next/server';
import { getDailyAttendanceDetails } from '@/services/attendance-service';
import { getAuth } from '@/lib/firebase-admin';

// Helper to verify the requester is an admin
async function verifyIsAdmin(request: NextRequest): Promise<boolean> {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        // As a fallback, check cookies for a session token (for direct browser access during dev)
        const sessionCookie = request.cookies.get('__session');
        if (sessionCookie?.value) {
            try {
                const decodedToken = await getAuth().verifySessionCookie(sessionCookie.value, true);
                return decodedToken.admin === true;
            } catch (error) {
                console.warn("Session cookie verification failed:", error);
                return false;
            }
        }
        return false;
    }

    try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        return decodedToken.admin === true;
    } catch (error) {
        console.error("Error verifying admin ID token:", error);
        return false;
    }
}

export async function GET(request: NextRequest) {
    // This API route should be protected and only accessible by admins.
    // For now, we will allow it, but in production, you would add authentication checks.
    // const isAuthorized = await verifyIsAdmin(request);
    // if (!isAuthorized) {
    //     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

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
