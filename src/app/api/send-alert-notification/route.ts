
import { NextResponse, type NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

interface AlertPayload {
  alertId: string;
  title: string;
  message: string;
  type: string;
  studentId?: string; 
  originalFeedbackId?: string;
  originalFeedbackMessageSnippet?: string;
}

interface StudentDoc {
  studentId: string;
  fcmTokens?: string[];
}

try {
  if (!admin.apps.length) {
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKeyRaw) {
      console.error("API Route: FIREBASE_PRIVATE_KEY environment variable is NOT SET. Admin SDK cannot initialize.");
      throw new Error("FIREBASE_PRIVATE_KEY environment variable is not set.");
    }
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    console.log("API Route: Attempting to initialize Firebase Admin SDK...");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("API Route: Firebase Admin SDK initialized successfully.");
  }
} catch (e: any) {
  console.error('API Route: Firebase Admin SDK initialization error:', e.message, e);
}

const getDb = () => {
  if (!admin.apps.length) {
    console.error("API Route: Firebase Admin SDK not initialized when getDb() was called.");
    throw new Error("Firebase Admin SDK not initialized. This is a server-side configuration issue.");
  }
  return admin.firestore();
};


export async function POST(request: NextRequest) {
  console.log("API Route: /api/send-alert-notification POST request received.");
  if (!admin.apps.length) {
    console.error("API Route: Firebase Admin SDK is not initialized. Cannot process request. Check Vercel environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) and ensure they are correct, especially the private key format (including \\n).");
    return NextResponse.json({ success: false, error: "Firebase Admin SDK not initialized on server. Check Vercel logs and environment variables." }, { status: 500 });
  }
  
  let db;
  try {
    db = getDb();
  } catch (dbError: any) {
    console.error("API Route: Error getting Firestore instance:", dbError.message);
    return NextResponse.json({ success: false, error: "Failed to connect to database." }, { status: 500 });
  }
  
  let alertPayload: AlertPayload;

  try {
    alertPayload = (await request.json()) as AlertPayload;
    console.log("API Route: Received alert payload:", JSON.stringify(alertPayload, null, 2));
  } catch (parseError: any) {
    console.error("API Route: Error parsing request JSON:", parseError.message);
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    let tokens: string[] = [];

    if (alertPayload.studentId) {
      console.log(`API Route: Targeted alert for student ${alertPayload.studentId}. Fetching token...`);
      const studentQuery = await db
        .collection("students")
        .where("studentId", "==", alertPayload.studentId)
        .limit(1)
        .get();

      if (!studentQuery.empty) {
        const studentDoc = studentQuery.docs[0];
        const student = studentDoc.data() as StudentDoc;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens = student.fcmTokens.filter(token => typeof token === 'string' && token.length > 0); // Ensure tokens are valid strings
          console.log(`API Route: Tokens found for student ${alertPayload.studentId}:`, tokens);
        } else {
          console.log(`API Route: Student ${alertPayload.studentId} found, but no FCM tokens or empty tokens array.`);
        }
      } else {
        console.log(`API Route: Student ${alertPayload.studentId} not found for targeted alert.`);
        return NextResponse.json({ success: true, message: `Student ${alertPayload.studentId} not found, notification not sent.` }, { status: 200 });
      }
    } else {
      console.log("API Route: General alert. Fetching tokens for all students...");
      const allStudentsSnapshot = await db.collection("students").get();
      allStudentsSnapshot.forEach((studentDoc) => {
        const student = studentDoc.data() as StudentDoc;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens.push(...student.fcmTokens.filter(token => typeof token === 'string' && token.length > 0));
        }
      });
      console.log("API Route: Total tokens found for general alert (before unique):", tokens.length);
    }

    if (tokens.length === 0) {
      console.log("API Route: No valid FCM tokens found to send notification to.");
      return NextResponse.json({ success: true, message: "No FCM tokens found for any recipients." }, { status: 200 });
    }

    const uniqueTokens = [...new Set(tokens)];
    console.log("API Route: Unique tokens to send to:", uniqueTokens);
    if (uniqueTokens.length === 0) {
        console.log("API Route: After filtering, no unique valid FCM tokens left.");
        return NextResponse.json({ success: true, message: "No unique valid FCM tokens for recipients." }, { status: 200 });
    }


    const fcmPayloadData: { [key: string]: string } = {
      title: alertPayload.title,
      body: alertPayload.message,
      icon: "/logo.png", 
      url: "/member/alerts", 
      alertId: alertPayload.alertId,
      alertType: alertPayload.type,
      // Add other custom data fields if needed
    };
    if (alertPayload.originalFeedbackId) {
        fcmPayloadData.originalFeedbackId = alertPayload.originalFeedbackId;
    }
    if (alertPayload.originalFeedbackMessageSnippet) {
        fcmPayloadData.originalFeedbackMessageSnippet = alertPayload.originalFeedbackMessageSnippet;
    }
    
    console.log("API Route: Sending FCM message via Admin SDK. Data payload:", JSON.stringify(fcmPayloadData, null, 2));
    
    const messageToSend: admin.messaging.MulticastMessage = {
        tokens: uniqueTokens,
        data: fcmPayloadData,
        // You can also add 'notification' field here if you want FCM to handle display when app is in background for some platforms
        // notification: {
        //   title: alertPayload.title,
        //   body: alertPayload.message,
        //   icon: "/logo.png",
        // },
        // android: { // Example: Android specific config
        //   priority: "high",
        // },
        // apns: { // Example: APNS specific config
        //   payload: {
        //     aps: {
        //       sound: "default",
        //       badge: 1, // Example badge count
        //     },
        //   },
        // },
    };

    const response = await admin.messaging().sendEachForMulticast(messageToSend);
    
    console.log("API Route: FCM send response: Successes:", response.successCount, "Failures:", response.failureCount);
    
    response.responses.forEach((result, index) => {
        if (result.success) {
            console.log(`API Route: Successfully sent to token (index ${index}): ${uniqueTokens[index].substring(0,10)}... Message ID: ${result.messageId}`);
        } else {
            const errorCode = result.error?.code;
            console.error(`API Route: Failed to send to token (index ${index}): ${uniqueTokens[index].substring(0,10)}... Error: ${errorCode} - ${result.error?.message}`);
            // Potentially handle token cleanup here if error indicates token is invalid (e.g., 'messaging/invalid-registration-token')
        }
    });

    return NextResponse.json({ success: true, message: `Notifications attempt summary: Successes: ${response.successCount}, Failures: ${response.failureCount}.` });

  } catch (error: any) {
    console.error("API Route: Error processing send-alert-notification:", error.message, error.stack, error);
    return NextResponse.json({ success: false, error: error.message || "An unexpected server error occurred." }, { status: 500 });
  }
}
