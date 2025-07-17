
import { NextResponse, type NextRequest } from 'next/server';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface FeedbackNotificationPayload {
  studentName: string;
  messageSnippet: string;
  feedbackId: string;
}

interface AdminDoc {
  fcmTokens?: string[];
}

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!privateKey || !clientEmail || !projectId) {
    console.error("[API Route (Admin Feedback)] Missing Firebase Admin credentials in environment.");
    throw new Error("Server configuration error: Missing Firebase Admin environment variables.");
  }
  
  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error(`[API Route (Admin Feedback)] Firebase Admin SDK initialization error: ${error.message}`);
    throw new Error(`Could not initialize Firebase Admin SDK. Check your .env file. Internal error: ${error.message}`);
  }
}

const getDb = () => {
  initializeFirebaseAdmin();
  return admin.firestore();
};

export async function POST(request: NextRequest) {
  console.log("API Route: /api/send-admin-feedback-notification POST request received.");
  try {
    initializeFirebaseAdmin();
  } catch(e) {
    console.error("API Route (Admin Feedback): Firebase Admin SDK not initialized.");
    return NextResponse.json({ success: false, error: "Server configuration error." }, { status: 500 });
  }

  const db = getDb();
  let payload: FeedbackNotificationPayload;

  try {
    payload = await request.json();
     console.log("API Route (Admin Feedback): Received payload:", JSON.stringify(payload, null, 2));
  } catch (e) {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    let adminTokens: string[] = [];
    const adminsSnapshot = await db.collection("admins").get();
    adminsSnapshot.forEach((doc) => {
      const adminData = doc.data() as AdminDoc;
      if (adminData.fcmTokens && adminData.fcmTokens.length > 0) {
        adminTokens.push(...adminData.fcmTokens);
      }
    });

    if (adminTokens.length === 0) {
      console.log("API Route (Admin Feedback): No admin tokens found to send notification to.");
      return NextResponse.json({ success: true, message: "No admin tokens found to send notification to." }, { status: 200 });
    }

    const uniqueTokens = [...new Set(adminTokens)];
    console.log("API Route (Admin Feedback): Unique admin tokens found:", uniqueTokens.length);
    
    const notificationPayload = {
      title: "New Feedback Submitted",
      body: `From: ${payload.studentName} - "${payload.messageSnippet}"`,
      icon: "/logo.png",
      url: "/admin/feedback",
      feedbackId: payload.feedbackId,
    };

    const messageToSend: admin.messaging.MulticastMessage = {
      tokens: uniqueTokens,
      data: notificationPayload,
    };

    const response = await admin.messaging().sendEachForMulticast(messageToSend);
    console.log("API Route (Admin Feedback): FCM response: Successes:", response.successCount, "Failures:", response.failureCount);

    // Handle invalid token cleanup
    const cleanupPromises = response.responses.map(async (result, index) => {
        const currentToken = uniqueTokens[index];
        if (!result.success) {
            const errorCode = result.error?.code;
            console.error(`API Route (Admin Feedback): Failed to send to token ${currentToken.substring(0,10)}... Error: ${errorCode}`);
            if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
                const adminsWithTokenQuery = db.collection('admins').where('fcmTokens', 'array-contains', currentToken);
                const querySnapshot = await adminsWithTokenQuery.get();
                if (!querySnapshot.empty) {
                    const batch = db.batch();
                    querySnapshot.forEach(doc => {
                        console.log(`API Route (Admin Feedback): Removing invalid token from admin document ${doc.id}`);
                        batch.update(doc.ref, { fcmTokens: FieldValue.arrayRemove(currentToken) });
                    });
                    await batch.commit();
                }
            }
        }
    });

    await Promise.all(cleanupPromises);

    return NextResponse.json({ success: true, message: `Admin notifications sent. Success: ${response.successCount}, Failures: ${response.failureCount}.` });

  } catch (error: any) {
    console.error("API Route (Admin Feedback): Error processing request:", error.message, error.stack);
    return NextResponse.json({ success: false, error: "An unexpected server error occurred." }, { status: 500 });
  }
}
