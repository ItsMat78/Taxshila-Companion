
"use server";
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
// Make sure your Firebase project has a service account key set up if
// running locally, or it will work automatically in the Firebase Functions
// environment.
admin.initializeApp();

const db = admin.firestore();

// Interface for data directly from Firestore snapshot
interface AlertItemFromDB {
  studentId?: string;
  title: string;
  message: string;
  type: "info" | "warning" | "closure" | "feedback_response";
  dateSent: admin.firestore.Timestamp; // Firestore Timestamp
  isRead?: boolean;
  originalFeedbackId?: string;
  originalFeedbackMessageSnippet?: string;
}

interface Student {
  studentId: string;
  fcmTokens?: string[];
  // ... other student fields
}

/**
 * Handles the creation of a new alert item in Firestore.
 * Fetches student tokens and sends push notifications via FCM.
 * @param {functionsV1.firestore.DocumentSnapshot} snapshot The document
 *  snapshot.
 * @param {functionsV1.EventContext} context The event context.
 * @return {Promise<admin.messaging.MessagingDevicesResponse | null>}
 *  The FCM response or null.
 */
const alertCreationHandler = async (
  snapshot: functionsV1.firestore.DocumentSnapshot,
  context: functionsV1.EventContext
): Promise<admin.messaging.MessagingDevicesResponse | null> => {
  const alertDataFromDB = snapshot.data() as AlertItemFromDB | undefined;

  if (!alertDataFromDB) {
    functionsV1.logger.error("Alert data is undefined, exiting function.");
    return null;
  }

  const alertId = context.params.alertId;
  functionsV1.logger.log(
    "New alert created, ID:",
    alertId,
    "Data:",
    alertDataFromDB
  );

  let tokens: string[] = [];

  if (alertDataFromDB.studentId) {
    // Targeted alert
    const studentQuery = await db
      .collection("students")
      .where("studentId", "==", alertDataFromDB.studentId)
      .limit(1)
      .get();

    if (!studentQuery.empty) {
      const studentDoc = studentQuery.docs[0];
      const student = studentDoc.data() as Student;
      if (student.fcmTokens && student.fcmTokens.length > 0) {
        tokens = student.fcmTokens;
        functionsV1.logger.log(
          `Targeted alert for student ${alertDataFromDB.studentId}. Tokens:`,
          tokens.length
        );
      } else {
        functionsV1.logger.log(
          `Student ${alertDataFromDB.studentId} found, but no FCM tokens.`
        );
      }
    } else {
      functionsV1.logger.log(
        `Student ${alertDataFromDB.studentId} not found for targeted alert.`
      );
      return null;
    }
  } else {
    // General alert
    const allStudentsSnapshot = await db.collection("students").get();
    allStudentsSnapshot.forEach((studentDoc) => {
      const student = studentDoc.data() as Student;
      if (student.fcmTokens && student.fcmTokens.length > 0) {
        tokens.push(...student.fcmTokens);
      }
    });
    functionsV1.logger.log("General alert. Total tokens found:", tokens.length);
  }

  if (tokens.length === 0) {
    functionsV1.logger.log("No FCM tokens found to send notification to.");
    return null;
  }

  const uniqueTokens = [...new Set(tokens)];

  // Construct the data payload for the push notification
  const payloadData: {[key: string]: string} = {
    title: alertDataFromDB.title,
    body: alertDataFromDB.message,
    icon: "/logo.png",
    url: "/member/alerts", // Path for your app to open on click
    alertId: alertId,
    alertType: alertDataFromDB.type,
  };
  if (alertDataFromDB.originalFeedbackId) {
    payloadData.originalFeedbackId = alertDataFromDB.originalFeedbackId;
  }
  if (alertDataFromDB.originalFeedbackMessageSnippet) {
    payloadData.originalFeedbackMessageSnippet =
      alertDataFromDB.originalFeedbackMessageSnippet;
  }

  const payload = {data: payloadData};

  functionsV1.logger.log(
    "Sending FCM. Payload:",
    JSON.stringify(payload).substring(0, 30) + "...",
    "Tokens count:",
    uniqueTokens.length
  );

  try {
    const response = await admin.messaging().sendToDevice(uniqueTokens,payload);
    functionsV1.logger.log("FCM send response:", response);

    // Clean up invalid tokens
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        functionsV1.logger.error(
          "FCM Fail:",
          uniqueTokens[index].substring(0, 10) + "...",
          error.code
        );
        // Consider removing invalid tokens
        // This would involve querying the "students" collection for the token
        // and then removing it from the student"s "fcmTokens" array.
        // For brevity, detailed token cleanup is omitted here.
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          // Example: removeTokenFromStudent(uniqueTokens[index]);
        }
      }
    });
    return response;
  } catch (error) {
    functionsV1.logger.error("Error sending FCM message:", error);
    return null;
  }
};

/**
 * Firebase Cloud Function triggered on new alert creation to send
 * notifications.
 */
export const sendAlertNotification = functionsV1.firestore
  .document("alertItems/{alertId}")
  .onCreate(alertCreationHandler);
