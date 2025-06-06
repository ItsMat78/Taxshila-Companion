
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
  console.error('API Route: Firebase Admin SDK initialization error:', e.message);
}

const getDb = () => {
  if (!admin.apps.length) {
    console.error("API Route: Firebase Admin SDK not initialized when getDb() was called.");
    throw new Error("Firebase Admin SDK not initialized.");
  }
  return admin.firestore();
};


export async function POST(request: NextRequest) {
  console.log("API Route: /api/send-alert-notification POST request received.");
  if (!admin.apps.length) {
    console.error("API Route: Firebase Admin SDK is not initialized. Cannot process request.");
    return NextResponse.json({ success: false, error: "Firebase Admin SDK not initialized on server. Check Vercel logs and environment variables." }, { status: 500 });
  }
  
  const db = getDb();
  let alertPayload: AlertPayload;

  try {
    alertPayload = (await request.json()) as AlertPayload;
    console.log("API Route: Received alert payload:", JSON.stringify(alertPayload));
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
          tokens = student.fcmTokens;
          console.log(`API Route: Tokens found for student ${alertPayload.studentId}: ${tokens.length}`);
        } else {
          console.log(`API Route: Student ${alertPayload.studentId} found, but no FCM tokens.`);
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
          tokens.push(...student.fcmTokens);
        }
      });
      console.log("API Route: Total tokens found for general alert:", tokens.length);
    }

    if (tokens.length === 0) {
      console.log("API Route: No FCM tokens found to send notification to.");
      return NextResponse.json({ success: true, message: "No FCM tokens found for any recipients." }, { status: 200 });
    }

    const uniqueTokens = [...new Set(tokens)];
    console.log("API Route: Unique tokens to send to:", uniqueTokens.length);

    const fcmPayloadData: { [key: string]: string } = {
      title: alertPayload.title,
      body: alertPayload.message,
      icon: "/logo.png", // Ensure this path is accessible by the service worker
      url: "/member/alerts", // Path for your app to open on click
      alertId: alertPayload.alertId,
      alertType: alertPayload.type,
    };
    if (alertPayload.originalFeedbackId) {
        fcmPayloadData.originalFeedbackId = alertPayload.originalFeedbackId;
    }
    if (alertPayload.originalFeedbackMessageSnippet) {
        fcmPayloadData.originalFeedbackMessageSnippet = alertPayload.originalFeedbackMessageSnippet;
    }
    
    console.log("API Route: Sending FCM message via Admin SDK. Data payload:", JSON.stringify(fcmPayloadData));
    
    const response = await admin.messaging().sendEachForMulticast({
        tokens: uniqueTokens,
        data: fcmPayloadData,
    });
    
    console.log("API Route: FCM send response: Successes:", response.successCount, "Failures:", response.failureCount);
    
    response.responses.forEach((result, index) => {
        if (!result.success) {
            const errorCode = result.error?.code;
            console.error(`API Route: Failed to send to token (index ${index}): ${uniqueTokens[index].substring(0,10)}... Error: ${errorCode} - ${result.error?.message}`);
        }
    });

    return NextResponse.json({ success: true, message: `Notifications attempt summary: Successes: ${response.successCount}, Failures: ${response.failureCount}.` });

  } catch (error: any) {
    console.error("API Route: Error processing send-alert-notification:", error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || "An unexpected server error occurred." }, { status: 500 });
  }
}
