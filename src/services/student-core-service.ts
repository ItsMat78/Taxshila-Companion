import {
  db,
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  Timestamp,
  deleteDoc,
  limit,
  writeBatch,
  runTransaction,
  arrayUnion,
  arrayRemove,
  setDoc,
} from '@/lib/firebase';
import type { QueryDocumentSnapshot, DocumentSnapshot, DocumentData } from 'firebase/firestore';
import type { Student, Shift, FeeStatus } from '@/types/student';
import type { AlertItem } from '@/types/communication';
import { format, parseISO, differenceInDays, isAfter, addDays, startOfDay, isValid } from 'date-fns';
import { ALL_SEAT_NUMBERS } from '@/config/seats';

// --- Collections ---
const STUDENTS_COLLECTION = "students";
const ADMINS_COLLECTION = "admins";
const ATTENDANCE_COLLECTION = "attendanceRecords";
const FEEDBACK_COLLECTION = "feedbackItems";
const ALERTS_COLLECTION = "alertItems";
const APP_CONFIG_COLLECTION = "appConfiguration";

// Simplified Admin User type for Firestore interaction
interface AdminUserFirestore {
  firestoreId: string;
  email: string;
  name: string;
  role: 'admin';
  fcmTokens?: string[];
  oneSignalPlayerIds?: string[];
  theme?: string;
}

// --- Helper to convert Firestore Timestamps in student data ---
export const studentFromDoc = (docSnapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Student => {
  const data = docSnapshot.data() ?? {};
  return {
    ...data,
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    registrationDate: data.registrationDate instanceof Timestamp ? format(data.registrationDate.toDate(), 'yyyy-MM-dd') : data.registrationDate,
    lastPaymentDate: data.lastPaymentDate instanceof Timestamp ? format(data.lastPaymentDate.toDate(), 'yyyy-MM-dd') : (data.lastPaymentDate === null ? undefined : data.lastPaymentDate),
    lastAttendanceDate: data.lastAttendanceDate instanceof Timestamp ? format(data.lastAttendanceDate.toDate(), 'yyyy-MM-dd') : data.lastAttendanceDate,
    nextDueDate: data.nextDueDate instanceof Timestamp ? format(data.nextDueDate.toDate(), 'yyyy-MM-dd') : (data.nextDueDate === null ? undefined : data.nextDueDate),
    paymentHistory: (data.paymentHistory || []).map((p: { date: unknown } & Record<string, unknown>) => ({
      ...p,
      date: p.date instanceof Timestamp ? format((p.date as InstanceType<typeof Timestamp>).toDate(), 'yyyy-MM-dd') : p.date,
    })),
    fcmTokens: data.fcmTokens || [],
    oneSignalPlayerIds: data.oneSignalPlayerIds || [],
    theme: data.theme || 'light-default',
    uid: data.uid,
  } as Student;
};

const adminUserFromDoc = (docSnapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): AdminUserFirestore => {
  const data = docSnapshot.data() ?? {};
  return {
    ...data,
    firestoreId: docSnapshot.id,
    fcmTokens: data.fcmTokens || [],
    oneSignalPlayerIds: data.oneSignalPlayerIds || [],
    theme: data.theme || 'light-default',
  } as AdminUserFirestore;
}

// --- Lazy imports to avoid circular dependencies ---
async function getFeeStructureInternal() {
  const { getFeeStructure } = await import('./fee-service');
  return getFeeStructure();
}

async function sendAlertToStudentInternal(
  customStudentId: string,
  title: string,
  message: string,
  type: AlertItem['type']
) {
  const { sendAlertToStudent } = await import('./communication-client-service');
  return sendAlertToStudent(customStudentId, title, message, type);
}

// --- Student Service Functions ---
export async function getAllStudents(): Promise<Student[]> {
  const q = query(collection(db, STUDENTS_COLLECTION));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(studentFromDoc);
}

export async function getStudentsWithFeesDue(): Promise<Student[]> {
  const q = query(
    collection(db, STUDENTS_COLLECTION),
    where("activityStatus", "==", "Active"),
    where("feeStatus", "in", ["Due", "Overdue"])
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(studentFromDoc);
}

export async function getStudentByCustomId(studentId: string): Promise<Student | undefined> {
  const q = query(collection(db, STUDENTS_COLLECTION), where("studentId", "==", studentId), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return undefined;
  }
  return studentFromDoc(querySnapshot.docs[0]);
}
export const getStudentById = getStudentByCustomId;


export async function getStudentByEmail(email: string): Promise<Student | undefined> {
  const q = query(collection(db, STUDENTS_COLLECTION), where("email", "==", email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return undefined;
  }
  return studentFromDoc(querySnapshot.docs[0]);
}

export async function getStudentByIdentifier(identifier: string): Promise<Student | undefined> {
  let student: Student | undefined;
  const emailQuery = query(collection(db, STUDENTS_COLLECTION), where("email", "==", identifier.toLowerCase()));
  let querySnapshot = await getDocs(emailQuery);
  if (!querySnapshot.empty) {
    student = studentFromDoc(querySnapshot.docs[0]);
  } else {
    const phoneQuery = query(collection(db, STUDENTS_COLLECTION), where("phone", "==", identifier));
    querySnapshot = await getDocs(phoneQuery);
    if (!querySnapshot.empty) {
      student = studentFromDoc(querySnapshot.docs[0]);
    }
  }
  return student;
}

async function getNextCustomStudentId(): Promise<string> {
  const counterRef = doc(db, APP_CONFIG_COLLECTION, 'studentCounter');

  return runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let newIdNumber = 1;
    if (counterDoc.exists()) {
      newIdNumber = (counterDoc.data().lastId || 0) + 1;
    }
    transaction.set(counterRef, { lastId: newIdNumber }, { merge: true });
    return `TSMEM${String(newIdNumber).padStart(4, '0')}`;
  });
}

export interface AddStudentData {
  name: string;
  email?: string;
  phone: string;
  address: string;
  password?: string;
  shift: Shift;
  seatNumber: string;
  idCardFileName?: string;
  profilePictureUrl?: string;
}

export async function addStudent(studentData: AddStudentData): Promise<Student> {
  const authResponse = await fetch('/api/admin/create-student-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      password: studentData.password,
    }),
  });

  if (!authResponse.ok) {
    const errorResult = await authResponse.json();
    throw new Error(errorResult.error || "Failed to create authentication user.");
  }
  const { uid, email: finalEmail } = await authResponse.json();

  const studentId = await getNextCustomStudentId();
  const studentDocRef = doc(collection(db, STUDENTS_COLLECTION));

  const firestorePayload: Omit<Student, 'id' | 'firestoreId' | 'paymentHistory' | 'lastPaymentDate' | 'leftDate'> = {
    uid: uid,
    studentId: studentId,
    name: studentData.name,
    email: finalEmail,
    phone: studentData.phone,
    address: studentData.address,
    shift: studentData.shift,
    seatNumber: studentData.seatNumber,
    profilePictureUrl: studentData.profilePictureUrl,
    activityStatus: 'Active',
    feeStatus: 'Due',
    amountDue: 'Rs. 0',
    registrationDate: format(new Date(), 'yyyy-MM-dd'),
    nextDueDate: format(new Date(), 'yyyy-MM-dd'),
  };

  await setDoc(studentDocRef, firestorePayload);

  const finalStudent = await getStudentByCustomId(studentId);
  if (!finalStudent) {
      throw new Error("Student document was created, but failed to be retrieved immediately after.");
  }

  return finalStudent;
}


export async function updateStudent(customStudentId: string, studentUpdateData: Partial<Student>): Promise<Student | undefined> {
  const studentToUpdate = await getStudentByCustomId(customStudentId);
  if (!studentToUpdate || !studentToUpdate.firestoreId) {
    throw new Error("Student not found or is missing critical data (Firestore ID).");
  }
  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentToUpdate.firestoreId);

  // --- Firebase Auth Update ---
  if (studentToUpdate.uid) {
    const authUpdatePayload: { uid: string; email?: string; phone?: string; password?: string, disabled?: boolean } = { uid: studentToUpdate.uid };
    let authNeedsUpdate = false;

    if (studentUpdateData.email && studentUpdateData.email !== studentToUpdate.email) {
        authUpdatePayload.email = studentUpdateData.email;
        authNeedsUpdate = true;
    }
    if (studentUpdateData.phone && studentUpdateData.phone !== studentToUpdate.phone) {
        authUpdatePayload.phone = studentUpdateData.phone;
        authNeedsUpdate = true;
    }
    if (studentUpdateData.password) {
        authUpdatePayload.password = studentUpdateData.password;
        authNeedsUpdate = true;
    }

    if (studentUpdateData.activityStatus === 'Left' && studentToUpdate.activityStatus === 'Active') {
        authUpdatePayload.disabled = true;
        authNeedsUpdate = true;
    } else if (studentUpdateData.activityStatus === 'Active' && studentToUpdate.activityStatus === 'Left') {
        authUpdatePayload.disabled = false;
        authNeedsUpdate = true;
    }

    if (authNeedsUpdate) {
        try {
          const authResponse = await fetch('/api/admin/update-student-auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(authUpdatePayload),
          });

          if (!authResponse.ok) {
              const errorResult = await authResponse.json();
              const errorMessage = errorResult.error || 'An unknown error occurred.';
              if (errorMessage.includes("already disabled") || errorMessage.includes("already enabled")) {
                console.warn(`Auth state for ${customStudentId} was already as requested. Proceeding with DB update.`);
              } else {
                throw new Error(`Auth Update Failed: ${errorMessage}`);
              }
          }
        } catch(e) {
           if (e instanceof Error && (e.message.includes("already disabled") || e.message.includes("already enabled"))) {
              console.warn(`Auth state for ${customStudentId} was already as requested. Proceeding with DB update.`);
           } else {
              throw e;
           }
        }
    }
  } else if (studentUpdateData.activityStatus) {
    console.warn(`Skipping auth update for student ${customStudentId} because they have no UID.`);
  }


  // --- Firestore Data Update ---
  const firestoreUpdateData = { ...studentUpdateData };
  delete firestoreUpdateData.password;

  const payload: Record<string, unknown> = { ...studentUpdateData };
  delete payload.firestoreId;
  delete payload.studentId;
  delete payload.id;
  delete payload.password;

  // Send name change alert if applicable
  if (payload.name && payload.name !== studentToUpdate.name) {
    sendAlertToStudentInternal(
        customStudentId,
        "Profile Update: Name Changed",
        `Hi there, your name has been updated by an admin from "${studentToUpdate.name}" to "${payload.name}".`,
        "info"
    );
  }
   // Send password change alert
  if (payload.password) {
    sendAlertToStudentInternal(
      customStudentId,
      "Security Alert: Password Changed",
      `Hi ${studentToUpdate.name}, your password was changed by an admin. If you did not authorize this, please contact support immediately.`,
      "warning"
    );
  }


  const newShift = payload.shift;

  if (newShift && newShift !== studentToUpdate.shift && studentToUpdate.feeStatus === 'Paid' && studentToUpdate.nextDueDate && isValid(parseISO(studentToUpdate.nextDueDate)) && isAfter(parseISO(studentToUpdate.nextDueDate), new Date())) {
      const fees = await getFeeStructureInternal();
      const oldShiftFee = studentToUpdate.shift === 'morning' ? fees.morningFee : studentToUpdate.shift === 'evening' ? fees.eveningFee : fees.fullDayFee;
      const newShiftFee = newShift === 'morning' ? fees.morningFee : newShift === 'evening' ? fees.eveningFee : fees.fullDayFee;

      const lastPaymentDate = studentToUpdate.lastPaymentDate ? parseISO(studentToUpdate.lastPaymentDate) : startOfDay(parseISO(studentToUpdate.nextDueDate));
      const originalNextDueDate = parseISO(studentToUpdate.nextDueDate);

      const today = new Date();
      const remainingDays = differenceInDays(originalNextDueDate, today);

      if (remainingDays > 0) {
          const dailyRateOld = oldShiftFee / 30;
          const remainingValue = remainingDays * dailyRateOld;

          const dailyRateNew = newShiftFee / 30;
          const additionalDays = dailyRateNew > 0 ? Math.floor(remainingValue / dailyRateNew) : 0;

          const newNextDueDate = addDays(today, additionalDays);
          payload.nextDueDate = format(newNextDueDate, 'yyyy-MM-dd');
          payload.amountDue = "Rs. 0";
      }
  }


  if (studentUpdateData.activityStatus === 'Left' && studentToUpdate.activityStatus === 'Active') {
    payload.seatNumber = null;
    payload.feeStatus = 'N/A';
    payload.amountDue = 'N/A';
    payload.leftDate = format(new Date(), 'yyyy-MM-dd');
    payload.fcmTokens = [];
    payload.oneSignalPlayerIds = [];

    sendAlertToStudentInternal(
        customStudentId,
        "Account Status Update",
        `Hi ${studentToUpdate.name}, your account has been marked as inactive by an admin. Your seat has been unassigned and access to services may be limited.`,
        "warning"
    );

  } else if (studentUpdateData.activityStatus === 'Active' && studentToUpdate.activityStatus === 'Left') {
    if (!payload.seatNumber || !ALL_SEAT_NUMBERS.includes(payload.seatNumber as string)) {
        throw new Error("A valid seat must be selected to re-activate a student.");
    }
    const fees = await getFeeStructureInternal();
    let amountDueForShift: string;
    const shiftForReactivation = payload.shift || studentToUpdate.shift;
    switch (shiftForReactivation) {
      case "morning": amountDueForShift = `Rs. ${fees.morningFee}`; break;
      case "evening": amountDueForShift = `Rs. ${fees.eveningFee}`; break;
      case "fullday": amountDueForShift = `Rs. ${fees.fullDayFee}`; break;
      default: amountDueForShift = "Rs. 0";
    }
    payload.feeStatus = 'Due';
    payload.amountDue = amountDueForShift;
    payload.nextDueDate = format(new Date(), 'yyyy-MM-dd');
    payload.leftDate = null;
  }

  const finalNextDueDateString = payload.nextDueDate !== undefined ? payload.nextDueDate : studentToUpdate.nextDueDate;
  const isNowActive = (payload.activityStatus === 'Active' || (payload.activityStatus === undefined && studentToUpdate.activityStatus === 'Active'));

  if (finalNextDueDateString && (typeof finalNextDueDateString === 'string' || finalNextDueDateString instanceof Date) && isNowActive) {
      const dueDate = startOfDay(finalNextDueDateString instanceof Date ? finalNextDueDateString : parseISO(finalNextDueDateString));
      const today = startOfDay(new Date());

      if (isAfter(dueDate, today)) {
          payload.feeStatus = 'Paid';
          if (payload.amountDue === undefined) {
              payload.amountDue = "Rs. 0";
          }
      } else {
          const daysOverdue = differenceInDays(today, dueDate);
          if (daysOverdue > 5) {
              payload.feeStatus = 'Overdue';
          } else {
              payload.feeStatus = 'Due';
          }
          if (payload.amountDue === undefined || payload.amountDue === 'Rs. 0' || payload.amountDue === 'N/A') {
              const fees = await getFeeStructureInternal();
              const currentShift = payload.shift || studentToUpdate.shift;
              let amountDueForShift: string;
              switch (currentShift) {
                  case "morning": amountDueForShift = `Rs. ${fees.morningFee}`; break;
                  case "evening": amountDueForShift = `Rs. ${fees.eveningFee}`; break;
                  case "fullday": amountDueForShift = `Rs. ${fees.fullDayFee}`; break;
                  default: amountDueForShift = "Rs. 0";
              }
              payload.amountDue = amountDueForShift;
          }
      }
  }


  if (payload.registrationDate && typeof payload.registrationDate === 'string') {
    payload.registrationDate = Timestamp.fromDate(parseISO(payload.registrationDate));
  }
  if (payload.lastPaymentDate && typeof payload.lastPaymentDate === 'string') {
    payload.lastPaymentDate = Timestamp.fromDate(parseISO(payload.lastPaymentDate));
  } else if (payload.hasOwnProperty('lastPaymentDate') && payload.lastPaymentDate === null) {
    payload.lastPaymentDate = null;
  }

  if (payload.hasOwnProperty('nextDueDate')) {
    if (payload.nextDueDate && typeof payload.nextDueDate === 'string' && isValid(parseISO(payload.nextDueDate))) {
        payload.nextDueDate = Timestamp.fromDate(parseISO(payload.nextDueDate));
    } else if (payload.nextDueDate instanceof Date) {
        payload.nextDueDate = Timestamp.fromDate(payload.nextDueDate);
    } else {
        payload.nextDueDate = null;
    }
  }

  const hasRelevantChanges = Object.keys(payload).some(key => key !== 'newPassword' && key !== 'confirmNewPassword' && key !== 'theme');

  await updateDoc(studentDocRef, payload);

  const updatedDocSnap = await getDoc(studentDocRef);
  return studentFromDoc(updatedDocSnap);
}



export async function deleteStudentCompletely(customStudentId: string): Promise<void> {
  const studentToDelete = await getStudentByCustomId(customStudentId);
  if (!studentToDelete || !studentToDelete.firestoreId) {
    throw new Error("Student not found for deletion.");
  }

  const batch = writeBatch(db);
  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentToDelete.firestoreId);
  batch.delete(studentDocRef);
  const attendanceQuery = query(collection(db, ATTENDANCE_COLLECTION), where("studentId", "==", customStudentId));
  const attendanceSnapshot = await getDocs(attendanceQuery);
  attendanceSnapshot.forEach(docSnap => batch.delete(docSnap.ref));
  const targetedAlertsQuery = query(collection(db, ALERTS_COLLECTION), where("studentId", "==", customStudentId));
  const targetedAlertsSnapshot = await getDocs(targetedAlertsQuery);
  targetedAlertsSnapshot.forEach(docSnap => batch.delete(docSnap.ref));
  const feedbackQuery = query(collection(db, FEEDBACK_COLLECTION), where("studentId", "==", customStudentId));
  const feedbackSnapshot = await getDocs(feedbackQuery);
  feedbackSnapshot.forEach(docSnap => batch.delete(docSnap.ref));

  await batch.commit();
}


export async function getAvailableSeats(shiftToConsider: Shift): Promise<string[]> {
  const allStudents = await getAllStudents();
  const allActiveStudents = allStudents.filter(s => s.activityStatus === "Active");
  const occupiedSeats = new Set<string>();
  allActiveStudents.forEach(s => {
    if (s.seatNumber && (s.shift === 'fullday' || shiftToConsider === 'fullday' || s.shift === shiftToConsider)) {
      occupiedSeats.add(s.seatNumber);
    }
  });
  return ALL_SEAT_NUMBERS.filter(seat => !occupiedSeats.has(seat)).sort((a,b) => parseInt(a) - parseInt(b));
}

export async function getAvailableSeatsFromList(shiftToConsider: Shift, studentList: Student[]): Promise<string[]> {
    const allActiveStudents = studentList.filter(s => s.activityStatus === "Active");
    const occupiedSeats = new Set<string>();
    allActiveStudents.forEach(s => {
      if (s.seatNumber && (s.shift === 'fullday' || shiftToConsider === 'fullday' || s.shift === shiftToConsider)) {
        occupiedSeats.add(s.seatNumber);
      }
    });
    return ALL_SEAT_NUMBERS.filter(seat => !occupiedSeats.has(seat)).sort((a, b) => parseInt(a) - parseInt(b));
}


export async function deleteAllData(): Promise<void> {
  const collectionsToDelete = [
    STUDENTS_COLLECTION,
    ADMINS_COLLECTION,
    ATTENDANCE_COLLECTION,
    FEEDBACK_COLLECTION,
    ALERTS_COLLECTION,
    APP_CONFIG_COLLECTION,
  ];

  for (const collectionName of collectionsToDelete) {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    if (snapshot.empty) continue;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
}


export async function getAdminByEmail(email: string): Promise<AdminUserFirestore | undefined> {
  const q = query(collection(db, ADMINS_COLLECTION), where("email", "==", email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return undefined;
  return adminUserFromDoc(querySnapshot.docs[0]);
}


// --- Theme Persistence ---
export async function updateUserTheme(firestoreId: string, role: 'admin' | 'member', theme: string): Promise<void> {
  if (!firestoreId || !role || !theme) return;
  const collectionName = role === 'admin' ? ADMINS_COLLECTION : STUDENTS_COLLECTION;
  const userDocRef = doc(db, collectionName, firestoreId);
  await updateDoc(userDocRef, { theme: theme });
}


export async function updateProfilePicture(firestoreId: string, role: 'admin' | 'member', base64Url: string): Promise<string> {
  if (!firestoreId || !role || !base64Url) {
    throw new Error("User ID, role, and image data are required.");
  }

  const collectionName = role === 'admin' ? 'admins' : 'students';
  const userDocRef = doc(db, collectionName, firestoreId);
  await updateDoc(userDocRef, { profilePictureUrl: base64Url });

  return base64Url;
}


export async function saveOneSignalPlayerId(firestoreId: string, role: 'admin' | 'member', playerId: string): Promise<void> {
  if (!firestoreId || !role || !playerId) {
    console.error("Missing required data to save OneSignal Player ID.");
    return;
  }
  const collectionName = role === 'admin' ? ADMINS_COLLECTION : STUDENTS_COLLECTION;
  const userDocRef = doc(db, collectionName, firestoreId);
  try {
    await updateDoc(userDocRef, {
      oneSignalPlayerIds: arrayUnion(playerId)
    });
  } catch (error) {
    console.error(`Failed to save OneSignal Player ID for user ${firestoreId}:`, error);
  }
}

export async function removeOneSignalPlayerId(firestoreId: string, role: string, playerId: string): Promise<void> {
  const collectionName = role === 'admin' ? 'admins' : 'students';
  const userDocRef = doc(db, collectionName, firestoreId);
  try {
    await updateDoc(userDocRef, {
      oneSignalPlayerIds: arrayRemove(playerId)
    });
  } catch (error) {
    console.error(`[Student Service] Failed to remove OneSignal ID ${playerId} for user ${firestoreId}:`, error);
  }
}
