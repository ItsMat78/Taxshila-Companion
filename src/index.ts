import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
// Make sure your Firebase project has a service account key set up if running locally,
// or it will work automatically in the Firebase Functions environment.
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
  // ... any other fields
}

interface Student {
  studentId: string;
  fcmTokens?: string[]; // Array of FCM registration tokens
  // ... other student fields
}

// Function to send notification for a new alert
export const sendAlertNotification = functions.firestore
  .document("alertItems/{alertId}")
  .onCreate(async (snapshot, context) => {
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
            `Targeted alert for student ${alertData.studentId}. Found tokens:`,
            tokens.length
          );
        } else {
          functions.logger.log(
            `Student ${alertData.studentId} found, but no FCM tokens.`
          );
        }
      } else {
        functions.logger.log(
          `Student ${alertData.studentId} not found for targeted alert.`
        );
        return null; // No student found to notify
      }
    } else {
      // General alert - send to all students who have FCM tokens
      // This can be resource-intensive for many users. Consider topics for large scale.
      const allStudentsSnapshot = await db.collection("students").get();
      allStudentsSnapshot.forEach((studentDoc) => {
        const student = studentDoc.data() as Student;
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          tokens.push(...student.fcmTokens);
        }
      });
      functions.logger.log(`General alert. Total tokens found:`, tokens.length);
    }

    if (tokens.length === 0) {
      functions.logger.log("No FCM tokens found to send notification to.");
      return null;
    }

    // Remove duplicate tokens (if any from general alert logic)
    const uniqueTokens = [...new Set(tokens)];

    const payload = {
      // notification: { // This is for when the app is in the background/killed
      //   title: alertData.title,
      //   body: alertData.message,
      //   icon: "/logo.png", // Path relative to your PWA's public folder
      //   click_action: `https://YOUR_APP_DOMAIN/member/alerts` // Replace with your domain
      // },
      data: { // This payload is received by the service worker
        title: alertData.title,
        body: alertData.message,
        icon: "/logo.png",
        url: "/member/alerts", // Path for your app to open on click
        alertId: alertId, // You can pass the alert ID if needed
        alertType: alertData.type,
      },
    };

    functions.logger.log("Sending FCM message with payload:", payload, "to tokens:", uniqueTokens.length);

    try {
      const response = await admin.messaging().sendToDevice(uniqueTokens, payload);
      functions.logger.log("FCM send response:", response);

      // Clean up invalid tokens
      const tokensToRemove: Promise<any>[] = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          functions.logger.error(
            "Failure sending notification to",
            uniqueTokens[index],
            error
          );
          // Cleanup the tokens that are not registered anymore.
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            // Find the student document that has this token and remove it
            // This part is a bit more complex as you need to query for the student
            // owning the token. For simplicity, I'm not fully implementing student token removal here.
            // You would typically iterate through students or have a reverse lookup.
            // Example: db.collection("students").where("fcmTokens", "array-contains", uniqueTokens[index]).get()...
          }
        }
      });
      await Promise.all(tokensToRemove);
      return response;

    } catch (error) {
      functions.logger.error("Error sending FCM message:", error);
      return null;
    }
  });