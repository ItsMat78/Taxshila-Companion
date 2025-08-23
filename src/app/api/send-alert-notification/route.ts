

import { NextResponse, type NextRequest } from 'next/server';
import { triggerAlertNotification } from '@/services/notification-service';
import type { AlertItem } from '@/types/communication';

export async function POST(request: NextRequest) {
  console.log('[API Route (send-alert-notification)] Received a request.');
  try {
    const alertData: AlertItem = await request.json();
    console.log('[API Route (send-alert-notification)] Parsed request body:', alertData);

    // Basic validation
    if (!alertData || !alertData.title || !alertData.message) {
      console.error('[API Route (send-alert-notification)] Invalid alert data received.');
      return NextResponse.json({ success: false, error: "Invalid alert data provided." }, { status: 400 });
    }

    // Offload the actual notification logic to the service
    await triggerAlertNotification(alertData);

    console.log('[API Route (send-alert-notification)] Notification trigger function completed successfully.');
    return NextResponse.json({ success: true, message: "Notification triggered successfully." });
    
  } catch (error: any) {
    console.error("[API Route (send-alert-notification)] Error:", error);
    
    if (error.message.includes("Firebase Admin SDK is not configured properly")) {
        return NextResponse.json({ success: false, error: "Server configuration error: Firebase Admin SDK credentials are missing or invalid." }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: "An unexpected server error occurred." }, { status: 500 });
  }
}
