
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

interface AlertItem {
  id: string;
  studentId?: string; // Optional: for targeted alerts
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
  fcmTokens?: string[]; // Array of FCM registration tokens
}

// Function to send notification for a new alert
export const sendAlertNotification = functions.firestore
  .document("alertItems/{alertId}")
  .onCreate(async (snapshot: functions.firestore.DocumentSnapshot, context: functions.EventContext) => {
    const alertData = snapshot.data() as AlertItem;
    const alertId = context.params.alertId;

    functions.logger.log("New alert created, ID:", alertId, "Data:", alertData);

    let tokens: string[] = [];

    if (alertData.studentId) {
      // Targeted alert
      const studentQuery = await db
        .collection("students")
        .where("studentId", "==", alertData.studentId)
        .limit(1)
        .get();

      if (!studentQuery.empty) {
        const studentDoc = studentQuery.docs[0];
        const student = studentDoc.data() as Student;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens = student.fcmTokens;
          functions.logger.log(
            "Targeted alert for student",
            alertData.studentId,
            ". Tokens:",
            tokens.length
          );
        } else {
          functions.logger.log(
            "Student",
            alertData.studentId,
            "found, but no FCM tokens."
          );
        }
      } else {
        functions.logger.log(
          "Student",
          alertData.studentId,
          "not found for targeted alert."
        );
        return null;
      }
    } else {
      const allStudentsSnapshot = await db.collection("students").get();
      allStudentsSnapshot.forEach((studentDoc) => {
        const student = studentDoc.data() as Student;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens.push(...student.fcmTokens);
        }
      });
      functions.logger.log(
        "General alert. Total tokens found:",
        tokens.length
      );
    }

    if (tokens.length === 0) {
      functions.logger.log("No FCM tokens found to send notification to.");
      return null;
    }

    const uniqueTokens = [...new Set(tokens)];

    const payload = {
      data: {
        title: alertData.title,
        body: alertData.message,
        icon: "/logo.png",
        url: "/member/alerts",
        alertId: alertId,
        alertType: alertData.type,
        ...(alertData.originalFeedbackId &&
          {originalFeedbackId: alertData.originalFeedbackId}),
        ...(alertData.originalFeedbackMessageSnippet &&
          {originalFeedbackMessageSnippet:
            alertData.originalFeedbackMessageSnippet}),
      },
    };

    functions.logger.log(
      "Sending FCM. Payload:",
      JSON.stringify(payload).substring(0,30) + "...",
      "Tokens count:",
      uniqueTokens.length
    );

    try {
      const response = await admin.messaging().sendToDevice(
        uniqueTokens,
        payload
      );
      functions.logger.log("FCM send response:", response);

      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          functions.logger.error(
            "FCM Fail:",
            uniqueTokens[index].substring(0,10) + "...",
            error.code
          );
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            // Consider removing the invalid token
          }
        }
      });
      return response;
    } catch (error) {
      functions.logger.error("Error sending FCM message:", error);
      return null;
    }
  });
