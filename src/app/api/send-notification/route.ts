
// src/app/api/send-notification/route.ts

import { NextResponse } from 'next/server';
import { triggerAlertNotification, triggerAdminFeedbackNotification } from '@/services/notification-service';
import type { AlertItem } from '@/types/communication';

export async function POST(request: Request) {
  console.log('[API Route (send-notification)] Received a request.');
  try {
    const body = await request.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return NextResponse.json({ success: false, error: 'Missing type or payload' }, { status: 400 });
    }
    
    console.log(`[API Route (send-notification)] Request type: ${type}`);

    switch (type) {
      case 'alert':
        await triggerAlertNotification(payload as AlertItem);
        break;
      case 'feedback':
        await triggerAdminFeedbackNotification(payload.studentName, payload.feedbackType);
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Notification triggered successfully.' });

  } catch (error: any) {
    console.error(`[API Route (send-notification)] Error:`, error);
    // Return a more descriptive error if possible
    const errorMessage = error.message || 'An unknown server error occurred.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
