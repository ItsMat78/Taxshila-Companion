
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  // All push notification logic has been removed from this endpoint.
  // It can be restored or rebuilt here.
  return NextResponse.json({ success: true, message: "Notification endpoint is currently disabled." });
}
