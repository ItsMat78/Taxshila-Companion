

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
  deleteDoc,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  runTransaction,
  storage,
  storageRef,
  uploadString,
  getDownloadURL,
  arrayRemove,
  increment,
  auth,
  setDoc,
} from '@/lib/firebase';
import type { Student, Shift, FeeStatus, PaymentRecord, ActivityStatus, AttendanceRecord, FeeStructure, AttendanceImportData, PaymentImportData, CheckedInStudentInfo } from '@/types/student';
import type { FeedbackItem, FeedbackType, FeedbackStatus, AlertItem } from '@/types/communication';
import { format, parseISO, differenceInDays, isPast, addMonths, startOfDay, isValid, addDays, isAfter, getHours, getMinutes, isWithinInterval, startOfMonth, endOfMonth, parse, differenceInMilliseconds } from 'date-fns';
import { ALL_SEAT_NUMBERS } from '@/config/seats';
import { triggerAlertNotification, triggerFeedbackNotification } from './notification-service';

import {
  getAuth,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
} from 'firebase/auth';


// --- Collections ---
const STUDENTS_COLLECTION = "students";
const ADMINS_COLLECTION = "admins"; // New collection for admins
const ATTENDANCE_COLLECTION = "attendanceRecords";
const FEEDBACK_COLLECTION = "feedbackItems";
const ALERTS_COLLECTION = "alertItems";
const APP_CONFIG_COLLECTION = "appConfiguration";
const FEE_SETTINGS_DOC_ID = "feeSettings";

// Simplified Admin User type for Firestore interaction
interface AdminUserFirestore {
  firestoreId: string;
  email: string;
  name: string;
  role: 'admin';
  fcmTokens?: string[];
  theme?: string; // Added for storing user's preferred theme
}


// --- Helper to convert Firestore Timestamps in student data ---
const studentFromDoc = (docSnapshot: any): Student => {
  const data = docSnapshot.data();
  return {
    ...data,
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    registrationDate: data.registrationDate instanceof Timestamp ? format(data.registrationDate.toDate(), 'yyyy-MM-dd') : data.registrationDate,
    lastPaymentDate: data.lastPaymentDate instanceof Timestamp ? format(data.lastPaymentDate.toDate(), 'yyyy-MM-dd') : (data.lastPaymentDate === null ? undefined : data.lastPaymentDate),
    lastAttendanceDate: data.lastAttendanceDate instanceof Timestamp ? data.lastAttendanceDate.toDate().toISOString() : data.lastAttendanceDate,
    nextDueDate: data.nextDueDate instanceof Timestamp ? format(data.nextDueDate.toDate(), 'yyyy-MM-dd') : (data.nextDueDate === null ? undefined : data.nextDueDate),
    paymentHistory: (data.paymentHistory || []).map((p: any) => ({
      ...p,
      date: p.date instanceof Timestamp ? format(p.date.toDate(), 'yyyy-MM-dd') : p.date,
    })),
    fcmTokens: data.fcmTokens || [], // Ensure fcmTokens is an array
    theme: data.theme || 'light-default', // Add theme with a default
    uid: data.uid,
  } as Student;
};

const adminUserFromDoc = (docSnapshot: any): AdminUserFirestore => {
  const data = docSnapshot.data();
  return {
    ...data,
    firestoreId: docSnapshot.id,
    fcmTokens: data.fcmTokens || [],
    theme: data.theme || 'light-default', // Add theme with a default
  } as AdminUserFirestore;
}

const attendanceRecordFromDoc = (docSnapshot: any): AttendanceRecord => {
  const data = docSnapshot.data();
  if (!data) {
    throw new Error(`Attendance document ${docSnapshot.id} has no data.`);
  }

  let checkInTimeISO: string;
  if (data.checkInTime instanceof Timestamp) {
    checkInTimeISO = data.checkInTime.toDate().toISOString();
  } else if (typeof data.checkInTime === 'string' && isValid(parseISO(data.checkInTime))) {
    checkInTimeISO = data.checkInTime;
  } else {
    checkInTimeISO = new Date(0).toISOString();
  }

  let checkOutTimeISO: string | undefined = undefined;
  if (data.checkOutTime instanceof Timestamp) {
    checkOutTimeISO = data.checkOutTime.toDate().toISOString();
  } else if (typeof data.checkOutTime === 'string' && isValid(parseISO(data.checkOutTime))) {
    checkOutTimeISO = data.checkOutTime;
  }

  let dateStr: string;
  if (data.date instanceof Timestamp) {
    dateStr = format(data.date.toDate(), 'yyyy-MM-dd');
  } else if (typeof data.date === 'string' && data.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    dateStr = data.date;
  } else {
    dateStr = format(parseISO(checkInTimeISO), 'yyyy-MM-dd');
  }

  return {
    recordId: docSnapshot.id,
    studentId: data.studentId,
    date: dateStr,
    checkInTime: checkInTimeISO,
    checkOutTime: checkOutTimeISO,
  };
};

const feedbackItemFromDoc = (docSnapshot: any): FeedbackItem => {
  const data = docSnapshot.data();
  return {
    ...data,
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    dateSubmitted: data.dateSubmitted instanceof Timestamp ? data.dateSubmitted.toDate().toISOString() : data.dateSubmitted,
  } as FeedbackItem;
};

const alertItemFromDoc = (docSnapshot: any): AlertItem => {
  const data = docSnapshot.data();
  return {
    ...data,
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    studentId: data.studentId === null ? undefined : data.studentId,
    dateSent: data.dateSent instanceof Timestamp ? data.dateSent.toDate().toISOString() : data.dateSent,
  } as AlertItem;
};


// --- Fee Structure Service Functions ---
const DEFAULT_FEE_STRUCTURE: FeeStructure = {
  morningFee: 600,
  eveningFee: 600,
  fullDayFee: 1000,
};

export async function getFeeStructure(): Promise<FeeStructure> {
  const feeSettingsDocRef = doc(db, APP_CONFIG_COLLECTION, FEE_SETTINGS_DOC_ID);
  try {
    const docSnap = await getDoc(feeSettingsDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as FeeStructure;
    } else {
      await runTransaction(db, async (transaction) => {
        const freshDocSnap = await transaction.get(feeSettingsDocRef);
        if (!freshDocSnap.exists()) {
          transaction.set(feeSettingsDocRef, DEFAULT_FEE_STRUCTURE);
        }
      });
      return DEFAULT_FEE_STRUCTURE;
    }
  } catch (error) {
    console.error("Error getting or creating fee structure:", error);
    return DEFAULT_FEE_STRUCTURE;
  }
}

export async function updateFeeStructure(newFees: Partial<FeeStructure>): Promise<void> {
  const feeSettingsDocRef = doc(db, APP_CONFIG_COLLECTION, FEE_SETTINGS_DOC_ID);
  const dataToUpdate: Partial<FeeStructure> = {};
  if (newFees.morningFee !== undefined && newFees.morningFee > 0) dataToUpdate.morningFee = newFees.morningFee;
  if (newFees.eveningFee !== undefined && newFees.eveningFee > 0) dataToUpdate.eveningFee = newFees.eveningFee;
  if (newFees.fullDayFee !== undefined && newFees.fullDayFee > 0) dataToUpdate.fullDayFee = newFees.fullDayFee;

  if (Object.keys(dataToUpdate).length === 0) {
    throw new Error("No valid fee updates provided.");
  }

  await updateDoc(feeSettingsDocRef, dataToUpdate);
}


// --- Student Service Functions ---
export async function getAllStudents(): Promise<Student[]> {
  const q = query(collection(db, STUDENTS_COLLECTION));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(studentFromDoc);
}

export async function getStudentByCustomId(studentId: string): Promise<Student | undefined> {
  const q = query(collection(db, STUDENTS_COLLECTION), where("studentId", "==", studentId));
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

  // Corrected payload: removed 'undefined' values
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
  if (!studentToUpdate || !studentToUpdate.firestoreId || !studentToUpdate.uid) {
    throw new Error("Student not found or is missing critical data (Firestore ID or Auth UID).");
  }
  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentToUpdate.firestoreId);

  // --- Firebase Auth Update ---
  const authUpdatePayload: { uid: string; email?: string; phone?: string; password?: string } = { uid: studentToUpdate.uid };
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

  if (authNeedsUpdate) {
      const authResponse = await fetch('/api/admin/update-student-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authUpdatePayload),
      });

      if (!authResponse.ok) {
          const errorResult = await authResponse.json();
          throw new Error(`Auth Update Failed: ${errorResult.error || 'An unknown error occurred.'}`);
      }
  }


  // --- Firestore Data Update ---
  const firestoreUpdateData = { ...studentUpdateData };
  delete firestoreUpdateData.password;

  const payload: any = { ...studentUpdateData };
  delete payload.firestoreId;
  delete payload.studentId;
  delete payload.id;
  delete payload.password; // Ensure password is not written to Firestore

  const newShift = payload.shift;
  
  if (newShift && newShift !== studentToUpdate.shift && studentToUpdate.lastPaymentDate && studentToUpdate.nextDueDate) {
    const fees = await getFeeStructure();
    const oldShiftFee = studentToUpdate.shift === 'morning' ? fees.morningFee : studentToUpdate.shift === 'evening' ? fees.eveningFee : fees.fullDayFee;
    const newShiftFee = newShift === 'morning' ? fees.morningFee : newShift === 'evening' ? fees.eveningFee : fees.fullDayFee;

    const lastPaymentDate = parseISO(studentToUpdate.lastPaymentDate);
    const originalNextDueDate = parseISO(studentToUpdate.nextDueDate);

    const today = new Date();
    if (isAfter(today, originalNextDueDate)) {
      payload.amountDue = `Rs. ${newShiftFee}`;
    } else {
      const totalPaidDays = differenceInDays(originalNextDueDate, lastPaymentDate);
      const dailyRateOld = totalPaidDays > 0 ? oldShiftFee / totalPaidDays : 0;
      const remainingDays = differenceInDays(originalNextDueDate, today);
      const remainingValue = remainingDays > 0 ? remainingDays * dailyRateOld : 0;
      const dailyRateNew = newShiftFee > 0 ? newShiftFee / 30 : 0; // Approx 30 days
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
  } else if (studentUpdateData.activityStatus === 'Active' && studentToUpdate.activityStatus === 'Left') {
    if (!payload.seatNumber || !ALL_SEAT_NUMBERS.includes(payload.seatNumber)) {
        throw new Error("A valid seat must be selected to re-activate a student.");
    }
    const fees = await getFeeStructure();
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
    payload.lastPaymentDate = format(new Date(), 'yyyy-MM-dd');
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
          if (payload.amountDue === undefined || payload.amountDue === 'Rs. 0') {
              const fees = await getFeeStructure();
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

  // Correctly handle nextDueDate conversion
  if (payload.hasOwnProperty('nextDueDate')) {
    if (payload.nextDueDate && typeof payload.nextDueDate === 'string' && isValid(parseISO(payload.nextDueDate))) {
        payload.nextDueDate = Timestamp.fromDate(parseISO(payload.nextDueDate));
    } else if (payload.nextDueDate instanceof Date) { // Handle case where it might be a Date object
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


// --- Attendance Service Functions ---
export async function getActiveCheckIn(studentId: string): Promise<AttendanceRecord | undefined> {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("studentId", "==", studentId),
    where("date", "==", todayStr),
    where("checkOutTime", "==", null)
  );
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return undefined;
  }

  // To handle the edge case of multiple active check-ins, return the most recent one.
  const records = querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));
  records.sort((a, b) => parseISO(b.checkInTime).getTime() - parseISO(a.checkInTime).getTime());
  return records[0];
}


export async function addCheckIn(studentId: string): Promise<AttendanceRecord> {
  const student = await getStudentByCustomId(studentId);
  if (!student) {
    throw new Error("Student not found for check-in.");
  }
  
  const existingActiveCheckIn = await getActiveCheckIn(studentId);
  if (existingActiveCheckIn) {
    console.warn(`[StudentService] Blocked duplicate check-in for student ${studentId}. Active record: ${existingActiveCheckIn.recordId}`);
    throw new Error("You are already checked in. Please check out before checking in again.");
  }
  
  const now = new Date();
  const newRecordData = {
    studentId,
    date: format(now, 'yyyy-MM-dd'),
    checkInTime: Timestamp.fromDate(now),
    checkOutTime: null,
  };
  const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), newRecordData);
  
  if (student.firestoreId) {
      const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
      await updateDoc(studentDocRef, { lastAttendanceDate: Timestamp.fromDate(now) });
  }

  return {
    recordId: docRef.id,
    studentId: newRecordData.studentId,
    date: newRecordData.date,
    checkInTime: newRecordData.checkInTime.toDate().toISOString(),
  };
}

export async function addCheckOut(recordId: string): Promise<AttendanceRecord | undefined> {
  const recordDocRef = doc(db, ATTENDANCE_COLLECTION, recordId);
  const recordSnap = await getDoc(recordDocRef);
  if (!recordSnap.exists()) return undefined;

  await updateDoc(recordDocRef, { checkOutTime: Timestamp.fromDate(new Date()) });
  const updatedSnap = await getDoc(recordDocRef);
  return updatedSnap.exists() ? attendanceRecordFromDoc(updatedSnap) : undefined;
}

export async function getAttendanceForDate(studentId: string, date: string): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("studentId", "==", studentId),
    where("date", "==", date)
  );
  const querySnapshot = await getDocs(q);
  const records = querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));
  // Sort in memory to ensure ascending order by check-in time
  records.sort((a, b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime());
  return records;
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    const q = query(collection(db, ATTENDANCE_COLLECTION));
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));
    // Sort in memory after fetching
    records.sort((a,b) => parseISO(b.checkInTime).getTime() - parseISO(a.checkInTime).getTime());
    return records;
}

export async function getAttendanceRecordsByStudentId(studentId: string): Promise<AttendanceRecord[]> {
  const q = query(collection(db, ATTENDANCE_COLLECTION), where("studentId", "==", studentId));
  const querySnapshot = await getDocs(q);
  const records = querySnapshot.docs.map(doc => attendanceRecordFromDoc(doc));
  // Sort in memory after fetching
  records.sort((a, b) => parseISO(b.checkInTime).getTime() - parseISO(a.checkInTime).getTime());
  return records;
}


// --- Payment and Revenue ---
export async function recordStudentPayment(
  customStudentId: string,
  totalAmountPaidString: string,
  paymentMethod: PaymentRecord['method'],
  numberOfMonthsPaid: number = 1
): Promise<Student | undefined> {
  const studentToUpdate = await getStudentByCustomId(customStudentId);
  if (!studentToUpdate || !studentToUpdate.firestoreId) {
    throw new Error("Student not found.");
  }
  if (studentToUpdate.activityStatus === 'Left') {
    throw new Error("Cannot record payment for a student who has left.");
  }

  const fees = await getFeeStructure();
  let expectedMonthlyFee: number;
  switch(studentToUpdate.shift) {
    case "morning": expectedMonthlyFee = fees.morningFee; break;
    case "evening": expectedMonthlyFee = fees.eveningFee; break;
    case "fullday": expectedMonthlyFee = fees.fullDayFee; break;
    default: throw new Error("Invalid shift for fee calculation.");
  }

  let amountToPayNumeric: number;
  if (totalAmountPaidString === "Rs. 0" || totalAmountPaidString === "N/A" || !totalAmountPaidString.startsWith("Rs.")) {
    amountToPayNumeric = expectedMonthlyFee * numberOfMonthsPaid;
  } else {
    amountToPayNumeric = parseInt(totalAmountPaidString.replace('Rs. ', '').trim(), 10);
    if (isNaN(amountToPayNumeric) || amountToPayNumeric <= 0) {
        throw new Error("Invalid payment amount provided in string.");
    }
  }

  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentToUpdate.firestoreId);
  const today = new Date(); // Actual payment date
  const newPaymentId = `PAY${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 100)).padStart(2,'0')}`;
  const newTransactionId = `TXN${paymentMethod.substring(0,3).toUpperCase()}${String(Date.now()).slice(-7)}`;

  const newPaymentRecord: PaymentRecord = {
    paymentId: newPaymentId,
    date: format(today, 'yyyy-MM-dd'),
    amount: `Rs. ${amountToPayNumeric}`,
    transactionId: newTransactionId,
    method: paymentMethod,
  };

  const firestorePaymentRecord = {
      ...newPaymentRecord,
      date: Timestamp.fromDate(parseISO(newPaymentRecord.date))
  };

  let baseDateForCalculation: Date;
  if (studentToUpdate.nextDueDate && isValid(parseISO(studentToUpdate.nextDueDate)) && isAfter(parseISO(studentToUpdate.nextDueDate), today)) {
    baseDateForCalculation = parseISO(studentToUpdate.nextDueDate);
  } else {
    baseDateForCalculation = today;
  }
  const newNextDueDate = addMonths(baseDateForCalculation, numberOfMonthsPaid);

  const updatedFeeData = {
    feeStatus: "Paid" as FeeStatus,
    lastPaymentDate: Timestamp.fromDate(today),
    nextDueDate: Timestamp.fromDate(newNextDueDate),
    amountDue: "Rs. 0",
    paymentHistory: arrayUnion(firestorePaymentRecord),
  };

  await updateDoc(studentDocRef, updatedFeeData);
  const updatedDocSnap = await getDoc(studentDocRef);
  const updatedStudent = studentFromDoc(updatedDocSnap);

  try {
    await sendAlertToStudent(
      customStudentId,
      "Payment Confirmation",
      `Hi ${updatedStudent.name}, your fee payment of ${newPaymentRecord.amount} has been recorded. Fees paid up to ${updatedStudent.nextDueDate ? format(parseISO(updatedStudent.nextDueDate), 'PP') : 'N/A'}.`,
      "info"
    );
  } catch (alertError) { 
    console.error("Failed to send payment confirmation alert, but payment was recorded.", alertError);
  }

  return updatedStudent;
}

export async function calculateMonthlyStudyHours(customStudentId: string): Promise<number> {
    const allRecordsForStudent = await getAttendanceRecordsByStudentId(customStudentId);
    
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const recordsInMonth = allRecordsForStudent.filter(record => {
        try {
            const checkInDate = parseISO(record.checkInTime);
            return isValid(checkInDate) && isWithinInterval(checkInDate, { start: monthStart, end: monthEnd });
        } catch(e) { return false; }
    });

    let totalMilliseconds = 0;

    recordsInMonth.forEach(record => {
        if (!record) return;
        try {
            const checkInDate = parseISO(record.checkInTime);
            
            if (record.checkOutTime && isValid(parseISO(record.checkOutTime))) {
                // Case 1: Session is complete (has check-in and check-out)
                const checkOutDate = parseISO(record.checkOutTime);
                totalMilliseconds += differenceInMilliseconds(checkOutDate, checkInDate);
            } else {
                // Case 2: Session is still active (no check-out)
                const isTodayRecord = format(checkInDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
                let sessionEndDate: Date;

                if (isTodayRecord) {
                    // If it's an active session from today, calculate up to now
                    sessionEndDate = now;
                } else {
                    // If it's a "stuck" active session from a previous day, cap it at 9:30 PM of that day
                    sessionEndDate = new Date(checkInDate);
                    sessionEndDate.setHours(21, 30, 0, 0); 
                }
                
                if (isAfter(sessionEndDate, checkInDate)) {
                    totalMilliseconds += differenceInMilliseconds(sessionEndDate, checkInDate);
                }
            }
        } catch (e) {
            console.error(`Error processing attendance record ${record.recordId} for student ${customStudentId}:`, e);
        }
    });

    const totalHours = totalMilliseconds / (1000 * 60 * 60);
    return Math.round(totalHours * 10) / 10;
}


// --- Communication Service Functions (Feedback & Alerts) ---
export async function submitFeedback(
  studentId: string | undefined,
  studentName: string | undefined,
  message: string,
  type: FeedbackType
): Promise<FeedbackItem> {
  const newFeedbackData = {
    studentId: studentId || null,
    studentName: studentName || null,
    message,
    type,
    dateSubmitted: Timestamp.fromDate(new Date()),
    status: "Open" as FeedbackStatus,
  };
  const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), newFeedbackData);
  
  const feedbackItem = {
    id: docRef.id,
    ...newFeedbackData,
    studentId: newFeedbackData.studentId === null ? undefined : newFeedbackData.studentId,
    studentName: newFeedbackData.studentName === null ? undefined : newFeedbackData.studentName,
    dateSubmitted: newFeedbackData.dateSubmitted.toDate().toISOString(),
   };
  
  // Use fetch to call the API route
  await triggerFeedbackNotification(feedbackItem);
  
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

export async function sendGeneralAlert(title: string, message: string, type: AlertItem['type']): Promise<AlertItem> {
    const newAlertData = {
        title,
        message,
        type,
        dateSent: serverTimestamp(),
        isRead: false,
        studentId: null,
    };
    const docRef = await addDoc(collection(db, ALERTS_COLLECTION), newAlertData);

    // Refetch the document to get the resolved timestamp
    const newDocSnap = await getDoc(docRef);
    const alertItem = alertItemFromDoc(newDocSnap);
    
    try {
      console.log(`[StudentService] Calling API to send general alert ${alertItem.id}`);
      const response = await fetch('/api/send-alert-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertItem),
      });
      if (!response.ok) {
        // Log the error response from the server to get more insight
        const errorResult = await response.json();
        throw new Error(errorResult.error || `API responded with status ${response.status}`);
      }
       console.log(`[StudentService] API call for general alert ${alertItem.id} finished.`);
    } catch (error) {
      console.error(`[StudentService] Failed to trigger notification for general alert, but alert was saved. Error:`, error);
      // Re-throw or handle as needed, e.g., show a specific toast to the admin.
      throw new Error("Alert was saved to the database, but the push notification could not be sent. Please check the server logs.");
    }
    
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
    const newAlertDataForFirestore: any = {
        studentId: customStudentId,
        title,
        message,
        type,
        dateSent: serverTimestamp(), // Use serverTimestamp for consistency
        isRead: false,
    };
    if (originalFeedbackId) newAlertDataForFirestore.originalFeedbackId = originalFeedbackId;
    if (originalFeedbackMessageSnippet) newAlertDataForFirestore.originalFeedbackMessageSnippet = originalFeedbackMessageSnippet;

    const docRef = await addDoc(collection(db, ALERTS_COLLECTION), newAlertDataForFirestore);
    
    // Refetch the document to resolve serverTimestamp before sending to API
    const newDocSnap = await getDoc(docRef);
    const alertItem = alertItemFromDoc(newDocSnap);
    
    try {
      console.log(`[StudentService] Calling API to send alert ${alertItem.id} to student ${customStudentId}`);
      const response = await fetch('/api/send-alert-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertItem),
      });
      if (!response.ok) {
        // Log the error response from the server to get more insight
        const errorResult = await response.json();
        throw new Error(errorResult.error || `API responded with status ${response.status}`);
      }
      console.log(`[StudentService] API call for alert ${alertItem.id} finished.`);
    } catch (error) {
      console.error(`[StudentService] Failed to trigger notification for student ${customStudentId}, but alert was saved. Error:`, error);
      // Re-throw or handle as needed, e.g., show a specific toast to the admin.
      throw new Error("Alert was saved to the database, but the push notification could not be sent. Please check the server logs.");
    }
    
    return alertItem;
}


export async function getAlertsForStudent(customStudentId: string): Promise<AlertItem[]> {
  const student = await getStudentByCustomId(customStudentId);
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

  // Filter general alerts in code instead of in the query
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
        const student = await getStudentByCustomId(customStudentId);
        if (student && student.firestoreId) {
            const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
            await updateDoc(studentDocRef, { readGeneralAlertIds: arrayUnion(alertId) });
        }
        return { ...alertData, isRead: true };
    }
    return alertData;
}

export async function markAllAlertsAsRead(customStudentId: string): Promise<void> {
    const student = await getStudentByCustomId(customStudentId);
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
  const student = await getStudentByCustomId(customStudentId);
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

/*
export async function batchImportStudents(studentsToImport: AddStudentData[]): Promise<BatchImportSummary> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const studentData of studentsToImport) {
    try {
      if (!studentData.name || !studentData.phone || !studentData.password || !studentData.shift || !studentData.seatNumber) {
        throw new Error(`Missing required fields for student: ${studentData.name || 'N/A'}`);
      }
      await addStudent(studentData);
      successCount++;
    } catch (error: any) {
      errors.push(`Failed to import ${studentData.name || studentData.phone}: ${error.message}`);
      errorCount++;
    }
  }
  return { processedCount: studentsToImport.length, successCount, errorCount, errors };
}


export async function batchImportAttendance(recordsToImport: AttendanceImportData[]): Promise<BatchImportSummary> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const batch = writeBatch(db);
  let operationCount = 0;

  for (let i = 0; i < recordsToImport.length; i++) {
    const record = recordsToImport[i];
    try {
      if (!record['Student ID'] || !record['Date'] || !record['Check-In Time']) {
        throw new Error(`Row ${i + 2}: Missing required fields.`);
      }

      const student = await getStudentByCustomId(record['Student ID']);
      if (!student) {
        throw new Error(`Row ${i + 2}: Student ID not found.`);
      }
      
      const newRecordRef = doc(collection(db, ATTENDANCE_COLLECTION));
      batch.set(newRecordRef, {
        studentId: record['Student ID'],
        date: record['Date'],
        checkInTime: parseISO(`${record['Date']}T${record['Check-In Time']}`),
        checkOutTime: record['Check-Out Time'] ? parseISO(`${record['Date']}T${record['Check-Out Time']}`) : null,
      });
      operationCount++;
      successCount++;

      if (operationCount >= 499) {
        await batch.commit();
        operationCount = 0;
      }

    } catch (error: any) {
      errors.push(`Row ${i + 2}: ${error.message}`);
      errorCount++;
    }
  }
  if (operationCount > 0) {
    await batch.commit();
  }
  return { processedCount: recordsToImport.length, successCount, errorCount, errors };
}

export async function batchImportPayments(recordsToImport: PaymentImportData[]): Promise<BatchImportSummary> {
  // This function would need a proper implementation similar to the others.
  // For now, it's a placeholder.
  return { processedCount: 0, successCount: 0, errorCount: 0, errors: ["Not implemented"] };
}*/

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


export async function getAllStudentsWithPaymentHistory(): Promise<Student[]> {
  return getAllStudents();
}

export async function getTodaysActiveAttendanceRecords() {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where("date", "==", todayStr),
        where("checkOutTime", "==", null)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot;
}

export async function processCheckedInStudentsFromSnapshot(
    attendanceSnapshot: any, // Firebase QuerySnapshot
    allStudents: Student[]
): Promise<CheckedInStudentInfo[]> {
    if (attendanceSnapshot.empty) {
        return [];
    }
    
    const studentMap = new Map(allStudents.map(s => [s.studentId, s]));

    const checkedInStudentDetails: CheckedInStudentInfo[] = attendanceSnapshot.docs
        .map((attendanceDoc: any) => {
            const record = attendanceRecordFromDoc(attendanceDoc);
            if (!record) return null;
            
            const student = studentMap.get(record.studentId);
            if (!student) return null;

            let isOutsideAtCheckIn = false;
            const checkInTime = parseISO(record.checkInTime);
            const checkInHour = getHours(checkInTime);
            const checkInMinutes = getMinutes(checkInTime);

            if (student.shift === "morning" && (checkInHour < 7 || checkInHour >= 14)) {
                isOutsideAtCheckIn = true;
            } else if (student.shift === "evening" && (checkInHour < 14 || checkInHour > 21 || (checkInHour === 21 && checkInMinutes > 30))) {
                isOutsideAtCheckIn = true;
            }

            return { ...student, checkInTime: record.checkInTime, isOutsideShift: isOutsideAtCheckIn };
        })
        .filter((s: any): s is CheckedInStudentInfo => s !== null)
        .sort((a: any, b: any) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime());

    return checkedInStudentDetails;
}

// --- FCM Token Management ---
export async function saveStudentFCMToken(studentFirestoreId: string, token: string): Promise<void> {
  if (!studentFirestoreId || !token) return;
  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentFirestoreId);
  await updateDoc(studentDocRef, { fcmTokens: arrayUnion(token) });
}

export async function removeFCMTokenForStudent(studentFirestoreId: string, tokenToRemove: string): Promise<void> {
  if (!studentFirestoreId || !tokenToRemove) return;
  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentFirestoreId);
  await updateDoc(studentDocRef, { fcmTokens: arrayRemove(tokenToRemove) });
}

// --- Admin FCM Token Management ---
export async function getAdminByEmail(email: string): Promise<AdminUserFirestore | undefined> {
  const q = query(collection(db, ADMINS_COLLECTION), where("email", "==", email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return undefined;
  return adminUserFromDoc(querySnapshot.docs[0]);
}

export async function saveAdminFCMToken(adminFirestoreId: string, token: string): Promise<void> {
  if (!adminFirestoreId || !token) return;
  const adminDocRef = doc(db, ADMINS_COLLECTION, adminFirestoreId);
  await updateDoc(adminDocRef, { fcmTokens: arrayUnion(token) });
}

export async function removeAdminFCMToken(adminFirestoreId: string, tokenToRemove: string): Promise<void> {
  if (!adminFirestoreId || !tokenToRemove) return;
  const adminDocRef = doc(db, ADMINS_COLLECTION, adminFirestoreId);
  await updateDoc(adminDocRef, { fcmTokens: arrayRemove(tokenToRemove) });
}

export type MonthlyRevenueData = {
  monthDate: string; // Changed to string to avoid serialization issues
  monthDisplay: string;
  revenue: number;
};

export async function getMonthlyRevenueHistory(): Promise<MonthlyRevenueData[]> {
    const allStudents = await getAllStudents();
    const monthlyRevenueMap = new Map<string, number>(); // Key: "YYYY-MM"

    allStudents.forEach(student => {
        if (student.paymentHistory) {
            student.paymentHistory.forEach(payment => {
                try {
                    const paymentDate = parseISO(payment.date);
                    if (isValid(paymentDate)) {
                        const monthKey = format(paymentDate, 'yyyy-MM');
                        const amountString = payment.amount.replace('Rs. ', '').trim();
                        const amountValue = parseInt(amountString, 10);
                        if (!isNaN(amountValue)) {
                            monthlyRevenueMap.set(
                                monthKey,
                                (monthlyRevenueMap.get(monthKey) || 0) + amountValue
                            );
                        }
                    }
                } catch (e) { /* ignore parse errors */ }
            });
        }
    });

    const results = Array.from(monthlyRevenueMap.entries())
        .map(([monthKey, revenue]) => {
            const monthDate = parse(`${monthKey}-01`, 'yyyy-MM-dd', new Date());
            return {
                monthDate: monthDate.toISOString(), // Convert to string
                monthDisplay: format(monthDate, 'MMMM yyyy'),
                revenue,
            };
        });
    
    // Sort by month string descending
    results.sort((a, b) => b.monthDate.localeCompare(a.monthDate));
    
    return results;
}

export async function calculateMonthlyRevenue(): Promise<string> {
  const allStudents = await getAllStudents();
  let totalRevenue = 0;
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  allStudents.forEach(student => {
    if (student.paymentHistory) {
      student.paymentHistory.forEach(payment => {
        try {
          const paymentDate = parseISO(payment.date);
          if (isValid(paymentDate) && isWithinInterval(paymentDate, { start: currentMonthStart, end: currentMonthEnd })) {
            const amountString = payment.amount.replace('Rs. ', '').trim();
            const amountValue = parseInt(amountString, 10);
            if (!isNaN(amountValue)) {
              totalRevenue += amountValue;
            }
          }
        } catch (e) { /* ignore parse errors */ }
      });
    }
  });
  return `Rs. ${totalRevenue.toLocaleString('en-IN')}`;
}

export async function refreshAllStudentFeeStatuses(): Promise<{ updatedCount: number }> {
  const allStudents = await getAllStudents();
  const feeStructure = await getFeeStructure();
  const today = startOfDay(new Date());
  const batch = writeBatch(db);
  let updatedCount = 0;

  for (const student of allStudents) {
    if (student.activityStatus !== 'Active' || !student.firestoreId || !student.nextDueDate) {
      continue; // Skip inactive students or those without a due date
    }

    const dueDate = startOfDay(parseISO(student.nextDueDate));
    let newFeeStatus: FeeStatus | null = null;
    let newAmountDue: string | null = null;

    if (isAfter(dueDate, today)) {
      // Due date is in the future
      newFeeStatus = 'Paid';
      newAmountDue = 'Rs. 0';
    } else {
      // Due date is today or in the past
      const daysOverdue = differenceInDays(today, dueDate);
      if (daysOverdue > 5) {
        newFeeStatus = 'Overdue';
      } else {
        newFeeStatus = 'Due';
      }
      
      // Set amount due if it's not already set or is 'Rs. 0'
      if (student.amountDue === 'Rs. 0' || !student.amountDue || student.amountDue === 'N/A') {
          switch (student.shift) {
            case "morning": newAmountDue = `Rs. ${feeStructure.morningFee}`; break;
            case "evening": newAmountDue = `Rs. ${feeStructure.eveningFee}`; break;
            case "fullday": newAmountDue = `Rs. ${feeStructure.fullDayFee}`; break;
            default: newAmountDue = "Rs. 0";
          }
      }
    }

    // Check if an update is needed
    const needsUpdate = (newFeeStatus && newFeeStatus !== student.feeStatus) || (newAmountDue && newAmountDue !== student.amountDue);

    if (needsUpdate) {
      const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
      const updatePayload: { feeStatus?: FeeStatus; amountDue?: string } = {};
      if (newFeeStatus && newFeeStatus !== student.feeStatus) {
        updatePayload.feeStatus = newFeeStatus;
      }
      if (newAmountDue && newAmountDue !== student.amountDue) {
          updatePayload.amountDue = newAmountDue;
      }
      
      if(Object.keys(updatePayload).length > 0) {
          batch.update(studentDocRef, updatePayload);
          updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    await batch.commit();
  }

  return { updatedCount };
}


// --- Theme Persistence ---
export async function updateUserTheme(firestoreId: string, role: 'admin' | 'member', theme: string): Promise<void> {
  if (!firestoreId || !role || !theme) return;
  const collectionName = role === 'admin' ? ADMINS_COLLECTION : STUDENTS_COLLECTION;
  const userDocRef = doc(db, collectionName, firestoreId);
  await updateDoc(userDocRef, { theme: theme });
}


/**
 * Saves a new profile picture Base64 string to the user's document in Firestore.
 *
 * @param firestoreId The Firestore document ID of the user.
 * @param role The role of the user ('admin' or 'member').
 * @param base64Url The Base64 data URI of the new image.
 * @returns The Base64 string that was saved.
 */
export async function updateProfilePicture(firestoreId: string, role: 'admin' | 'member', base64Url: string): Promise<string> {
  if (!firestoreId || !role || !base64Url) {
    throw new Error("User ID, role, and image data are required.");
  }
  
  const collectionName = role === 'admin' ? 'admins' : 'students';
  const userDocRef = doc(db, collectionName, firestoreId);
  await updateDoc(userDocRef, { profilePictureUrl: base64Url });

  return base64Url;
}



declare module '@/types/student' {
  interface Student {
    id?: string;
    firestoreId?: string;
    readGeneralAlertIds?: string[];
  }
}
declare module '@/types/communication' {
  interface FeedbackItem {
    firestoreId?: string;
  }
  interface AlertItem {
    firestoreId?: string;
  }
}
