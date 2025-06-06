import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore'; // Import Timestamp
import type { Student, AlertItem as ClientAlertItem } from '@/types/student'; // Assuming AlertItem might be defined elsewhere or use client type

// Define types for Firebase Admin SDK data (similar to client types but using admin.firestore.Timestamp)
interface AdminAlertItem {
  id?: string;
  studentId?: string;
  title: string;
  message: string;
  type: "info" | "warning" | "closure" | "feedback_response";
  dateSent: admin.firestore.Timestamp;
  isRead?: boolean;
  originalFeedbackId?: string;
  originalFeedbackMessageSnippet?: string;
}

interface AdminStudent {
  studentId: string;
  fcmTokens?: string[];
  // other fields if needed by the function
}


// Initialize Firebase Admin SDK
// Ensure your Vercel environment variables are set for these
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID!,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully in API route.");
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error in API route:", error.message);
  }
}

const db = admin.firestore();

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { alertId, targetStudentId } = body;

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    console.log(`API: Received request to send notification for alertId: ${alertId}, targetStudentId: ${targetStudentId || 'all'}`);

    const alertDocRef = db.collection('alertItems').doc(alertId);
    const alertDocSnap = await alertDocRef.get();

    if (!alertDocSnap.exists) {
      console.error(`API: Alert with ID ${alertId} not found.`);
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const alertData = alertDocSnap.data() as AdminAlertItem;
    console.log("API: Fetched alert data:", alertData);

    let tokens: string[] = [];

    if (targetStudentId) {
      // Targeted alert
      const studentQuery = await db
        .collection("students")
        .where("studentId", "==", targetStudentId)
        .limit(1)
        .get();

      if (!studentQuery.empty) {
        const studentDoc = studentQuery.docs[0];
        const student = studentDoc.data() as AdminStudent;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens = student.fcmTokens;
        }
        console.log(`API: Targeted alert for student ${targetStudentId}. Found ${tokens.length} tokens.`);
      } else {
        console.log(`API: Student ${targetStudentId} not found for targeted alert.`);
      }
    } else if (alertData.studentId) {
        // This case handles if targetStudentId was not passed in body but alert has one (e.g., feedback response)
        const studentQuery = await db
        .collection("students")
        .where("studentId", "==", alertData.studentId)
        .limit(1)
        .get();
        if (!studentQuery.empty) {
            const student = studentQuery.docs[0].data() as AdminStudent;
            if (student.fcmTokens && student.fcmTokens.length > 0) tokens = student.fcmTokens;
             console.log(`API: Alert has studentId ${alertData.studentId}. Found ${tokens.length} tokens.`);
        }
    } else {
      // General alert - send to all active students who have FCM tokens
      const allStudentsSnapshot = await db.collection("students").where("activityStatus", "==", "Active").get();
      allStudentsSnapshot.forEach((studentDoc) => {
        const student = studentDoc.data() as AdminStudent;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens.push(...student.fcmTokens);
        }
      });
      console.log(`API: General alert. Total unique tokens found: ${new Set(tokens).size}`);
    }

    if (tokens.length === 0) {
      console.log("API: No FCM tokens found to send notification to.");
      return NextResponse.json({ message: 'Alert saved, but no recipients for push notification.' }, { status: 200 });
    }

    const uniqueTokens = [...new Set(tokens)];

    const payload = {
      data: {
        title: alertData.title,
        body: alertData.message,
        icon: "/logo.png", // Path relative to your PWA's public folder
        url: alertData.type === 'feedback_response' ? "/member/alerts" : "/member/alerts", // Or specific based on type
        alertId: alertId,
        alertType: alertData.type,
        // Add other custom data if your service worker/app needs it
      },
    };
    
    console.log("API: Preparing to send FCM message. Payload:", payload, "Tokens count:", uniqueTokens.length);

    const response = await admin.messaging().sendToDevice(uniqueTokens, payload);
    console.log('API: FCM sendToDevice response:', JSON.stringify(response, null, 2));

    // Basic error handling for FCM response
    let successCount = response.successCount;
    let failureCount = response.failureCount;
    
    if (failureCount > 0) {
      console.warn(`API: ${failureCount} messages failed to send.`);
      // Optionally, implement logic to clean up invalid tokens here
      // This is more complex as it requires querying students by token
    }

    return NextResponse.json({ 
        message: 'Push notification process initiated.',
        successCount,
        failureCount 
    }, { status: 200 });

  } catch (error: any) {
    console.error('API: Error in send-alert-notification:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}