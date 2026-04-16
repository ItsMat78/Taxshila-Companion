
// src/app/api/send-notification/route.ts

import { NextResponse } from 'next/server';
import { triggerAlertNotification, triggerAdminFeedbackNotification, triggerAdminPaymentVerificationNotification } from '@/services/notification-service';
import type { AlertItem } from '@/types/communication';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return NextResponse.json({ success: false, error: 'Missing type or payload' }, { status: 400 });
    }

    switch (type) {
      case 'alert':
        await triggerAlertNotification(payload as AlertItem);
        break;
      case 'feedback':
        await triggerAdminFeedbackNotification(payload.studentName, payload.feedbackType);
        break;
      case 'payment-alert':
        await triggerAdminPaymentVerificationNotification(
          payload.studentName,
          payload.studentId,
          payload.amount,
          payload.txnId
        );
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Notification triggered successfully.' });

  } catch (error: unknown) {
    console.error(`[API Route (send-notification)] Error:`, error);
    // Return a more descriptive error if possible
    const errorMessage = (error instanceof Error ? error.message : String(error)) || 'An unknown server error occurred.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
