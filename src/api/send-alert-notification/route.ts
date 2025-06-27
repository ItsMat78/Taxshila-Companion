
import { NextResponse, type NextRequest } from 'next/server';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore'; // Import FieldValue for arrayRemove

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

interface AdminDoc {
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
    const studentIdToQuery = alertPayload.studentId; // studentId from payload is the custom ID
    console.log("API Route: studentIdToQuery for tokens:", studentIdToQuery);


    if (studentIdToQuery) {
      console.log(`API Route: Targeted alert for student ${studentIdToQuery}. Fetching token...`);
      const studentQuery = await db
        .collection("students")
        .where("studentId", "==", studentIdToQuery) // Query by custom studentId field
        .limit(1)
        .get();

      if (!studentQuery.empty) {
        const studentDoc = studentQuery.docs[0];
        const student = studentDoc.data() as StudentDoc;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens = student.fcmTokens.filter(token => typeof token === 'string' && token.length > 0);
          console.log(`API Route: Tokens found for student ${studentIdToQuery}:`, tokens);
        } else {
          console.log(`API Route: Student ${studentIdToQuery} found, but no FCM tokens or empty tokens array.`);
        }
      } else {
        console.log(`API Route: Student ${studentIdToQuery} not found for targeted alert.`);
        // It's okay if a student isn't found, alert is still saved. Notification won't be sent.
        return NextResponse.json({ success: true, message: `Student ${studentIdToQuery} not found, notification not sent.` }, { status: 200 });
      }
    } else {
      // GENERAL ALERT - Fetch tokens for all students AND all admins
      console.log("API Route: General alert. Fetching tokens for all students and admins...");
      
      // Fetch student tokens
      const allStudentsSnapshot = await db.collection("students").get();
      allStudentsSnapshot.forEach((studentDoc) => {
        const student = studentDoc.data() as StudentDoc;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens.push(...student.fcmTokens.filter(token => typeof token === 'string' && token.length > 0));
        }
      });
      console.log("API Route: Total tokens from students:", tokens.length);
      
      // Fetch admin tokens
      const adminsSnapshot = await db.collection("admins").get();
      adminsSnapshot.forEach((doc) => {
        const adminData = doc.data() as AdminDoc;
        if (adminData.fcmTokens && adminData.fcmTokens.length > 0) {
          tokens.push(...adminData.fcmTokens);
        }
      });
      console.log("API Route: Total tokens after adding admins (before unique):", tokens.length);
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
    };

    const response = await admin.messaging().sendEachForMulticast(messageToSend);

    console.log("API Route: FCM send response: Successes:", response.successCount, "Failures:", response.failureCount);

    const cleanupPromises = response.responses.map(async (result, index) => {
        const currentToken = uniqueTokens[index];
        if (result.success) {
            console.log(`API Route: Successfully sent to token (index ${index}): ${currentToken.substring(0,10)}... Message ID: ${result.messageId}`);
        } else {
            const errorCode = result.error?.code;
            console.error(`API Route: Failed to send to token (index ${index}): ${currentToken.substring(0,10)}... Error: ${errorCode} - ${result.error?.message}`);

            if (errorCode === 'messaging/registration-token-not-registered' ||
                errorCode === 'messaging/invalid-registration-token') {
                console.log(`API Route: Invalid token ${currentToken.substring(0,10)}... detected. Attempting to remove from Firestore.`);
                try {
                    const batch = db.batch();
                    
                    // Check students collection
                    const studentsWithTokenQuery = db.collection('students').where('fcmTokens', 'array-contains', currentToken);
                    const studentQuerySnapshot = await studentsWithTokenQuery.get();
                    if (!studentQuerySnapshot.empty) {
                        studentQuerySnapshot.forEach(doc => {
                            console.log(`API Route: Removing invalid token from student document ${doc.id}`);
                            batch.update(doc.ref, { fcmTokens: FieldValue.arrayRemove(currentToken) });
                        });
                    }

                    // Check admins collection
                    const adminsWithTokenQuery = db.collection('admins').where('fcmTokens', 'array-contains', currentToken);
                    const adminQuerySnapshot = await adminsWithTokenQuery.get();
                     if (!adminQuerySnapshot.empty) {
                        adminQuerySnapshot.forEach(doc => {
                            console.log(`API Route: Removing invalid token from admin document ${doc.id}`);
                            batch.update(doc.ref, { fcmTokens: FieldValue.arrayRemove(currentToken) });
                        });
                    }
                    
                    await batch.commit();
                    console.log(`API Route: Invalid token ${currentToken.substring(0,10)}... removed from relevant documents.`);

                } catch (cleanupError: any) {
                    console.error(`API Route: Error cleaning up invalid token ${currentToken.substring(0,10)}...: `, cleanupError.message);
                }
            }
        }
    });

    await Promise.all(cleanupPromises);

    return NextResponse.json({ success: true, message: `Notifications attempt summary: Successes: ${response.successCount}, Failures: ${response.failureCount}.` });

  } catch (error: any) {
    console.error("API Route: Error processing send-alert-notification:", error.message, error.stack, error);
    return NextResponse.json({ success: false, error: error.message || "An unexpected server error occurred." }, { status: 500 });
  }
}
