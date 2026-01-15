'use server';

import { getDailyAttendanceDetails } from '@/services/attendance-service';
import type { DailyAttendanceDetail } from '@/services/attendance-service';
import { format } from 'date-fns';

export async function getAttendanceForDateAction(date: Date): Promise<DailyAttendanceDetail[]> {
    if (!date) {
        return [];
    }
    const dateString = format(date, 'yyyy-MM-dd');
    try {
        const details = await getDailyAttendanceDetails(dateString);
        return details;
    } catch (error) {
        console.error("Server Action Error: Failed to fetch daily attendance:", error);
        // In a real app, you might want to return a more structured error
        // but for now, returning empty is safe for the client.
        return [];
    }
}
