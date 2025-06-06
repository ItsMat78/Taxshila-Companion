
import { NextResponse, type NextRequest } from 'next/server';
import * as admin from 'firebase-admin';
// import { Timestamp } from 'firebase-admin/firestore'; // Not strictly needed here unless constructing new Timestamps

// Define types for expected request and Firestore data
interface AlertPayload {
  alertId: string;
  title: string;
  message: string;
  type: string;
  studentId?: string; // For targeted alerts
  originalFeedbackId?: string;
  originalFeedbackMessageSnippet?: string;
}

interface StudentDoc {
  studentId: string;
  fcmTokens?: string[];
  // other fields
}

// Initialize Firebase Admin SDK
// Ensure your service account JSON is handled via environment variables on Vercel
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// For FIREBASE_PRIVATE_KEY, when pasting into Vercel, ensure newlines `\n` are preserved literally.
try {
  if (!admin.apps.length) {
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKeyRaw) {
      throw new Error("FIREBASE_PRIVATE_KEY environment variable is not set.");
    }
    // Replace literal \n with actual newlines for the private key
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log("Firebase Admin SDK initialized in API route /api/send-alert-notification.");
  }
} catch (e: any) {
  console.error('Firebase Admin SDK initialization error in API route /api/send-alert-notification:', e.message);
  // Do not throw here, allow the POST handler to respond with an error if SDK isn't ready
}

const getDb = () => {
  if (!admin.apps.length) {
    // This case should ideally not be hit if initialization was successful.
    // Log an error and potentially re-attempt initialization or throw a more specific error.
    console.error("Firebase Admin SDK not initialized when getDb() was called.");
    // You might re-attempt initialization here or throw if it's critical.
    // For now, we'll let it proceed and Firestore calls will likely fail if not initialized.
  }
  return admin.firestore();
};


export async function POST(request: NextRequest) {
  if (!admin.apps.length) {
    console.error("API route called but Firebase Admin SDK is not initialized.");
    return NextResponse.json({ success: false, error: "Firebase Admin SDK not initialized. Check server logs." }, { status: 500 });
  }
  const db = getDb();

  try {
    const alertPayload = (await request.json()) as AlertPayload;
    console.log("API route /api/send-alert-notification received alert payload:", alertPayload);

    let tokens: string[] = [];

    if (alertPayload.studentId) {
      // Targeted alert
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
          console.log(`Targeted alert for student ${alertPayload.studentId}. Tokens found:`, tokens.length);
        } else {
          console.log(`Student ${alertPayload.studentId} found, but no FCM tokens.`);
        }
      } else {
        console.log(`Student ${alertPayload.studentId} not found for targeted alert.`);
        return NextResponse.json({ message: `Student ${alertPayload.studentId} not found, notification not sent.` }, { status: 200 });
      }
    } else {
      // General alert
      const allStudentsSnapshot = await db.collection("students").get();
      allStudentsSnapshot.forEach((studentDoc) => {
        const student = studentDoc.data() as StudentDoc;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens.push(...student.fcmTokens);
        }
      });
      console.log("General alert. Total tokens found:", tokens.length);
    }

    if (tokens.length === 0) {
      console.log("No FCM tokens found to send notification to.");
      return NextResponse.json({ message: "No FCM tokens found for any recipients." }, { status: 200 });
    }

    const uniqueTokens = [...new Set(tokens)];

    const fcmPayloadData: { [key: string]: string } = {
      title: alertPayload.title,
      body: alertPayload.message,
      icon: "/logo.png",
      url: "/member/alerts",
      alertId: alertPayload.alertId,
      alertType: alertPayload.type,
    };
    if (alertPayload.originalFeedbackId) {
        fcmPayloadData.originalFeedbackId = alertPayload.originalFeedbackId;
    }
    if (alertPayload.originalFeedbackMessageSnippet) {
        fcmPayloadData.originalFeedbackMessageSnippet = alertPayload.originalFeedbackMessageSnippet;
    }
    
    const fcmMessagePayload = {
      data: fcmPayloadData,
      // notification: { // Optional: if you want FCM to display notification directly when app is in background
      //   title: alertPayload.title,
      //   body: alertPayload.message,
      //   icon: "/logo.png",
      // }
    };

    console.log("Sending FCM message via Admin SDK to", uniqueTokens.length, "tokens. Payload (data part):", JSON.stringify(fcmPayloadData).substring(0,100) + "...");
    
    // Using sendEachForMulticast for better error handling per token
    const response = await admin.messaging().sendEachForMulticast({
        tokens: uniqueTokens,
        data: fcmPayloadData,
        // notification: fcmMessagePayload.notification // if you use it
    });
    
    console.log("FCM send response: Successes:", response.successCount, "Failures:", response.failureCount);
    
    // Basic token cleanup (can be more sophisticated if needed)
    const tokensToRemovePromises: Promise<void>[] = [];
    response.responses.forEach((result, index) => {
        if (!result.success) {
            const errorCode = result.error?.code;
            console.error(`Failed to send to token (index ${index}): ${uniqueTokens[index].substring(0,10)}... Error: ${errorCode} - ${result.error?.message}`);
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              // This token is invalid, find the student and remove it
              // This is a simplified example; a more robust solution might involve a specific function
              // to find and remove the token from the student's fcmTokens array.
              // For now, we'll just log it.
              console.log(`Consider removing invalid token: ${uniqueTokens[index]}`);
            }
        }
    });
    // await Promise.all(tokensToRemovePromises); // If you implement actual removal

    return NextResponse.json({ success: true, message: `Notifications sent: ${response.successCount}, Failed: ${response.failureCount}.` });

  } catch (error: any) {
    console.error("Error in /api/send-alert-notification:", error.message, error.stack);
    return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
