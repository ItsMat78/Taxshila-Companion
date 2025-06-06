
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
  uploadBytesResumable,
  getDownloadURL,
  arrayRemove
} from '@/lib/firebase';
import type { Student, Shift, FeeStatus, PaymentRecord, ActivityStatus, AttendanceRecord, FeeStructure, AttendanceImportData, PaymentImportData } from '@/types/student';
import type { FeedbackItem, FeedbackType, FeedbackStatus, AlertItem } from '@/types/communication';
import { format, parseISO, differenceInDays, isPast, addMonths, subHours, subMinutes, startOfDay, endOfDay, isValid, differenceInMilliseconds, startOfMonth, endOfMonth, isWithinInterval, subMonths, getHours, compareDesc, getYear, getMonth, setHours, setMinutes, setSeconds } from 'date-fns';

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
  // password field is intentionally omitted from here as we won't fetch it directly for this purpose.
  // Auth still relies on hardcoded passwords for now.
}


export const ALL_SEAT_NUMBERS: string[] = [];
for (let i = 1; i <= 83; i++) {
    ALL_SEAT_NUMBERS.push(String(i));  
}
ALL_SEAT_NUMBERS.sort((a, b) => parseInt(a) - parseInt(b));

// --- Helper to convert Firestore Timestamps in student data ---
const studentFromDoc = (docSnapshot: any): Student => {
  const data = docSnapshot.data();
  return {
    ...data,
    id: docSnapshot.id,
    firestoreId: docSnapshot.id,
    registrationDate: data.registrationDate instanceof Timestamp ? format(data.registrationDate.toDate(), 'yyyy-MM-dd') : data.registrationDate,
    lastPaymentDate: data.lastPaymentDate instanceof Timestamp ? format(data.lastPaymentDate.toDate(), 'yyyy-MM-dd') : (data.lastPaymentDate === null ? undefined : data.lastPaymentDate),
    nextDueDate: data.nextDueDate instanceof Timestamp ? format(data.nextDueDate.toDate(), 'yyyy-MM-dd') : (data.nextDueDate === null ? undefined : data.nextDueDate),
    paymentHistory: (data.paymentHistory || []).map((p: any) => ({
      ...p,
      date: p.date instanceof Timestamp ? format(p.date.toDate(), 'yyyy-MM-dd') : p.date,
    })),
    fcmTokens: data.fcmTokens || [], // Ensure fcmTokens is an array
  } as Student;
};

const adminUserFromDoc = (docSnapshot: any): AdminUserFirestore => {
  const data = docSnapshot.data();
  return {
    ...data,
    firestoreId: docSnapshot.id,
    fcmTokens: data.fcmTokens || [],
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

async function applyAutomaticStatusUpdates(studentData: Student): Promise<Student> {
  let updatedStudent = { ...studentData };
  if (updatedStudent.activityStatus === 'Active' && updatedStudent.feeStatus === 'Overdue' && updatedStudent.nextDueDate) {
    try {
      const dueDate = parseISO(updatedStudent.nextDueDate);
      const today = new Date();
      const todayDateOnly = startOfDay(today);
      const dueDateOnly = startOfDay(dueDate);

      if (isValid(dueDateOnly) && isPast(dueDateOnly) && differenceInDays(todayDateOnly, dueDateOnly) > 5) {
        updatedStudent = {
            ...updatedStudent,
            activityStatus: 'Left',
            seatNumber: null,
            feeStatus: "N/A",
            amountDue: "N/A",
            lastPaymentDate: undefined,
            nextDueDate: undefined,
        };
        if (updatedStudent.firestoreId) {
             await updateDoc(doc(db, STUDENTS_COLLECTION, updatedStudent.firestoreId), {
                activityStatus: 'Left',
                seatNumber: null,
                feeStatus: "N/A",
                amountDue: "N/A",
                lastPaymentDate: null,
                nextDueDate: null,
             });
        }
      }
    } catch (e) {
    }
  }
  if (updatedStudent.activityStatus === 'Active' && updatedStudent.feeStatus !== 'Paid' && updatedStudent.nextDueDate) {
    try {
        const dueDate = parseISO(updatedStudent.nextDueDate);
        const today = new Date();
        if (isValid(dueDate) && isPast(dueDate) && updatedStudent.feeStatus !== 'Overdue') {
            updatedStudent.feeStatus = 'Overdue';
            if (updatedStudent.firestoreId) {
                 await updateDoc(doc(db, STUDENTS_COLLECTION, updatedStudent.firestoreId), { feeStatus: 'Overdue' });
            }
        }
    } catch (e) {
    }
  }
  return updatedStudent;
}


export async function getAllStudents(): Promise<Student[]> {
  const q = query(collection(db, STUDENTS_COLLECTION));
  const querySnapshot = await getDocs(q);
  let studentsList: Student[] = [];
  querySnapshot.forEach((docSnap) => {
    studentsList.push(studentFromDoc(docSnap));
  });
  studentsList = await Promise.all(studentsList.map(s => applyAutomaticStatusUpdates(s)));
  return studentsList;
}

export async function getStudentByCustomId(studentId: string): Promise<Student | undefined> {
  const q = query(collection(db, STUDENTS_COLLECTION), where("studentId", "==", studentId));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return undefined;
  }
  const student = studentFromDoc(querySnapshot.docs[0]);
  return applyAutomaticStatusUpdates(student);
}
export const getStudentById = getStudentByCustomId;


export async function getStudentByEmail(email: string): Promise<Student | undefined> {
  const q = query(collection(db, STUDENTS_COLLECTION), where("email", "==", email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return undefined;
  }
  const student = studentFromDoc(querySnapshot.docs[0]);
  return applyAutomaticStatusUpdates(student);
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
  return student ? applyAutomaticStatusUpdates(student) : undefined;
}

async function getNextCustomStudentId(): Promise<string> {
  const studentsRef = collection(db, STUDENTS_COLLECTION);
  const q = query(studentsRef, orderBy("studentId", "desc"), limit(1));
  const querySnapshot = await getDocs(q);

  let maxIdNum = 0;
  if (!querySnapshot.empty) {
    const lastStudent = studentFromDoc(querySnapshot.docs[0]);
    if (lastStudent.studentId && lastStudent.studentId.startsWith('TSMEM')) {
      const idNum = parseInt(lastStudent.studentId.replace('TSMEM', ''), 10);
      if (!isNaN(idNum)) {
        maxIdNum = idNum;
      }
    }
  }
  return `TSMEM${String(maxIdNum + 1).padStart(3, '0')}`;
}

export interface AddStudentData {
  name: string;
  email?: string;
  phone: string;
  password?: string;
  shift: Shift;
  seatNumber: string;
  idCardFileName?: string;
}

export async function addStudent(studentData: AddStudentData): Promise<Student> {
  const customStudentId = await getNextCustomStudentId();
  const fees = await getFeeStructure();

  const existingStudentById = await getStudentByCustomId(customStudentId);
  if (existingStudentById) {
    throw new Error(`Generated Student ID ${customStudentId} already exists. Please try again.`);
  }
  if (studentData.email && studentData.email.trim() !== "") {
    const existingStudentByEmail = await getStudentByEmail(studentData.email);
    if (existingStudentByEmail) {
      throw new Error(`Email ${studentData.email} is already registered.`);
    }
  }
  const phoneQuery = query(collection(db, STUDENTS_COLLECTION), where("phone", "==", studentData.phone));
  const phoneSnapshot = await getDocs(phoneQuery);
  if (!phoneSnapshot.empty) {
      throw new Error(`Phone number ${studentData.phone} is already registered.`);
  }

  const availableSeats = await getAvailableSeats(studentData.shift);
  if (!availableSeats.includes(studentData.seatNumber)) {
    throw new Error(`Seat ${studentData.seatNumber} is not available for the ${studentData.shift} shift.`);
  }
  if (!ALL_SEAT_NUMBERS.includes(studentData.seatNumber)) {
    throw new Error("Invalid seat number selected.");
  }
  if (!studentData.password) {
    throw new Error("Password is required for new student registration.");
  }

  const today = new Date();
  let amountDueForShift: string;
  switch (studentData.shift) {
    case "morning": amountDueForShift = `Rs. ${fees.morningFee}`; break;
    case "evening": amountDueForShift = `Rs. ${fees.eveningFee}`; break;
    case "fullday": amountDueForShift = `Rs. ${fees.fullDayFee}`; break;
    default: amountDueForShift = "Rs. 0";
  }

  const newStudentDataTypeConsistent: Omit<Student, 'firestoreId' | 'id'> = {
    studentId: customStudentId,
    name: studentData.name,
    email: studentData.email && studentData.email.trim() !== "" ? studentData.email.toLowerCase() : undefined,
    phone: studentData.phone,
    password: studentData.password,
    shift: studentData.shift,
    seatNumber: studentData.seatNumber,
    idCardFileName: studentData.idCardFileName && studentData.idCardFileName.trim() !== "" ? studentData.idCardFileName : undefined,
    feeStatus: "Due",
    activityStatus: "Active",
    registrationDate: format(today, 'yyyy-MM-dd'),
    amountDue: amountDueForShift,
    nextDueDate: format(addMonths(today, 1), 'yyyy-MM-dd'),
    profilePictureUrl: "https://placehold.co/200x200.png",
    paymentHistory: [],
    readGeneralAlertIds: [],
    fcmTokens: [], // Initialize fcmTokens
  };

  const firestoreReadyData: any = {
    studentId: newStudentDataTypeConsistent.studentId,
    name: newStudentDataTypeConsistent.name,
    phone: newStudentDataTypeConsistent.phone,
    password: newStudentDataTypeConsistent.password,
    shift: newStudentDataTypeConsistent.shift,
    seatNumber: newStudentDataTypeConsistent.seatNumber,
    feeStatus: newStudentDataTypeConsistent.feeStatus,
    activityStatus: newStudentDataTypeConsistent.activityStatus,
    registrationDate: Timestamp.fromDate(parseISO(newStudentDataTypeConsistent.registrationDate)),
    amountDue: newStudentDataTypeConsistent.amountDue,
    nextDueDate: newStudentDataTypeConsistent.nextDueDate ? Timestamp.fromDate(parseISO(newStudentDataTypeConsistent.nextDueDate)) : null,
    profilePictureUrl: newStudentDataTypeConsistent.profilePictureUrl,
    paymentHistory: newStudentDataTypeConsistent.paymentHistory,
    readGeneralAlertIds: newStudentDataTypeConsistent.readGeneralAlertIds,
    fcmTokens: newStudentDataTypeConsistent.fcmTokens, // Add fcmTokens to Firestore data
    email: newStudentDataTypeConsistent.email || null,
    idCardFileName: newStudentDataTypeConsistent.idCardFileName || null,
  };


  const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), firestoreReadyData);

  return {
    ...newStudentDataTypeConsistent,
    id: docRef.id,
    firestoreId: docRef.id,
    email: firestoreReadyData.email === null ? undefined : firestoreReadyData.email,
    idCardFileName: firestoreReadyData.idCardFileName === null ? undefined : firestoreReadyData.idCardFileName,
  };
}

export async function updateStudent(customStudentId: string, studentUpdateData: Partial<Student>): Promise<Student | undefined> {
  const studentToUpdate = await getStudentByCustomId(customStudentId);
  if (!studentToUpdate || !studentToUpdate.firestoreId) {
    throw new Error("Student not found.");
  }

  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentToUpdate.firestoreId);

  const payload: any = { ...studentUpdateData };
  delete payload.firestoreId;
  delete payload.studentId;
  delete payload.id;

  if (payload.registrationDate && typeof payload.registrationDate === 'string') {
    payload.registrationDate = Timestamp.fromDate(parseISO(payload.registrationDate));
  }
  if (payload.lastPaymentDate && typeof payload.lastPaymentDate === 'string') {
    payload.lastPaymentDate = Timestamp.fromDate(parseISO(payload.lastPaymentDate));
  } else if (payload.hasOwnProperty('lastPaymentDate') && payload.lastPaymentDate === undefined) {
    payload.lastPaymentDate = null;
  }
  if (payload.nextDueDate && typeof payload.nextDueDate === 'string') {
    payload.nextDueDate = Timestamp.fromDate(parseISO(payload.nextDueDate));
  } else if (payload.hasOwnProperty('nextDueDate') && payload.nextDueDate === undefined) {
    payload.nextDueDate = null;
  }
  if (payload.paymentHistory) {
    payload.paymentHistory = studentUpdateData.paymentHistory?.map(p => ({
      ...p,
      date: typeof p.date === 'string' ? Timestamp.fromDate(parseISO(p.date)) : p.date,
    }));
  }
   if (payload.email && typeof payload.email === 'string') {
    payload.email = payload.email.toLowerCase();
  } else if (payload.hasOwnProperty('email') && (payload.email === undefined || payload.email === "")) {
    payload.email = null;
  }
  if (payload.hasOwnProperty('idCardFileName') && (payload.idCardFileName === undefined || payload.idCardFileName === "")) {
    payload.idCardFileName = null;
  }
  // Do not automatically convert fcmTokens to Timestamp
  if (payload.fcmTokens && Array.isArray(payload.fcmTokens)) {
    // Ensure it's just an array of strings if it's being updated directly
  }


  const newShift = studentUpdateData.shift || studentToUpdate.shift;
  const newSeatNumber = studentUpdateData.seatNumber !== undefined ? studentUpdateData.seatNumber : studentToUpdate.seatNumber;

  if (newSeatNumber && (newSeatNumber !== studentToUpdate.seatNumber || newShift !== studentToUpdate.shift || (studentUpdateData.activityStatus === 'Active' && studentToUpdate.activityStatus === 'Left'))) {
      const allCurrentStudents = await getAllStudents();
      const isSeatTakenForShift = allCurrentStudents.some(s =>
        s.studentId !== customStudentId &&
        s.activityStatus === "Active" &&
        s.seatNumber === newSeatNumber &&
        (s.shift === "fullday" || newShift === "fullday" || s.shift === newShift)
      );
      if (isSeatTakenForShift) {
        throw new Error(`Seat ${newSeatNumber} is not available for the ${newShift} shift.`);
      }
      if (!ALL_SEAT_NUMBERS.includes(newSeatNumber)) {
          throw new Error("Invalid new seat number selected.");
      }
  }

  if (studentUpdateData.activityStatus === 'Left' && studentToUpdate.activityStatus === 'Active') {
    payload.seatNumber = null;
    payload.feeStatus = 'N/A';
    payload.amountDue = 'N/A';
    payload.lastPaymentDate = null;
    payload.nextDueDate = null;
  } else if (studentUpdateData.activityStatus === 'Active' && studentToUpdate.activityStatus === 'Left') {
    if (!newSeatNumber || !ALL_SEAT_NUMBERS.includes(newSeatNumber)) {
        throw new Error("A valid seat must be selected to re-activate a student.");
    }
    const fees = await getFeeStructure();
    let amountDueForShift: string;
    switch (newShift) {
      case "morning": amountDueForShift = `Rs. ${fees.morningFee}`; break;
      case "evening": amountDueForShift = `Rs. ${fees.eveningFee}`; break;
      case "fullday": amountDueForShift = `Rs. ${fees.fullDayFee}`; break;
      default: amountDueForShift = "Rs. 0";
    }

    payload.feeStatus = 'Due';
    payload.amountDue = amountDueForShift;
    payload.lastPaymentDate = null;
    payload.nextDueDate = Timestamp.fromDate(addMonths(new Date(), 1));
    payload.paymentHistory = [];
  }

  await updateDoc(studentDocRef, payload);
  const updatedDocSnap = await getDoc(studentDocRef);
  let updatedStudent = studentFromDoc(updatedDocSnap);

  const passwordUpdated = studentUpdateData.password && studentUpdateData.password !== studentToUpdate.password && studentUpdateData.password !== "";

  if (studentUpdateData.activityStatus === 'Active' && studentToUpdate.activityStatus === 'Left') {
    const alertMessage = `Welcome back, ${updatedStudent.name}! Your student account has been re-activated.\nYour current details are:\nShift: ${updatedStudent.shift}\nSeat Number: ${updatedStudent.seatNumber}\nYour fee of ${updatedStudent.amountDue} is due by ${updatedStudent.nextDueDate ? format(parseISO(updatedStudent.nextDueDate), 'PP') : 'N/A'}.`;
    await sendAlertToStudent(customStudentId, "Account Re-activated", alertMessage, "info");
  } else if (studentUpdateData.activityStatus === 'Left' && studentToUpdate.activityStatus === 'Active') {
     await sendAlertToStudent(customStudentId, "Account Status Update", `Hi ${updatedStudent.name}, your student account has been marked as 'Left'.`, "info");
  } else if (updatedStudent.activityStatus === 'Active') {
      const profileChanged = (studentUpdateData.name && studentUpdateData.name !== studentToUpdate.name) ||
                             (payload.email !== studentToUpdate.email) ||
                             (studentUpdateData.phone && studentUpdateData.phone !== studentToUpdate.phone) ||
                             (studentUpdateData.shift && studentUpdateData.shift !== studentToUpdate.shift) ||
                             (studentUpdateData.seatNumber !== undefined && studentUpdateData.seatNumber !== studentToUpdate.seatNumber) ||
                             (payload.idCardFileName !== studentToUpdate.idCardFileName) ||
                             (payload.profilePictureUrl && payload.profilePictureUrl !== studentToUpdate.profilePictureUrl) ||
                             passwordUpdated;

      if (profileChanged) {
        let alertMessage = `Hi ${updatedStudent.name}, your profile details have been updated.\nName: ${updatedStudent.name}\nEmail: ${updatedStudent.email || 'N/A'}\nPhone: ${updatedStudent.phone}\nShift: ${updatedStudent.shift}\nSeat: ${updatedStudent.seatNumber || 'N/A'}`;
        if (passwordUpdated) alertMessage += `\nYour password has also been updated.`;
        if (payload.profilePictureUrl && payload.profilePictureUrl !== studentToUpdate.profilePictureUrl) alertMessage += `\nYour profile picture has been updated.`;
        await sendAlertToStudent(customStudentId, "Profile Details Updated", alertMessage, "info");
      }
  }

  return applyAutomaticStatusUpdates(updatedStudent);
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
  attendanceSnapshot.forEach(docSnap => {
    batch.delete(doc(db, ATTENDANCE_COLLECTION, docSnap.id));
  });

  const targetedAlertsQuery = query(collection(db, ALERTS_COLLECTION), where("studentId", "==", customStudentId));
  const targetedAlertsSnapshot = await getDocs(targetedAlertsQuery);
  targetedAlertsSnapshot.forEach(docSnap => {
    batch.delete(doc(db, ALERTS_COLLECTION, docSnap.id));
  });

  const feedbackQuery = query(collection(db, FEEDBACK_COLLECTION), where("studentId", "==", customStudentId));
  const feedbackSnapshot = await getDocs(feedbackQuery);
  feedbackSnapshot.forEach(docSnap => {
    batch.delete(doc(db, FEEDBACK_COLLECTION, docSnap.id));
  });


  await batch.commit();
}


export async function getAvailableSeats(shiftToConsider: Shift): Promise<string[]> {
  const allActiveStudents = (await getAllStudents()).filter(s => s.activityStatus === "Active");
  const available: string[] = [];
  for (const seat of ALL_SEAT_NUMBERS) {
    const isSeatTaken = allActiveStudents.some(s =>
      s.seatNumber === seat &&
      (s.shift === "fullday" || shiftToConsider === "fullday" || s.shift === shiftToConsider)
    );
    if (!isSeatTaken) {
      available.push(seat);
    }
  }
  return available.sort((a, b) => parseInt(a) - parseInt(b));
}

// --- Attendance Service Functions ---
export async function getActiveCheckIn(studentId: string): Promise<AttendanceRecord | undefined> {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("studentId", "==", studentId),
    where("date", "==", todayStr),
    where("checkOutTime", "==", null),
    orderBy("checkInTime", "desc"),
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty ? undefined : attendanceRecordFromDoc(querySnapshot.docs[0]);
}

export async function addCheckIn(studentId: string): Promise<AttendanceRecord> {
  const student = await getStudentByCustomId(studentId);
  if (!student) {
    throw new Error("Student not found for check-in.");
  }

  const now = new Date();
  const currentHour = getHours(now);
  let outsideShift = false;
  const shiftName = student.shift;
  let shiftHoursMessage = "";

  if (student.shift === "morning") {
    shiftHoursMessage = "7 AM - 2 PM";
    if (currentHour < 7 || currentHour >= 14) outsideShift = true;
  } else if (student.shift === "evening") {
    shiftHoursMessage = "3 PM - 10 PM";
    if (currentHour < 15 || currentHour >= 22) outsideShift = true;
  }

  if (outsideShift && studentId) {
    try {
      await sendAlertToStudent(
        studentId,
        "Outside Shift Warning",
        `Hi ${student.name}, you checked in outside your ${shiftName} shift (${shiftHoursMessage}). Please adhere to timings.`,
        "warning"
      );
    } catch (alertError) { }
  }

  const newRecordData = {
    studentId,
    date: format(now, 'yyyy-MM-dd'),
    checkInTime: Timestamp.fromDate(now),
    checkOutTime: null,
  };
  const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), newRecordData);

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
  return attendanceRecordFromDoc(updatedSnap);
}

export async function getAttendanceForDate(studentId: string, date: string): Promise<AttendanceRecord[]> {
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("studentId", "==", studentId),
    where("date", "==", date),
    orderBy("checkInTime", "asc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(attendanceRecordFromDoc);
}

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
    const q = query(collection(db, ATTENDANCE_COLLECTION), orderBy("checkInTime", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(attendanceRecordFromDoc);
}

export async function getAttendanceRecordsByStudentId(studentId: string): Promise<AttendanceRecord[]> {
  const q = query(collection(db, ATTENDANCE_COLLECTION), where("studentId", "==", studentId), orderBy("checkInTime", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(attendanceRecordFromDoc);
}


// --- Payment and Revenue ---
export async function recordStudentPayment(
  customStudentId: string,
  totalAmountPaidString: string, // This can be "Rs. 0", "N/A", or a specific amount like "Rs. 700"
  paymentMethod: PaymentRecord['method'] | "Admin Recorded",
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
  // If totalAmountPaidString is generic (like "Rs. 0" or "N/A"), calculate based on shift and months.
  // Otherwise, parse the specific amount provided.
  if (totalAmountPaidString === "Rs. 0" || totalAmountPaidString === "N/A" || !totalAmountPaidString.startsWith("Rs.")) {
    amountToPayNumeric = expectedMonthlyFee * numberOfMonthsPaid;
  } else {
    amountToPayNumeric = parseInt(totalAmountPaidString.replace('Rs. ', '').trim(), 10);
    if (isNaN(amountToPayNumeric) || amountToPayNumeric <= 0) {
        throw new Error("Invalid payment amount provided in string.");
    }
  }

  if (paymentMethod !== "Admin Recorded" && amountToPayNumeric < (expectedMonthlyFee * numberOfMonthsPaid)) {
    // This condition might be too strict if allowing partial payments.
    // For now, if not admin recorded, it expects full payment for the number of months.
  }


  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentToUpdate.firestoreId);
  const today = new Date();
  const newPaymentId = `PAY${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 100)).padStart(2,'0')}`;
  const newTransactionId = `TXN${paymentMethod === "Admin Recorded" ? "ADMIN" : (paymentMethod === "UPI" ? "UPI" : "MEM")}${String(Date.now()).slice(-7)}`;

  const newPaymentRecord: PaymentRecord = {
    paymentId: newPaymentId,
    date: format(today, 'yyyy-MM-dd'),
    amount: `Rs. ${amountToPayNumeric}`,
    transactionId: newTransactionId,
    method: paymentMethod === "Admin Recorded" ? "Desk Payment" : paymentMethod,
  };

  const firestorePaymentRecord = {
      ...newPaymentRecord,
      date: Timestamp.fromDate(parseISO(newPaymentRecord.date))
  };

  let baseDateForNextDue = today;
  if (studentToUpdate.nextDueDate && isValid(parseISO(studentToUpdate.nextDueDate)) && parseISO(studentToUpdate.nextDueDate) > today) {
    baseDateForNextDue = parseISO(studentToUpdate.nextDueDate);
  }

  const updatedFeeData = {
    feeStatus: "Paid" as FeeStatus,
    lastPaymentDate: Timestamp.fromDate(today),
    nextDueDate: Timestamp.fromDate(addMonths(baseDateForNextDue, numberOfMonthsPaid)),
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
      `Hi ${updatedStudent.name}, your fee payment of ${newPaymentRecord.amount} for ${numberOfMonthsPaid} month(s) has been recorded. Fees paid up to ${updatedStudent.nextDueDate ? format(parseISO(updatedStudent.nextDueDate), 'PP') : 'N/A'}.`,
      "info"
    );
  } catch (alertError) { }

  return updatedStudent;
}

export async function calculateMonthlyStudyHours(customStudentId: string): Promise<number> {
  const records = await getAttendanceRecordsByStudentId(customStudentId);
  let totalMilliseconds = 0;
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  records.forEach(record => {
    try {
      const checkInDate = parseISO(record.checkInTime);
      if (isValid(checkInDate) && isWithinInterval(checkInDate, { start: currentMonthStart, end: currentMonthEnd })) {
        if (record.checkOutTime) {
          const checkOutDate = parseISO(record.checkOutTime);
          if (isValid(checkOutDate) && checkOutDate.getTime() > checkInDate.getTime()) {
            totalMilliseconds += differenceInMilliseconds(checkOutDate, checkInDate);
          }
        }
      }
    } catch (e) { }
  });
  return Math.round(totalMilliseconds / (1000 * 60 * 60));
}

export async function calculateMonthlyRevenue(): Promise<string> {
  const allStudentsData = await getAllStudents();
  let totalRevenue = 0;
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  allStudentsData.forEach(student => {
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
        } catch (e) { }
      });
    }
  });
  return `Rs. ${totalRevenue.toLocaleString('en-IN')}`;
}

export type MonthlyRevenueData = {
  monthDate: Date;
  monthDisplay: string;
  revenue: number;
};

export async function getMonthlyRevenueHistory(): Promise<MonthlyRevenueData[]> {
  const allStudentsData = await getAllStudents();
  const monthlyRevenueMap: Record<string, number> = {};

  allStudentsData.forEach(student => {
    if (student.paymentHistory) {
      student.paymentHistory.forEach(payment => {
        try {
          const paymentDate = parseISO(payment.date);
          if (isValid(paymentDate)) {
            const monthKey = format(paymentDate, 'yyyy-MM');
            const amountString = payment.amount.replace('Rs. ', '').trim();
            const amountValue = parseInt(amountString, 10);
            if (!isNaN(amountValue)) {
              monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + amountValue;
            }
          }
        } catch (e) { }
      });
    }
  });

  return Object.entries(monthlyRevenueMap)
    .map(([monthKey, revenue]) => {
      const [year, monthNum] = monthKey.split('-').map(Number);
      const monthDate = new Date(year, monthNum - 1, 1);
      return {
        monthDate: monthDate,
        monthDisplay: format(monthDate, 'MMMM yyyy'),
        revenue: revenue,
      };
    })
    .sort((a, b) => compareDesc(a.monthDate, b.monthDate));
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
  console.log("[StudentService] New feedback submitted, ID:", docRef.id, "Data:", newFeedbackData);

  // TODO: Fetch admin FCM tokens (e.g., from a separate 'admins' collection or config)
  // Example: const adminTokens = await getAllAdminFCMTokens();
  // TODO: For each admin token, call the /api/send-alert-notification endpoint with a specific payload for new feedback
  // Example: for (const token of adminTokens) { /* send notification */ }

  // Dispatch custom event for admin notification
  if (typeof window !== 'undefined') {
    console.log("[StudentService] Dispatching new-feedback-submitted event for ID:", docRef.id);
    window.dispatchEvent(new CustomEvent('new-feedback-submitted', { detail: { feedbackId: docRef.id } }));
  }

  return {
    id: docRef.id,
    ...newFeedbackData,
    studentId: newFeedbackData.studentId === null ? undefined : newFeedbackData.studentId,
    studentName: newFeedbackData.studentName === null ? undefined : newFeedbackData.studentName,
    dateSubmitted: newFeedbackData.dateSubmitted.toDate().toISOString(),
   };
}

export async function getAllFeedback(): Promise<FeedbackItem[]> {
  const q = query(collection(db, FEEDBACK_COLLECTION), orderBy("dateSubmitted", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(feedbackItemFromDoc);
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
    dateSent: Timestamp.fromDate(new Date()),
    isRead: false,
    studentId: null,
  };
  const docRef = await addDoc(collection(db, ALERTS_COLLECTION), newAlertData);

  const apiPayload = {
    alertId: docRef.id,
    title,
    message,
    type,
  };
  console.log("[StudentService] Preparing to send general alert notification. API Payload:", apiPayload);

  try {
    console.log("[StudentService] Calling API to send general alert notification for alert ID:", docRef.id);
    const response = await fetch('/api/send-alert-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown API error" }));
        console.error("[StudentService] API error for general alert:", response.status, errorData);
    }
  } catch (apiError) {
    console.error("[StudentService] Failed to trigger API for push notification (general alert):", apiError);
  }

  return {
    id: docRef.id,
    studentId: undefined,
    title: newAlertData.title,
    message: newAlertData.message,
    type: newAlertData.type,
    dateSent: newAlertData.dateSent.toDate().toISOString(),
    isRead: newAlertData.isRead,
  };
}

export async function sendAlertToStudent(
  customStudentId: string,
  title: string,
  message: string,
  type: AlertItem['type'],
  originalFeedbackId?: string,
  originalFeedbackMessageSnippet?: string
): Promise<AlertItem> {
  const student = await getStudentByCustomId(customStudentId);
  if (!student && type === 'feedback_response') {
      throw new Error(`Student with ID ${customStudentId} not found for feedback response.`);
  } else if (!student) {
    console.warn(`[StudentService] Student with ID ${customStudentId} not found when sending targeted alert. Alert will be saved.`);
  }

  const newAlertDataForFirestore: any = {
    studentId: customStudentId,
    title,
    message,
    type,
    dateSent: Timestamp.fromDate(new Date()),
    isRead: false,
  };
  if (originalFeedbackId) newAlertDataForFirestore.originalFeedbackId = originalFeedbackId;
  if (originalFeedbackMessageSnippet) newAlertDataForFirestore.originalFeedbackMessageSnippet = originalFeedbackMessageSnippet;

  const docRef = await addDoc(collection(db, ALERTS_COLLECTION), newAlertDataForFirestore);

  const apiPayload = {
    alertId: docRef.id,
    studentId: customStudentId,
    title,
    message,
    type,
    originalFeedbackId,
    originalFeedbackMessageSnippet
  };
  console.log(`[StudentService] Preparing to send targeted alert to student ${customStudentId}. API Payload:`, apiPayload);

  try {
    console.log(`[StudentService] Calling API to send targeted alert notification for student ${customStudentId}, alert ID: ${docRef.id}`);
    const response = await fetch('/api/send-alert-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown API error" }));
        console.error(`[StudentService] API error for targeted alert (student ${customStudentId}):`, response.status, errorData);
    }
  } catch (apiError) {
    console.error(`[StudentService] Failed to trigger API for push notification (student ${customStudentId}):`, apiError);
  }

  const newAlertDataForReturn: AlertItem = {
    id: docRef.id,
    studentId: newAlertDataForFirestore.studentId,
    title: newAlertDataForFirestore.title,
    message: newAlertDataForFirestore.message,
    type: newAlertDataForFirestore.type,
    dateSent: newAlertDataForFirestore.dateSent.toDate().toISOString(),
    isRead: newAlertDataForFirestore.isRead,
    ...(originalFeedbackId && { originalFeedbackId }),
    ...(originalFeedbackMessageSnippet && { originalFeedbackMessageSnippet }),
  };
  return newAlertDataForReturn;
}


export async function getAlertsForStudent(customStudentId: string): Promise<AlertItem[]> {
  const student = await getStudentByCustomId(customStudentId);
  if (!student || !student.firestoreId) return [];

  const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
  const studentSnap = await getDoc(studentDocRef);
  const studentData = studentSnap.data() as Student | undefined;
  const readGeneralAlertIdsSet = new Set(studentData?.readGeneralAlertIds || []);

  const targetedQuery = query(
    collection(db, ALERTS_COLLECTION),
    where("studentId", "==", customStudentId)
  );

  const generalAlertsQuery = query(
      collection(db, ALERTS_COLLECTION),
      where("studentId", "==", null)
  );

  const targetedAlertsSnapshot = await getDocs(targetedQuery);
  const studentAlerts = targetedAlertsSnapshot.docs.map(alertItemFromDoc);

  const generalAlertsSnapshot = await getDocs(generalAlertsQuery);
  const generalAlerts = generalAlertsSnapshot.docs
      .map(alertItemFromDoc)
      .filter(alert => alert.type !== 'feedback_response');


  const contextualizedAlerts = [
    ...studentAlerts,
    ...generalAlerts.map(alert => ({
      ...alert,
      isRead: readGeneralAlertIdsSet.has(alert.id)
    }))
  ];

  return contextualizedAlerts.sort((a, b) => parseISO(b.dateSent).getTime() - parseISO(a.dateSent).getTime());
}


export async function getAllAdminSentAlerts(): Promise<AlertItem[]> {
  const q = query(collection(db, ALERTS_COLLECTION), orderBy("dateSent", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(alertItemFromDoc);
}


export async function markAlertAsRead(alertId: string, customStudentId: string): Promise<AlertItem | undefined> {
    const alertDocRef = doc(db, ALERTS_COLLECTION, alertId);
    const alertSnap = await getDoc(alertDocRef);

    if (!alertSnap.exists()) {
        throw new Error("Alert not found.");
    }
    const alertData = alertItemFromDoc(alertSnap);

    if (alertData.studentId === customStudentId) {
        // This is a targeted alert for this student
        if (!alertData.isRead) {
            await updateDoc(alertDocRef, { isRead: true });
            return { ...alertData, isRead: true };
        }
        return alertData; // Already read
    } else if (!alertData.studentId) {
        // This is a general alert, mark as read in the student's record
        const student = await getStudentByCustomId(customStudentId);
        if (student && student.firestoreId) {
            const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
            const studentDocSnap = await getDoc(studentDocRef);
            const currentStudentData = studentDocSnap.data();
            const readIds = currentStudentData?.readGeneralAlertIds || [];

            if (!readIds.includes(alertId)) {
                await updateDoc(studentDocRef, {
                    readGeneralAlertIds: arrayUnion(alertId)
                });
            }
            return { ...alertData, isRead: true }; // Mark as read for contextual display
        } else {
            throw new Error("Student not found to mark general alert as read.");
        }
    }
    else {
        // This alert is targeted to a different student, do nothing for current student
        return alertData;
    }
}


// --- Firebase Storage Service Functions ---
export async function uploadProfilePictureToStorage(studentFirestoreId: string, file: File): Promise<string> {
  if (!studentFirestoreId) {
    throw new Error("Student Firestore ID is required for uploading profile picture.");
  }
  if (!file) {
    throw new Error("File is required for uploading profile picture.");
  }

  const fileExtension = file.name.split('.').pop();
  const fileName = `profilePicture.${fileExtension}`;
  const imageRef = storageRef(storage, `profilePictures/${studentFirestoreId}/${fileName}`);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(imageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
      },
      (error) => {
        console.error("Upload to Firebase Storage failed:", error);
        switch (error.code) {
          case 'storage/unauthorized':
            reject(new Error("Permission denied to upload. Check Firebase Storage security rules."));
            break;
          case 'storage/canceled':
            reject(new Error("Upload canceled."));
            break;
          default:
            reject(new Error("Failed to upload profile picture: " + error.message));
        }
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error("Failed to get download URL from Firebase Storage:", error);
          reject(new Error("Failed to get download URL after upload."));
        }
      }
    );
  });
}

// --- Data Management Service Functions ---
export interface BatchImportSummary {
  processedCount: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export async function batchImportStudents(studentsToImport: AddStudentData[]): Promise<BatchImportSummary> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const studentData of studentsToImport) {
    try {
      if (!studentData.name || !studentData.phone || !studentData.password || !studentData.shift || !studentData.seatNumber) {
        throw new Error(`Missing required fields for student: ${studentData.name || 'N/A (Row missing name)'}`);
      }
      await addStudent(studentData);
      successCount++;
    } catch (error: any) {
      console.error(`Error importing student ${studentData.name || studentData.phone}:`, error.message);
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
        errors.push(`Row ${i + 2}: Missing Student ID, Date, or Check-In Time.`);
        errorCount++;
        continue;
      }

      const student = await getStudentByCustomId(record['Student ID']);
      if (!student) {
        errors.push(`Row ${i + 2}: Student ID "${record['Student ID']}" not found.`);
        errorCount++;
        continue;
      }

      let parsedDate: Date;
      if (isValid(parseISO(record['Date']))) {
          parsedDate = parseISO(record['Date']);
      } else {
          errors.push(`Row ${i + 2}: Invalid Date format "${record['Date']}". Expected YYYY-MM-DD.`);
          errorCount++;
          continue;
      }

      let checkInDateTime: Date;
      const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
      if (timeRegex.test(record['Check-In Time'])) {
        const [hours, minutes, seconds] = record['Check-In Time'].split(':').map(Number);
        checkInDateTime = setSeconds(setMinutes(setHours(parsedDate, hours), minutes), seconds);
      } else if (isValid(parseISO(record['Check-In Time']))) {
        checkInDateTime = parseISO(record['Check-In Time']);
      } else {
        errors.push(`Row ${i + 2}: Invalid Check-In Time format "${record['Check-In Time']}". Expected HH:MM:SS or full ISO string.`);
        errorCount++;
        continue;
      }

      let checkOutDateTime: Date | null = null;
      if (record['Check-Out Time'] && record['Check-Out Time'].trim() !== "") {
        if (timeRegex.test(record['Check-Out Time'])) {
          const [hours, minutes, seconds] = record['Check-Out Time'].split(':').map(Number);
          checkOutDateTime = setSeconds(setMinutes(setHours(parsedDate, hours), minutes), seconds);
        } else if (isValid(parseISO(record['Check-Out Time']))) {
          checkOutDateTime = parseISO(record['Check-Out Time']);
        } else {
          errors.push(`Row ${i + 2}: Invalid Check-Out Time format "${record['Check-Out Time']}". Expected HH:MM:SS or full ISO string, or leave blank.`);
          errorCount++;
          continue;
        }
      }

      if (checkOutDateTime && checkOutDateTime <= checkInDateTime) {
        errors.push(`Row ${i+2}: Check-Out Time must be after Check-In Time for Student ID ${record['Student ID']}.`);
        errorCount++;
        continue;
      }

      const newRecordRef = doc(collection(db, ATTENDANCE_COLLECTION));
      batch.set(newRecordRef, {
        studentId: record['Student ID'],
        date: format(parsedDate, 'yyyy-MM-dd'),
        checkInTime: Timestamp.fromDate(checkInDateTime),
        checkOutTime: checkOutDateTime ? Timestamp.fromDate(checkOutDateTime) : null,
      });
      operationCount++;
      successCount++;

      if (operationCount >= 499) {
        await batch.commit();
        // batch = writeBatch(db);
        operationCount = 0;
      }

    } catch (error: any) {
      console.error(`Error importing attendance for student ${record['Student ID']}:`, error.message);
      errors.push(`Row ${i + 2} (Student ID ${record['Student ID']}): ${error.message}`);
      errorCount++;
    }
  }
  if (operationCount > 0) {
    await batch.commit();
  }
  return { processedCount: recordsToImport.length, successCount, errorCount, errors };
}

export async function batchImportPayments(recordsToImport: PaymentImportData[]): Promise<BatchImportSummary> {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  const batch = writeBatch(db);
  let operationCount = 0;


  for (let i = 0; i < recordsToImport.length; i++) {
    const record = recordsToImport[i];
    try {
      if (!record['Student ID'] || !record['Date'] || !record['Amount']) {
        errors.push(`Row ${i + 2}: Missing Student ID, Date, or Amount.`);
        errorCount++;
        continue;
      }

      const student = await getStudentByCustomId(record['Student ID']);
      if (!student || !student.firestoreId) {
        errors.push(`Row ${i + 2}: Student ID "${record['Student ID']}" not found.`);
        errorCount++;
        continue;
      }

      let parsedDate: Date;
      if (isValid(parseISO(record['Date']))) {
          parsedDate = parseISO(record['Date']);
      } else {
          errors.push(`Row ${i + 2}: Invalid Date format "${record['Date']}". Expected YYYY-MM-DD.`);
          errorCount++;
          continue;
      }

      const amountNumeric = parseInt(record['Amount'].replace(/Rs\.?\s*/, '').replace(/,/g, ''), 10);
      if (isNaN(amountNumeric) || amountNumeric <= 0) {
        errors.push(`Row ${i + 2}: Invalid Amount "${record['Amount']}". Must be a positive number.`);
        errorCount++;
        continue;
      }

      const newPaymentId = `PAYIMP${String(Date.now()).slice(-5)}${String(Math.floor(Math.random() * 100)).padStart(2, '0')}`;
      const newTransactionId = record['Transaction ID'] || `IMP-${Date.now().toString().slice(-6)}`;
      const method = record['Method'] || "Imported";

      const paymentRecord: PaymentRecord = {
        paymentId: newPaymentId,
        date: format(parsedDate, 'yyyy-MM-dd'),
        amount: `Rs. ${amountNumeric}`,
        transactionId: newTransactionId,
        method: method as PaymentRecord['method'],
      };

      const firestorePaymentRecord = {
          ...paymentRecord,
          date: Timestamp.fromDate(parsedDate)
      };

      const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
      batch.update(studentDocRef, {
        paymentHistory: arrayUnion(firestorePaymentRecord)
      });
      operationCount++;
      successCount++;

      if (operationCount >= 499) {
        await batch.commit();
        // batch = writeBatch(db);
        operationCount = 0;
      }

    } catch (error: any) {
      console.error(`Error importing payment for student ${record['Student ID']}:`, error.message);
      errors.push(`Row ${i + 2} (Student ID ${record['Student ID']}): ${error.message}`);
      errorCount++;
    }
  }
  if (operationCount > 0) {
    await batch.commit();
  }
  return { processedCount: recordsToImport.length, successCount, errorCount, errors };
}

export async function deleteAllData(): Promise<void> {
  const collectionsToDelete = [
    STUDENTS_COLLECTION,
    ADMINS_COLLECTION, // Include admins collection for deletion
    ATTENDANCE_COLLECTION,
    FEEDBACK_COLLECTION,
    ALERTS_COLLECTION,
    APP_CONFIG_COLLECTION,
  ];

  for (const collectionName of collectionsToDelete) {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    if (snapshot.empty) {
        console.log(`Collection ${collectionName} is already empty.`);
        continue;
    }
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log(`All documents in ${collectionName} have been deleted.`);
  }
}


export async function getAllStudentsWithPaymentHistory(): Promise<Student[]> {
  return getAllStudents();
}

// --- FCM Token Management ---
export async function saveStudentFCMToken(studentFirestoreId: string, token: string): Promise<void> {
  if (!studentFirestoreId) {
    console.warn("[StudentService] Cannot save FCM token without student Firestore ID.");
    return;
  }
  console.log("[StudentService] saveStudentFCMToken: Received studentFirestoreId:", studentFirestoreId, "token:", token ? token.substring(0,15) + "..." : "NULL_TOKEN");
  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentFirestoreId);
  try {
    await updateDoc(studentDocRef, {
      fcmTokens: arrayUnion(token) // Add new token to the array
    });
    console.log("[StudentService] FCM token saved successfully for student:", studentFirestoreId, token.substring(0,10) + "...");
  } catch (error) {
    console.error("[StudentService] Error saving FCM token for student:", studentFirestoreId, error);
  }
}

export async function removeFCMTokenForStudent(studentFirestoreId: string, tokenToRemove: string): Promise<void> {
  if (!studentFirestoreId) {
    console.warn("[StudentService] Cannot remove student FCM token without student Firestore ID.");
    return;
  }
  if (!tokenToRemove) {
    console.warn("[StudentService] No token provided for removal for student:", studentFirestoreId);
    return;
  }
  console.log("[StudentService] removeFCMTokenForStudent: studentFirestoreId:", studentFirestoreId, "tokenToRemove:", tokenToRemove.substring(0,15) + "...");
  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentFirestoreId);
  try {
    await updateDoc(studentDocRef, {
      fcmTokens: arrayRemove(tokenToRemove)
    });
    console.log("[StudentService] FCM token removed for student:", studentFirestoreId, tokenToRemove.substring(0,10) + "...");
  } catch (error) {
    console.error("[StudentService] Error removing FCM token for student:", studentFirestoreId, error);
  }
}

// --- Admin FCM Token Management ---
export async function getAdminByEmail(email: string): Promise<AdminUserFirestore | undefined> {
  console.log("[StudentService] getAdminByEmail called for:", email);
  const q = query(collection(db, ADMINS_COLLECTION), where("email", "==", email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    console.log("[StudentService] No admin found with email:", email);
    return undefined;
  }
  const adminData = adminUserFromDoc(querySnapshot.docs[0]);
  console.log("[StudentService] Admin found:", adminData.email, "Firestore ID:", adminData.firestoreId);
  return adminData;
}

export async function saveAdminFCMToken(adminFirestoreId: string, token: string): Promise<void> {
  if (!adminFirestoreId) {
    console.warn("[StudentService] Cannot save FCM token without admin Firestore ID.");
    return;
  }
   console.log("[StudentService] saveAdminFCMToken: Received adminFirestoreId:", adminFirestoreId, "token:", token ? token.substring(0,15) + "..." : "NULL_TOKEN");
  const adminDocRef = doc(db, ADMINS_COLLECTION, adminFirestoreId);
  try {
    await updateDoc(adminDocRef, {
      fcmTokens: arrayUnion(token)
    });
    console.log("[StudentService] FCM token saved successfully for admin:", adminFirestoreId, token.substring(0,10) + "...");
  } catch (error) {
    console.error("[StudentService] Error saving FCM token for admin:", adminFirestoreId, error);
    // It's possible the admin doc doesn't exist yet if not manually created.
    // For a robust system, you might create it here if it doesn't exist.
    // For now, we assume it's manually created as per instructions.
  }
}

export async function removeAdminFCMToken(adminFirestoreId: string, tokenToRemove: string): Promise<void> {
  if (!adminFirestoreId) {
    console.warn("[StudentService] Cannot remove admin FCM token without admin Firestore ID.");
    return;
  }
  if (!tokenToRemove) {
    console.warn("[StudentService] No token provided for removal for admin:", adminFirestoreId);
    return;
  }
  console.log("[StudentService] removeAdminFCMToken: adminFirestoreId:", adminFirestoreId, "tokenToRemove:", tokenToRemove.substring(0,15) + "...");
  const adminDocRef = doc(db, ADMINS_COLLECTION, adminFirestoreId);
  try {
    await updateDoc(adminDocRef, {
      fcmTokens: arrayRemove(tokenToRemove)
    });
    console.log("[StudentService] FCM token removed for admin:", adminFirestoreId, tokenToRemove.substring(0,10) + "...");
  } catch (error) {
    console.error("[StudentService] Error removing FCM token for admin:", adminFirestoreId, error);
  }
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
