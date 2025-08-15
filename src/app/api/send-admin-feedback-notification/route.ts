
import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb, getMessaging } from '@/lib/firebase-admin';

interface FeedbackNotificationPayload {
  studentName: string;
  messageSnippet: string;
  feedbackId: string;
}

interface AdminDoc {
  fcmTokens?: string[];
  firestoreId: string;
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const messaging = getMessaging();
    let payload: FeedbackNotificationPayload;

    try {
      payload = await request.json();
    } catch (e) {
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }

    const adminsSnapshot = await db.collection("admins").get();
    if (adminsSnapshot.empty) {
       return NextResponse.json({ success: true, message: "No admin tokens found to send notification to." });
    }
    
    const adminsWithTokens = adminsSnapshot.docs
      .map(doc => ({ firestoreId: doc.id, ...doc.data() } as AdminDoc))
      .filter(admin => admin.fcmTokens && admin.fcmTokens.length > 0);

    const allTokens = adminsWithTokens.flatMap(a => a.fcmTokens!);
    if (allTokens.length === 0) {
      return NextResponse.json({ success: true, message: "No admin tokens found to send notification to." });
    }

    const uniqueTokens = [...new Set(allTokens)];
    
    const notificationPayload = {
      title: "New Feedback Submitted",
      body: `From: ${payload.studentName} - "${payload.messageSnippet}"`,
      icon: "/logo.png",
    };

    const messageToSend = {
      tokens: uniqueTokens,
      data: { ...notificationPayload, url: '/admin/feedback' }, // Add URL for click action
    };

    const response = await messaging.sendEachForMulticast(messageToSend);
    
    const tokensToRemove: string[] = [];
    response.responses.forEach((result, index) => {
      const error = result.error;
      if (error) {
        if (error.code === 'messaging/registration-token-not-registered' || 
            error.code === 'messaging/invalid-registration-token') {
          tokensToRemove.push(uniqueTokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
        const batch = db.batch();
        adminsWithTokens.forEach(admin => {
            const hasInvalidToken = admin.fcmTokens?.some(token => tokensToRemove.includes(token));
            if(hasInvalidToken) {
                const adminRef = db.collection('admins').doc(admin.firestoreId);
                batch.update(adminRef, { fcmTokens: FieldValue.arrayRemove(...tokensToRemove) });
            }
        });
        await batch.commit();
    }

    return NextResponse.json({ success: true, message: `Admin notifications sent. Success: ${response.successCount}, Failures: ${response.failureCount}.` });

  } catch (error: any) {
    console.error("API Route (Admin Feedback): Error processing request:", error.message, error.stack);
    return NextResponse.json({ success: false, error: "An unexpected server error occurred." }, { status: 500 });
  }
}
