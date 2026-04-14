import {
  db,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  arrayUnion,
  orderBy,
  serverTimestamp,
  writeBatch,
  setDoc,
} from '@/lib/firebase';
import type { QueryDocumentSnapshot, DocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { Student, WifiConfig } from '@/types/student';
import type { FeedbackItem, FeedbackType, FeedbackStatus, AlertItem } from '@/types/communication';
import { format, parseISO, isAfter } from 'date-fns';
import { medianLogger } from '@/lib/median-logger';

// --- Collections ---
const STUDENTS_COLLECTION = "students";
const FEEDBACK_COLLECTION = "feedbackItems";
const ALERTS_COLLECTION = "alertItems";
const APP_CONFIG_COLLECTION = "appConfiguration";
const WIFI_SETTINGS_DOC_ID = "wifiSettings";

// --- Helpers ---
const feedbackItemFromDoc = (docSnapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): FeedbackItem => {
  const data = docSnapshot.data() ?? {};
  return {
    ...data,
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    dateSubmitted: data['dateSubmitted'] instanceof Timestamp ? data['dateSubmitted'].toDate().toISOString() : data['dateSubmitted'],
  } as FeedbackItem;
};

const alertItemFromDoc = (docSnapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): AlertItem => {
  const data = docSnapshot.data() ?? {};
  return {
    ...data,
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    studentId: data['studentId'] === null ? undefined : data['studentId'],
    dateSent: data['dateSent'] instanceof Timestamp ? data['dateSent'].toDate().toISOString() : data['dateSent'],
  } as AlertItem;
};

// Lazy import to avoid circular dependencies
async function getStudentByCustomIdInternal(studentId: string): Promise<Student | undefined> {
  const { getStudentByCustomId } = await import('./student-core-service');
  return getStudentByCustomId(studentId);
}

// --- Notification trigger helper ---
async function triggerNotification(type: 'alert' | 'feedback', payload: AlertItem | { studentName: string; feedbackType: string }) {
  medianLogger.log(`Calling API to send notification. Type: ${type}`);
  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    });

    if (!response.ok) {
      const errorResult = await response.json();
      const errorMessage = errorResult.error || 'API call for notification failed.';
      medianLogger.log(`API Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    medianLogger.log(`API call for notification successful.`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    medianLogger.log(`Notification trigger failed: ${errorMessage}`);
    console.error(`[StudentService] Failed to trigger alert notification for type ${type}. Alert was saved, but push notification may have failed.`, error);
  }
}

// --- Feedback ---
export async function submitFeedback(
  studentId: string | undefined,
  studentName: string | undefined,
  message: string,
  type: FeedbackType
): Promise<FeedbackItem> {
  medianLogger.log(`Submitting feedback for ${studentName || 'Anonymous'}`);
  const newFeedbackData = {
    studentId: studentId || null,
    studentName: studentName || null,
    message,
    type,
    dateSubmitted: Timestamp.fromDate(new Date()),
    status: "Open" as FeedbackStatus,
  };
  const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), newFeedbackData);
  medianLogger.log(`Feedback saved with ID: ${docRef.id}.`);

  triggerNotification('feedback', { studentName: studentName || 'Anonymous', feedbackType: type });

  const feedbackItem = {
    id: docRef.id,
    ...newFeedbackData,
    studentId: newFeedbackData.studentId === null ? undefined : newFeedbackData.studentId,
    studentName: newFeedbackData.studentName === null ? undefined : newFeedbackData.studentName,
    dateSubmitted: newFeedbackData.dateSubmitted.toDate().toISOString(),
   };

  return feedbackItem;
}

export async function getAllFeedback(): Promise<FeedbackItem[]> {
  const q = query(collection(db, FEEDBACK_COLLECTION), orderBy("dateSubmitted", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => feedbackItemFromDoc(doc));
}

export async function updateFeedbackStatus(feedbackId: string, status: FeedbackStatus): Promise<FeedbackItem | undefined> {
  const feedbackDocRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
  await updateDoc(feedbackDocRef, { status });
  const updatedDocSnap = await getDoc(feedbackDocRef);
  return updatedDocSnap.exists() ? feedbackItemFromDoc(updatedDocSnap) : undefined;
}

// --- Alerts ---
export async function sendGeneralAlert(title: string, message: string, type: AlertItem['type']): Promise<AlertItem> {
    medianLogger.log(`Creating general alert: "${title}"`);
    const newAlertData = {
        title,
        message,
        type,
        dateSent: serverTimestamp(),
        isRead: false,
        studentId: null,
    };
    const docRef = await addDoc(collection(db, ALERTS_COLLECTION), newAlertData);
    medianLogger.log(`General alert saved with ID: ${docRef.id}. Now triggering notifications.`);

    const newDocSnap = await getDoc(docRef);
    const alertItem = alertItemFromDoc(newDocSnap);

    triggerNotification('alert', alertItem);

    return alertItem;
}

export async function sendAlertToStudent(
  customStudentId: string,
  title: string,
  message: string,
  type: AlertItem['type'],
  originalFeedbackId?: string,
  originalFeedbackMessageSnippet?: string
): Promise<AlertItem> {
    if (customStudentId === '__GENERAL__') {
        return sendGeneralAlert(title, message, type);
    }

    medianLogger.log(`Creating targeted alert for ${customStudentId}: "${title}"`);
    const newAlertDataForFirestore: Record<string, unknown> = {
        studentId: customStudentId,
        title,
        message,
        type,
        dateSent: serverTimestamp(),
        isRead: false,
    };
    if (originalFeedbackId) newAlertDataForFirestore.originalFeedbackId = originalFeedbackId;
    if (originalFeedbackMessageSnippet) newAlertDataForFirestore.originalFeedbackMessageSnippet = originalFeedbackMessageSnippet;

    const docRef = await addDoc(collection(db, ALERTS_COLLECTION), newAlertDataForFirestore);
    medianLogger.log(`Targeted alert saved with ID: ${docRef.id}. Now triggering notification.`);

    const newDocSnap = await getDoc(docRef);
    const alertItem = alertItemFromDoc(newDocSnap);

    triggerNotification('alert', alertItem);

    return alertItem;
}

export async function getAlertsForStudent(customStudentId: string): Promise<AlertItem[]> {
  const student = await getStudentByCustomIdInternal(customStudentId);
  if (!student || !student.firestoreId) return [];

  const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
  const studentSnap = await getDoc(studentDocRef);
  const studentData = studentSnap.data() as Student | undefined;
  const readGeneralAlertIdsSet = new Set(studentData?.readGeneralAlertIds || []);
  const registrationDate = parseISO(student.registrationDate);

  const targetedQuery = query(
    collection(db, ALERTS_COLLECTION),
    where("studentId", "==", customStudentId)
  );

  const generalAlertsQuery = query(
      collection(db, ALERTS_COLLECTION),
      where("studentId", "==", null)
  );

  const targetedAlertsSnapshot = await getDocs(targetedQuery);
  const studentAlerts = targetedAlertsSnapshot.docs.map(doc => alertItemFromDoc(doc));

  const generalAlertsSnapshot = await getDocs(generalAlertsQuery);
  const allGeneralAlerts = generalAlertsSnapshot.docs.map(doc => alertItemFromDoc(doc));

  const relevantGeneralAlerts = allGeneralAlerts.filter(alert => {
      const alertDate = parseISO(alert.dateSent);
      return (
          alert.type !== 'feedback_response' &&
          (isAfter(alertDate, registrationDate) || format(alertDate, 'yyyy-MM-dd') === format(registrationDate, 'yyyy-MM-dd'))
      );
  });

  const contextualizedAlerts = [
    ...studentAlerts,
    ...relevantGeneralAlerts.map(alert => ({
      ...alert,
      isRead: readGeneralAlertIdsSet.has(alert.id)
    }))
  ];

  return contextualizedAlerts.sort((a, b) => parseISO(b.dateSent).getTime() - parseISO(a.dateSent).getTime());
}

export async function getAllAdminSentAlerts(): Promise<AlertItem[]> {
  const q = query(collection(db, ALERTS_COLLECTION), orderBy("dateSent", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => alertItemFromDoc(doc));
}

export async function markAlertAsRead(alertId: string, customStudentId: string): Promise<AlertItem | undefined> {
    const alertDocRef = doc(db, ALERTS_COLLECTION, alertId);
    const alertSnap = await getDoc(alertDocRef);

    if (!alertSnap.exists()) {
        throw new Error("Alert not found.");
    }
    const alertData = alertItemFromDoc(alertSnap);

    if (alertData.studentId === customStudentId) {
        if (!alertData.isRead) {
            await updateDoc(alertDocRef, { isRead: true });
        }
        return { ...alertData, isRead: true };
    } else if (!alertData.studentId) {
        const student = await getStudentByCustomIdInternal(customStudentId);
        if (student && student.firestoreId) {
            const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
            await updateDoc(studentDocRef, { readGeneralAlertIds: arrayUnion(alertId) });
        }
        return { ...alertData, isRead: true };
    }
    return alertData;
}

export async function markAllAlertsAsRead(customStudentId: string): Promise<void> {
    const student = await getStudentByCustomIdInternal(customStudentId);
    if (!student || !student.firestoreId) {
        throw new Error("Student not found.");
    }

    const batch = writeBatch(db);
    const unreadTargetedQuery = query(
        collection(db, ALERTS_COLLECTION),
        where("studentId", "==", customStudentId),
        where("isRead", "==", false)
    );
    const unreadTargetedSnapshot = await getDocs(unreadTargetedQuery);
    unreadTargetedSnapshot.forEach(docSnap => batch.update(docSnap.ref, { isRead: true }));

    const generalAlertsQuery = query(collection(db, ALERTS_COLLECTION), where("studentId", "==", null));
    const generalAlertsSnapshot = await getDocs(generalAlertsQuery);
    const allGeneralAlertIds = generalAlertsSnapshot.docs.map(docSnap => docSnap.id);

    if (allGeneralAlertIds.length > 0) {
        const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
        batch.update(studentDocRef, { readGeneralAlertIds: arrayUnion(...allGeneralAlertIds) });
    }

    await batch.commit();
}

export async function sendShiftWarningAlert(customStudentId: string): Promise<void> {
  const student = await getStudentByCustomIdInternal(customStudentId);
  if (!student) {
    throw new Error("Student not found to send warning.");
  }

  await sendAlertToStudent(
    customStudentId,
    "Outside Shift Warning",
    `Hi ${student.name}, this is a friendly reminder that you are currently using the library facilities outside of your scheduled ${student.shift} shift hours. Please ensure you adhere to your shift timings.`,
    "warning"
  );
}

// --- Wifi Configuration ---
export async function getWifiConfiguration(): Promise<WifiConfig[]> {
  const wifiSettingsDocRef = doc(db, APP_CONFIG_COLLECTION, WIFI_SETTINGS_DOC_ID);
  const docSnap = await getDoc(wifiSettingsDocRef);
  if (docSnap.exists() && docSnap.data().configurations) {
    return docSnap.data().configurations as WifiConfig[];
  }
  return [];
}

export async function updateWifiConfiguration(configurations: WifiConfig[]): Promise<void> {
  const wifiSettingsDocRef = doc(db, APP_CONFIG_COLLECTION, WIFI_SETTINGS_DOC_ID);
  const cleanedConfigurations = configurations.map(config => {
    const cleanedConfig: Partial<WifiConfig> = { id: config.id, ssid: config.ssid };
    if (config.password) {
      cleanedConfig.password = config.password;
    }
    return cleanedConfig;
  });
  await setDoc(wifiSettingsDocRef, { configurations: cleanedConfigurations });
}
