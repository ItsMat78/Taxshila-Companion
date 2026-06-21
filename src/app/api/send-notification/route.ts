
// src/app/api/send-notification/route.ts

import { NextResponse } from 'next/server';
import { triggerAlertNotification, triggerAdminFeedbackNotification, triggerAdminPaymentVerificationNotification } from '@/services/notification-service';
import type { AlertItem, AlertDispatchResult } from '@/types/communication';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return NextResponse.json({ success: false, error: 'Missing type or payload' }, { status: 400 });
    }

    let result: AlertDispatchResult;
    switch (type) {
      case 'alert':
        result = await triggerAlertNotification(payload as AlertItem);
        break;
      case 'feedback':
        result = await triggerAdminFeedbackNotification(payload.studentName, payload.feedbackType);
        break;
      case 'payment-alert':
        result = await triggerAdminPaymentVerificationNotification(
          payload.studentName,
          payload.studentId,
          payload.amount,
          payload.txnId
        );
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid notification type' }, { status: 400 });
    }

    const delivered = result.fcm.sent + result.oneSignal.sent;
    return NextResponse.json({
      success: true,
      message: delivered > 0
        ? `Notification delivered to ${delivered} of ${result.recipients} recipient(s).`
        : `Notification triggered, but reached 0 of ${result.recipients} recipient(s).`,
      result,
    });

  } catch (error: unknown) {
    console.error(`[API Route (send-notification)] Error:`, error);
    // Return a more descriptive error if possible
    const errorMessage = (error instanceof Error ? error.message : String(error)) || 'An unknown server error occurred.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
