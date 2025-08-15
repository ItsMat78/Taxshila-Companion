
import { NextResponse, type NextRequest } from 'next/server';
import { getDb, getMessaging } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { MulticastMessage } from 'firebase-admin/messaging';

interface FeedbackNotificationPayload {
  studentName: string;
  messageSnippet: string;
  feedbackId: string;
}

interface AdminDoc {
  fcmTokens?: string[];
}

export async function POST(request: NextRequest) {
  // All push notification logic has been removed from this endpoint.
  // It can be restored or rebuilt here.
  return NextResponse.json({ success: true, message: "Notification endpoint is currently disabled." });
}
