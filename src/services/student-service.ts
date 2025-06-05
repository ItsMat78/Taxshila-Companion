
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
  limit, // Added limit to imports
  serverTimestamp
} from '@/lib/firebase';
import type { Student, Shift, FeeStatus, PaymentRecord, ActivityStatus, AttendanceRecord } from '@/types/student';
import type { FeedbackItem, FeedbackType, FeedbackStatus, AlertItem } from '@/types/communication';
import { format, parseISO, differenceInDays, isPast, addMonths, subHours, subMinutes, startOfDay, endOfDay, isValid, differenceInMilliseconds, startOfMonth, endOfMonth, isWithinInterval, subMonths, getHours, compareDesc, getYear, getMonth } from 'date-fns';

// --- Collections ---
const STUDENTS_COLLECTION = "students";
const ATTENDANCE_COLLECTION = "attendanceRecords";
const FEEDBACK_COLLECTION = "feedbackItems";
const ALERTS_COLLECTION = "alertItems";

export const ALL_SEAT_NUMBERS: string[] = [];
for (let i = 1; i <= 85; i++) {
  if (i !== 17) {
    ALL_SEAT_NUMBERS.push(String(i));
  }
}
ALL_SEAT_NUMBERS.sort((a, b) => parseInt(a) - parseInt(b));

// --- Helper to convert Firestore Timestamps in student data ---
const studentFromDoc = (docSnapshot: any): Student => {
  const data = docSnapshot.data();
  return {
    ...data,
    firestoreId: docSnapshot.id, // Store Firestore document ID
    registrationDate: data.registrationDate instanceof Timestamp ? format(data.registrationDate.toDate(), 'yyyy-MM-dd') : data.registrationDate,
    lastPaymentDate: data.lastPaymentDate instanceof Timestamp ? format(data.lastPaymentDate.toDate(), 'yyyy-MM-dd') : data.lastPaymentDate,
    nextDueDate: data.nextDueDate instanceof Timestamp ? format(data.nextDueDate.toDate(), 'yyyy-MM-dd') : data.nextDueDate,
    paymentHistory: (data.paymentHistory || []).map((p: any) => ({
      ...p,
      date: p.date instanceof Timestamp ? format(p.date.toDate(), 'yyyy-MM-dd') : p.date,
    })),
  } as Student;
};

const attendanceRecordFromDoc = (docSnapshot: any): AttendanceRecord => {
  const data = docSnapshot.data();
  return {
    ...data,
    firestoreId: docSnapshot.id,
    date: data.date instanceof Timestamp ? format(data.date.toDate(), 'yyyy-MM-dd') : data.date,
    checkInTime: data.checkInTime instanceof Timestamp ? data.checkInTime.toDate().toISOString() : data.checkInTime,
    checkOutTime: data.checkOutTime instanceof Timestamp ? data.checkOutTime.toDate().toISOString() : data.checkOutTime,
  } as AttendanceRecord;
};

const feedbackItemFromDoc = (docSnapshot: any): FeedbackItem => {
  const data = docSnapshot.data();
  return {
    ...data,
    firestoreId: docSnapshot.id,
    dateSubmitted: data.dateSubmitted instanceof Timestamp ? data.dateSubmitted.toDate().toISOString() : data.dateSubmitted,
  } as FeedbackItem;
};

const alertItemFromDoc = (docSnapshot: any): AlertItem => {
  const data = docSnapshot.data();
  return {
    ...data,
    firestoreId: docSnapshot.id,
    dateSent: data.dateSent instanceof Timestamp ? data.dateSent.toDate().toISOString() : data.dateSent,
  } as AlertItem;
};


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
        console.log(`Auto-marking student ${updatedStudent.studentId} (${updatedStudent.name}) as Left due to overdue fees.`);
        updatedStudent = {
            ...updatedStudent,
            activityStatus: 'Left',
            seatNumber: null,
            feeStatus: "N/A",
            amountDue: "N/A",
            lastPaymentDate: undefined,
            nextDueDate: undefined,
        };
        // Persist this change to Firestore
        if (updatedStudent.firestoreId) {
             await updateDoc(doc(db, STUDENTS_COLLECTION, updatedStudent.firestoreId), {
                activityStatus: 'Left',
                seatNumber: null, // Use null for Firestore
                feeStatus: "N/A",
                amountDue: "N/A",
                lastPaymentDate: null, // Use null
                nextDueDate: null, // Use null
             });
        }
      }
    } catch (e) {
      console.error(`Error parsing date for student ${updatedStudent.studentId}: ${updatedStudent.nextDueDate}`, e);
    }
  }
  // Update fee status to Overdue if due date is past
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
        console.error(`Error processing fee status for student ${updatedStudent.studentId}: ${updatedStudent.nextDueDate}`, e);
    }
  }
  return updatedStudent;
}


export async function getAllStudents(): Promise<Student[]> {
  const q = query(collection(db, STUDENTS_COLLECTION));
  const querySnapshot = await getDocs(q);
  let studentsList: Student[] = [];
  querySnapshot.forEach((doc) => {
    studentsList.push(studentFromDoc(doc));
  });
  // Apply updates after fetching all
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
// Alias getStudentById to getStudentByCustomId for compatibility
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
  // Try by email
  const emailQuery = query(collection(db, STUDENTS_COLLECTION), where("email", "==", identifier.toLowerCase()));
  let querySnapshot = await getDocs(emailQuery);
  if (!querySnapshot.empty) {
    student = studentFromDoc(querySnapshot.docs[0]);
  } else {
    // Try by phone
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

  // Check if customStudentId already exists
  const existingStudentById = await getStudentByCustomId(customStudentId);
  if (existingStudentById) {
    throw new Error(`Generated Student ID ${customStudentId} already exists. Please try again.`);
  }
  // Check if email already exists
  if (studentData.email) {
    const existingStudentByEmail = await getStudentByEmail(studentData.email);
    if (existingStudentByEmail) {
      throw new Error(`Email ${studentData.email} is already registered.`);
    }
  }
  // Check if phone already exists
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
  const newStudentData: Omit<Student, 'firestoreId'> = {
    studentId: customStudentId,
    name: studentData.name,
    email: studentData.email ? studentData.email.toLowerCase() : undefined,
    phone: studentData.phone,
    password: studentData.password,
    shift: studentData.shift,
    seatNumber: studentData.seatNumber,
    idCardFileName: studentData.idCardFileName || undefined,
    feeStatus: "Due",
    activityStatus: "Active",
    registrationDate: format(today, 'yyyy-MM-dd'), // Store as string
    amountDue: studentData.shift === "fullday" ? "Rs. 1200" : "Rs. 700",
    nextDueDate: format(addMonths(today, 1), 'yyyy-MM-dd'), // Store as string
    profilePictureUrl: "https://placehold.co/200x200.png",
    paymentHistory: [],
    readGeneralAlertIds: [], // Initialize for Firestore
  };

  // Convert dates to Timestamps for Firestore
  const firestoreReadyData = {
    ...newStudentData,
    registrationDate: Timestamp.fromDate(parseISO(newStudentData.registrationDate)),
    nextDueDate: newStudentData.nextDueDate ? Timestamp.fromDate(parseISO(newStudentData.nextDueDate)) : null,
  };

  const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), firestoreReadyData);
  return { ...newStudentData, firestoreId: docRef.id };
}

export async function updateStudent(customStudentId: string, studentUpdateData: Partial<Student>): Promise<Student | undefined> {
  const studentToUpdate = await getStudentByCustomId(customStudentId);
  if (!studentToUpdate || !studentToUpdate.firestoreId) {
    throw new Error("Student not found.");
  }

  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentToUpdate.firestoreId);

  // Prepare update payload, converting dates to Timestamps
  const payload: any = { ...studentUpdateData };
  delete payload.firestoreId; // Don't try to write firestoreId back
  delete payload.studentId; // Don't allow changing the custom studentId

  if (payload.registrationDate && typeof payload.registrationDate === 'string') {
    payload.registrationDate = Timestamp.fromDate(parseISO(payload.registrationDate));
  }
  if (payload.lastPaymentDate && typeof payload.lastPaymentDate === 'string') {
    payload.lastPaymentDate = Timestamp.fromDate(parseISO(payload.lastPaymentDate));
  } else if (payload.lastPaymentDate === undefined && studentUpdateData.hasOwnProperty('lastPaymentDate')) {
    payload.lastPaymentDate = null;
  }
  if (payload.nextDueDate && typeof payload.nextDueDate === 'string') {
    payload.nextDueDate = Timestamp.fromDate(parseISO(payload.nextDueDate));
  } else if (payload.nextDueDate === undefined && studentUpdateData.hasOwnProperty('nextDueDate')) {
    payload.nextDueDate = null;
  }
  if (payload.paymentHistory) {
    payload.paymentHistory = studentUpdateData.paymentHistory?.map(p => ({
      ...p,
      date: typeof p.date === 'string' ? Timestamp.fromDate(parseISO(p.date)) : p.date,
    }));
  }
   if (payload.email) {
    payload.email = payload.email.toLowerCase();
  }


  // Seat availability check if seat or shift changes
  const newShift = studentUpdateData.shift || studentToUpdate.shift;
  const newSeatNumber = studentUpdateData.seatNumber !== undefined ? studentUpdateData.seatNumber : studentToUpdate.seatNumber;

  if (newSeatNumber && (newSeatNumber !== studentToUpdate.seatNumber || newShift !== studentToUpdate.shift || (studentUpdateData.activityStatus === 'Active' && studentToUpdate.activityStatus === 'Left'))) {
      const allCurrentStudents = await getAllStudents();
      const isSeatTakenForShift = allCurrentStudents.some(s =>
        s.studentId !== customStudentId && // Exclude current student
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
  
  // Handle status changes
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
    payload.feeStatus = 'Due';
    payload.amountDue = newShift === "fullday" ? "Rs. 1200" : "Rs. 700";
    payload.lastPaymentDate = null;
    payload.nextDueDate = Timestamp.fromDate(addMonths(new Date(), 1));
    payload.paymentHistory = []; // Reset payment history on reactivation
  }

  await updateDoc(studentDocRef, payload);
  const updatedDoc = await getDoc(studentDocRef);
  let updatedStudent = studentFromDoc(updatedDoc);

  // Send alerts for status changes or significant profile updates
  const passwordUpdated = studentUpdateData.password && studentUpdateData.password !== studentToUpdate.password && studentUpdateData.password !== "";

  if (studentUpdateData.activityStatus === 'Active' && studentToUpdate.activityStatus === 'Left') {
    const alertMessage = `Welcome back, ${updatedStudent.name}! Your student account has been re-activated.\nYour current details are:\nShift: ${updatedStudent.shift}\nSeat Number: ${updatedStudent.seatNumber}\nYour fee of ${updatedStudent.amountDue} is due by ${updatedStudent.nextDueDate ? format(parseISO(updatedStudent.nextDueDate), 'PP') : 'N/A'}.`;
    await sendAlertToStudent(customStudentId, "Account Re-activated", alertMessage, "info");
  } else if (studentUpdateData.activityStatus === 'Left' && studentToUpdate.activityStatus === 'Active') {
     await sendAlertToStudent(customStudentId, "Account Status Update", `Hi ${updatedStudent.name}, your student account has been marked as 'Left'.`, "info");
  } else if (updatedStudent.activityStatus === 'Active') {
      const profileChanged = (studentUpdateData.name && studentUpdateData.name !== studentToUpdate.name) ||
                             (studentUpdateData.email !== undefined && studentUpdateData.email !== studentToUpdate.email) ||
                             (studentUpdateData.phone && studentUpdateData.phone !== studentToUpdate.phone) ||
                             (studentUpdateData.shift && studentUpdateData.shift !== studentToUpdate.shift) ||
                             (studentUpdateData.seatNumber !== undefined && studentUpdateData.seatNumber !== studentToUpdate.seatNumber) ||
                             (studentUpdateData.idCardFileName !== undefined && studentUpdateData.idCardFileName !== studentToUpdate.idCardFileName) ||
                             passwordUpdated;

      if (profileChanged) {
        let alertMessage = `Hi ${updatedStudent.name}, your profile details have been updated.\nName: ${updatedStudent.name}\nEmail: ${updatedStudent.email || 'N/A'}\nPhone: ${updatedStudent.phone}\nShift: ${updatedStudent.shift}\nSeat: ${updatedStudent.seatNumber || 'N/A'}`;
        if (passwordUpdated) alertMessage += `\nYour password has also been updated.`;
        await sendAlertToStudent(customStudentId, "Profile Details Updated", alertMessage, "info");
      }
  }
  
  return applyAutomaticStatusUpdates(updatedStudent);
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
  const todayStr = format(new Date(), 'yyyy-MM-dd'); // Stored as string
  const q = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("studentId", "==", studentId),
    where("date", "==", todayStr),
    where("checkOutTime", "==", null), // Firestore way to check for non-existence or null
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
    } catch (alertError) { console.error("Failed to send outside shift alert:", alertError); }
  }

  const newRecordData = {
    studentId,
    date: format(now, 'yyyy-MM-dd'), // Store as string
    checkInTime: Timestamp.fromDate(now),
    checkOutTime: null, // Explicitly null for Firestore
  };
  const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), newRecordData);
  // To return AttendanceRecord, convert Timestamps back
  return {
    recordId: docRef.id, // Use Firestore ID as recordId
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
  // date is YYYY-MM-DD string
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
  totalAmountPaidString: string,
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

  const studentDocRef = doc(db, STUDENTS_COLLECTION, studentToUpdate.firestoreId);
  const today = new Date();
  const newPaymentId = `PAY${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 100)).padStart(2,'0')}`;
  const newTransactionId = `TXN${paymentMethod === "Admin Recorded" ? "ADMIN" : (paymentMethod === "UPI" ? "UPI" : "MEM")}${String(Date.now()).slice(-7)}`;

  const newPaymentRecord: PaymentRecord = {
    paymentId: newPaymentId,
    date: format(today, 'yyyy-MM-dd'), // Store as string for consistency in array
    amount: totalAmountPaidString,
    transactionId: newTransactionId,
    method: paymentMethod === "Admin Recorded" ? "Desk Payment" : paymentMethod,
  };
  
  // Convert date to Timestamp for storing in Firestore array if necessary
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
    paymentHistory: arrayUnion(firestorePaymentRecord), // Add to array
  };

  await updateDoc(studentDocRef, updatedFeeData);
  const updatedDoc = await getDoc(studentDocRef);
  const updatedStudent = studentFromDoc(updatedDoc);

  try {
    await sendAlertToStudent(
      customStudentId,
      "Payment Confirmation",
      `Hi ${updatedStudent.name}, your fee payment of ${totalAmountPaidString} for ${numberOfMonthsPaid} month(s) has been recorded. Fees paid up to ${updatedStudent.nextDueDate ? format(parseISO(updatedStudent.nextDueDate), 'PP') : 'N/A'}.`,
      "info"
    );
  } catch (alertError) { console.error("Failed to send payment confirmation alert:", alertError); }

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
    } catch (e) { console.error("Error processing attendance for hour calculation:", record, e); }
  });
  return Math.round(totalMilliseconds / (1000 * 60 * 60));
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
          const paymentDate = parseISO(payment.date); // Dates in student.paymentHistory are strings
          if (isValid(paymentDate) && isWithinInterval(paymentDate, { start: currentMonthStart, end: currentMonthEnd })) {
            const amountString = payment.amount.replace('Rs. ', '').trim();
            const amountValue = parseInt(amountString, 10);
            if (!isNaN(amountValue)) {
              totalRevenue += amountValue;
            }
          }
        } catch (e) { console.error("Error parsing payment date or amount:", payment.date, payment.amount, e); }
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
          const paymentDate = parseISO(payment.date); // Dates in paymentHistory are strings
          if (isValid(paymentDate)) {
            const monthKey = format(paymentDate, 'yyyy-MM');
            const amountString = payment.amount.replace('Rs. ', '').trim();
            const amountValue = parseInt(amountString, 10);
            if (!isNaN(amountValue)) {
              monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + amountValue;
            }
          }
        } catch (e) { console.error(`Error processing payment ${payment.paymentId} for revenue history:`, e); }
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
  studentId: string | undefined, // custom student ID
  studentName: string | undefined,
  message: string,
  type: FeedbackType
): Promise<FeedbackItem> {
  const newFeedbackData = {
    studentId,
    studentName,
    message,
    type,
    dateSubmitted: Timestamp.fromDate(new Date()),
    status: "Open" as FeedbackStatus,
  };
  const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), newFeedbackData);
  return { 
    id: docRef.id, // Use Firestore ID
    ...newFeedbackData,
    dateSubmitted: newFeedbackData.dateSubmitted.toDate().toISOString(), // Convert back for return type
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
  const updatedDoc = await getDoc(feedbackDocRef);
  return updatedDoc.exists() ? feedbackItemFromDoc(updatedDoc) : undefined;
}

export async function sendGeneralAlert(title: string, message: string, type: AlertItem['type']): Promise<AlertItem> {
  const newAlertData = {
    title,
    message,
    type,
    dateSent: Timestamp.fromDate(new Date()),
    isRead: false, // Default for new general alert
    studentId: null, // Explicitly set studentId to null for general alerts
  };
  const docRef = await addDoc(collection(db, ALERTS_COLLECTION), newAlertData);
  return { 
    id: docRef.id, 
    ...newAlertData,
    dateSent: newAlertData.dateSent.toDate().toISOString(),
  };
}

export async function sendAlertToStudent(
  customStudentId: string, // This is the TSMEMXXX ID
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
      console.warn(`Attempted to send targeted alert to non-existent student ID: ${customStudentId} for title: "${title}"`);
  }

  const newAlertData: any = {
    studentId: customStudentId, 
    title,
    message,
    type,
    dateSent: Timestamp.fromDate(new Date()),
    isRead: false, 
  };
  if (originalFeedbackId) newAlertData.originalFeedbackId = originalFeedbackId;
  if (originalFeedbackMessageSnippet) newAlertData.originalFeedbackMessageSnippet = originalFeedbackMessageSnippet;
  
  const docRef = await addDoc(collection(db, ALERTS_COLLECTION), newAlertData);
  return { 
    id: docRef.id,
    ...newAlertData,
    dateSent: newAlertData.dateSent.toDate().toISOString(),
  };
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
      .filter(alert => alert.type !== 'feedback_response'); // Feedback responses should always be targeted


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
        await updateDoc(alertDocRef, { isRead: true });
        return { ...alertData, isRead: true };
    } 
    else if (alertData.studentId === null) { // General alert
        const student = await getStudentByCustomId(customStudentId);
        if (student && student.firestoreId) {
            const studentDocRef = doc(db, STUDENTS_COLLECTION, student.firestoreId);
            await updateDoc(studentDocRef, {
                readGeneralAlertIds: arrayUnion(alertId) 
            });
            return { ...alertData, isRead: true }; 
        } else {
            throw new Error("Student not found to mark general alert as read.");
        }
    }
    else { // Targeted alert for a different student
        console.warn(`Attempt to mark alert ${alertId} as read by wrong student ${customStudentId}. Alert belongs to ${alertData.studentId}`);
        return alertData; // Return original alert data, no change
    }
}

// Extend Student type in student.d.ts to include firestoreId and readGeneralAlertIds
declare module '@/types/student' {
  interface Student {
    firestoreId?: string; // Firestore document ID
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

