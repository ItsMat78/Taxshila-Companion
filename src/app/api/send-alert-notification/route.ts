

// This file is no longer used and can be removed. 
// The notification logic is now handled directly in notification-service.ts
// which is a server-only module. This avoids the need for an extra API route.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({ success: true, message: "This endpoint is deprecated. Logic moved to notification-service." });
}
