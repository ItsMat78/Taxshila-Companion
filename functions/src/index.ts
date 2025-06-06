
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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
}

/**
 * Handles the creation of a new alert item in Firestore.
 * Fetches student tokens and sends push notifications via FCM.
 * @param {functions.firestore.DocumentSnapshot} snapshot The document snapshot.
 * @param {functions.EventContext} context The event context.
 * @return {Promise<admin.messaging.MessagingDevicesResponse | null>}
 *  The FCM response or null.
 */
const alertCreationHandler = async (
  snapshot: functions.firestore.DocumentSnapshot,
  context: functions.EventContext
): Promise<admin.messaging.MessagingDevicesResponse | null> => {
  const alertDataFromDB = snapshot.data() as AlertItemFromDB | undefined;

  if (!alertDataFromDB) {
    functions.logger.error("Alert data is undefined, exiting function.");
    return null;
  }

  const alertId = context.params.alertId;
  functions.logger.log("New alert created, ID:", alertId, "Data:", alertDataFromDB);

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
        functions.logger.log(
          "Targeted alert for student",
          alertDataFromDB.studentId,
          ". Tokens:",
          tokens.length
        );
      } else {
        functions.logger.log(
          "Student",
          alertDataFromDB.studentId,
          "found, but no FCM tokens."
        );
      }
    } else {
      functions.logger.log(
        "Student",
        alertDataFromDB.studentId,
        "not found for targeted alert."
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
    functions.logger.log("General alert. Total tokens found:", tokens.length);
  }

  if (tokens.length === 0) {
    functions.logger.log("No FCM tokens found to send notification to.");
    return null;
  }

  const uniqueTokens = [...new Set(tokens)];

  const payloadData: { [key: string]: string } = {
    title: alertDataFromDB.title,
    body: alertDataFromDB.message,
    icon: "/logo.png",
    url: "/member/alerts",
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

  const payload = {data: payloadData}; // Corrected: key-spacing

  functions.logger.log(
    "Sending FCM. Payload:",
    JSON.stringify(payload).substring(0, 30) + "...",
    "Tokens count:",
    uniqueTokens.length
  );

  try {
    const response = await admin.messaging().sendToDevice(uniqueTokens, payload);
    functions.logger.log("FCM send response:", response);

    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        functions.logger.error(
          "FCM Fail:",
          uniqueTokens[index].substring(0, 10) + "...", // Shortened line
          error.code
        );
        // Consider removing invalid tokens
      }
    });
    return response;
  } catch (error) {
    functions.logger.error("Error sending FCM message:", error); // Shortened line
    return null;
  }
};

/**
 * Firebase Cloud Function triggered on new alert creation to send notifications.
 */
export const sendAlertNotification = functions.firestore
  .document("alertItems/{alertId}")
  .onCreate(alertCreationHandler);
