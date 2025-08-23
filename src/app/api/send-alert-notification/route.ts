

import { NextResponse, type NextRequest } from 'next/server';
import { triggerAlertNotification } from '@/services/notification-service';
import type { AlertItem } from '@/types/communication';

export async function POST(request: NextRequest) {
  try {
    const alertData: AlertItem = await request.json();

    // Basic validation
    if (!alertData || !alertData.title || !alertData.message) {
      return NextResponse.json({ success: false, error: "Invalid alert data provided." }, { status: 400 });
    }

    // Offload the actual notification logic to the service
    await triggerAlertNotification(alertData);

    return NextResponse.json({ success: true, message: "Notification triggered successfully." });
    
  } catch (error: any) {
    console.error("[API Route (send-alert-notification)] Error:", error);
    
    if (error.message.includes("Firebase Admin SDK is not configured properly")) {
        return NextResponse.json({ success: false, error: "Server configuration error: Firebase Admin SDK credentials are missing or invalid." }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: "An unexpected server error occurred." }, { status: 500 });
  }
}
