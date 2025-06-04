
import type { Student, Shift, FeeStatus, PaymentRecord, ActivityStatus, AttendanceRecord } from '@/types/student';
import type { FeedbackItem, FeedbackType, FeedbackStatus, AlertItem } from '@/types/communication';
import { format, parseISO, differenceInDays, isPast, addMonths, subHours, subMinutes, startOfDay, endOfDay, isValid, differenceInMilliseconds, startOfMonth, endOfMonth, isWithinInterval, subMonths, subDays, getHours } from 'date-fns';

export const ALL_SEAT_NUMBERS: string[] = [];
// Populate seats from 1 to 85, EXCLUDING 17
for (let i = 1; i <= 85; i++) {
  if (i !== 17) {
    ALL_SEAT_NUMBERS.push(String(i));
  }
}
ALL_SEAT_NUMBERS.sort((a, b) => parseInt(a) - parseInt(b));


let students: Student[] = [
  {
    studentId: "TS001",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    phone: "9876543210",
    shift: "morning",
    seatNumber: "1",
    idCardFileName: "aarav_id.jpg",
    feeStatus: "Paid",
    activityStatus: "Active",
    registrationDate: "2024-01-15",
    lastPaymentDate: "2024-06-01",
    nextDueDate: "2024-07-01",
    amountDue: "₹0",
    profilePictureUrl: "https://placehold.co/200x200.png?text=AS",
    paymentHistory: [
        { paymentId: "PAY_TS001_CURRENT", date: format(new Date(), 'yyyy-MM-dd'), amount: "₹700", transactionId: "TXN_TS001_CURRENT", method: "UPI" },
        { paymentId: "PAY001", date: "2024-06-01", amount: "₹700", transactionId: "TXN12345601", method: "UPI" },
        { paymentId: "PAY001B", date: format(subMonths(new Date(),1), 'yyyy-MM-dd'), amount: "₹700", transactionId: "TXN12345PREV", method: "UPI" },
        { paymentId: "PAY_TS001_2MONTHS_AGO", date: format(subMonths(new Date(),2), 'yyyy-MM-dd'), amount: "₹700", transactionId: "TXN_TS001_2MAGO", method: "Cash" },
    ]
  },
  {
    studentId: "TS002",
    name: "Priya Patel",
    email: "priya.patel@example.com",
    phone: "9876543211",
    shift: "evening",
    seatNumber: "2",
    idCardFileName: "priya_id.png",
    feeStatus: "Paid",
    activityStatus: "Active",
    registrationDate: "2024-02-20",
    lastPaymentDate: format(new Date(), 'yyyy-MM-dd'),
    nextDueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    amountDue: "₹0",
    paymentHistory: [
      { paymentId: "PAYMENT_PRIYA_PREV", date: format(new Date(), 'yyyy-MM-dd'), amount: "₹700", transactionId: "TXN_PRIYA_PREV", method: "UPI" },
      { paymentId: "PAYMENT_PRIYA_2MAGO", date: format(subMonths(new Date(), 2), 'yyyy-MM-dd'), amount: "₹700", transactionId: "TXN_PRIYA_2MAGO", method: "Card" },
    ],
    profilePictureUrl: "https://placehold.co/200x200.png?text=PP",
  },
  {
    studentId: "TS003",
    name: "Rohan Mehta (Full Day)",
    email: "rohan.mehta@example.com",
    phone: "9876543212",
    shift: "fullday",
    seatNumber: "35",
    idCardFileName: "rohan_aadhar.jpeg",
    feeStatus: "Overdue",
    activityStatus: "Active",
    registrationDate: "2024-03-10",
    lastPaymentDate: "2024-03-15",
    nextDueDate: format(addMonths(new Date(), -2), 'yyyy-MM-dd'),
    amountDue: "₹1200",
    paymentHistory: [
        { paymentId: "PAY_TS003_1MONTH_AGO", date: format(subMonths(new Date(),1), 'yyyy-MM-dd'), amount: "₹1200", transactionId: "TXN_TS003_1MAGO", method: "UPI" },
    ],
    profilePictureUrl: "https://placehold.co/200x200.png?text=RM",
  },
   { studentId: "TS004", name: "Vikram Singh", email: "vikram.singh@example.com", phone: "9876543213", shift: "evening", seatNumber: "40", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-01", lastPaymentDate: "2024-06-03", nextDueDate: "2024-07-03", amountDue: "₹0", paymentHistory: [{ paymentId: "PAY_TS004_1MONTH_AGO", date: format(subMonths(new Date(),1), 'yyyy-MM-dd'), amount: "₹700", transactionId: "TXN_TS004_1MAGO", method: "Cash" }], profilePictureUrl: "https://placehold.co/200x200.png?text=VS" },
   { studentId: "TS005", name: "Neha Reddy", email: "neha.reddy@example.com", phone: "9876543214", shift: "fullday", seatNumber: "50", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-05", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0", paymentHistory: [{ paymentId: "PAY_TS005_LAST_MONTH", date: format(subMonths(new Date(),1), 'yyyy-MM-dd'), amount: "₹1200", transactionId: "TXN_TS005_LM", method: "Card" }], profilePictureUrl: "https://placehold.co/200x200.png?text=NR" },
   { studentId: "TS006", name: "Old Overdue For Auto-Left", email: "old.overdue@example.com", phone: "9876543215", shift: "morning", seatNumber: "6", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-01-01", lastPaymentDate: "2024-02-01", nextDueDate: format(addMonths(new Date(), -3), 'yyyy-MM-dd'), amountDue: "₹700", paymentHistory: [] },
   { studentId: "TS007", name: "Sanya Gupta Due", email: "sanya.gupta@example.com", phone: "9876543216", shift: "morning", seatNumber: "8", feeStatus: "Due", activityStatus: "Active", registrationDate: "2024-05-01", lastPaymentDate: "2024-05-10", nextDueDate: "2024-06-10", amountDue: "₹700", paymentHistory: [] },
   { studentId: "TS008", name: "Kavita Singh Paid", email: "kavita.singh@example.com", phone: "9876543217", shift: "morning", seatNumber: "10", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-05-10", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0", paymentHistory: [] },
   { studentId: "TS012", name: "Karan Verma Long Overdue", email: "karan.verma@example.com", phone: "9876543221", shift: "evening", seatNumber: "15", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-01-01", lastPaymentDate: "2024-01-20", nextDueDate: format(addMonths(new Date(), -4), 'yyyy-MM-dd'), amountDue: "₹700", paymentHistory: [] },
];

const todayAtFourPM = new Date();
todayAtFourPM.setHours(16, 0, 0, 0);
const todayAtFivePM = new Date();
todayAtFivePM.setHours(17, 0, 0, 0);

let attendanceRecords: AttendanceRecord[] = [
  { recordId: "AR001B_COMPLETED_SAMPLE", studentId: "TS001", date: format(new Date(), 'yyyy-MM-dd'), checkInTime: todayAtFourPM.toISOString(), checkOutTime: todayAtFivePM.toISOString() },
  { recordId: "AR002", studentId: "TS002", date: format(new Date(), 'yyyy-MM-dd'), checkInTime: subHours(new Date(), 1).toISOString(), checkOutTime: subMinutes(new Date(), 15).toISOString() },
  { recordId: "AR003", studentId: "TS001", date: format(subHours(new Date(), 25), 'yyyy-MM-dd'), checkInTime: subHours(new Date(), 25).toISOString(), checkOutTime: subHours(new Date(), 20).toISOString() },
  { recordId: "AR004", studentId: "TS001", date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), checkInTime: subDays(subHours(new Date(), 5), 1).toISOString(), checkOutTime: subDays(subHours(new Date(), 2),1).toISOString() },
  { recordId: "AR005", studentId: "TS001", date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), checkInTime: subDays(subHours(new Date(), 6), 2).toISOString(), checkOutTime: subDays(subHours(new Date(), 1),2).toISOString() },
  { recordId: "AR_TS001_TODAY_COMPLETED", studentId: "TS001", date: format(new Date(), 'yyyy-MM-dd'), checkInTime: subHours(new Date(), 5).toISOString(), checkOutTime: subHours(new Date(), 2).toISOString() },
];

let feedbackItems: FeedbackItem[] = [
    { id: "FB001", studentId: "TS002", studentName: "Priya Patel", dateSubmitted: "2024-06-28", type: "Complaint", message: "The AC in the evening shift section is not working properly. It gets very warm.", status: "Open" },
    { id: "FB002", studentId: "TS005", studentName: "Neha Reddy", dateSubmitted: "2024-06-27", type: "Suggestion", message: "Could we have more charging points available near the window seats?", status: "Open" },
    { id: "FB003", studentId: "TS001", studentName: "Aarav Sharma", dateSubmitted: "2024-06-26", type: "Compliment", message: "The library is always clean and quiet. Great job!", status: "Resolved" },
];

let alertItems: AlertItem[] = [
  { id: "ALERT001", title: "Library Closure Notification", message: "The library will be closed on July 4th for Independence Day. We will reopen on July 5th.", dateSent: "2024-06-28", type: "closure", isRead: false },
  { id: "ALERT002", title: "New Quiet Study Zone", message: "We've opened a new dedicated quiet study zone on the 2nd floor. Please maintain silence.", dateSent: "2024-06-25", type: "info", isRead: false },
  { id: "ALERT003", title: "Maintenance Scheduled", message: "Network maintenance is scheduled for this Sunday from 2 AM to 4 AM. Internet services might be intermittent.", dateSent: "2024-06-20", type: "warning", isRead: false },
];

let studentReadGeneralAlerts: Map<string, Set<string>> = new Map();


function getNextAttendanceRecordId(): string {
  const maxId = attendanceRecords.reduce((max, ar) => {
    if (ar.recordId && ar.recordId.startsWith('AR')) {
      const idNum = parseInt(ar.recordId.replace('AR', ''), 10);
      if (!isNaN(idNum)) {
        return idNum > max ? idNum : max;
      }
    }
    return max;
  }, 0);
  return `AR${String(maxId + 1).padStart(3, '0')}`;
}

function applyAutomaticStatusUpdates(student: Student): Student {
  if (student.activityStatus === 'Active' && student.feeStatus === 'Overdue' && student.nextDueDate) {
    try {
      const dueDate = parseISO(student.nextDueDate);
      const today = new Date();
      const todayDateOnly = startOfDay(today);
      const dueDateOnly = startOfDay(dueDate);

      if (isValid(dueDateOnly) && isPast(dueDateOnly) && differenceInDays(todayDateOnly, dueDateOnly) > 5) {
        console.log(`Auto-marking student ${student.studentId} (${student.name}) as Left due to overdue fees (Due date: ${student.nextDueDate}, Days overdue: ${differenceInDays(todayDateOnly, dueDateOnly)}).`);
        return {
            ...student,
            activityStatus: 'Left',
            seatNumber: null,
            feeStatus: "N/A",
            amountDue: "N/A",
            lastPaymentDate: undefined,
            nextDueDate: undefined,
        };
      }
    } catch (e) {
      console.error(`Error parsing date for student ${student.studentId}: ${student.nextDueDate}`, e);
    }
  }
  return student;
}

function processStudentsForUpdates(studentArray: Student[]): Student[] {
    const processedStudents = studentArray.map(s => {
        let currentStudentState = {...s};

        if (currentStudentState.activityStatus === 'Active' && currentStudentState.feeStatus !== 'Paid' && currentStudentState.nextDueDate) {
            try {
                const dueDate = parseISO(currentStudentState.nextDueDate);
                const today = new Date();
                if (isValid(dueDate) && isPast(dueDate) && currentStudentState.feeStatus !== 'Overdue') {
                    currentStudentState.feeStatus = 'Overdue';
                }
            } catch (e) {
                console.error(`Error processing fee status for student ${currentStudentState.studentId}: ${currentStudentState.nextDueDate}`, e);
            }
        }

        const updatedStudent = applyAutomaticStatusUpdates(currentStudentState);
        const indexInMainArray = students.findIndex(orig => orig.studentId === updatedStudent.studentId);
        if (indexInMainArray !== -1) {
             if (students[indexInMainArray].activityStatus !== updatedStudent.activityStatus ||
                 students[indexInMainArray].seatNumber !== updatedStudent.seatNumber ||
                 students[indexInMainArray].feeStatus !== updatedStudent.feeStatus) {
                students[indexInMainArray] = { ...students[indexInMainArray], ...updatedStudent };
            }
            return students[indexInMainArray];
        }
        return updatedStudent;
    });
    return processedStudents;
}

export function getAllStudents(): Promise<Student[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
        const updatedStudentsList = processStudentsForUpdates([...students]);
        resolve(updatedStudentsList.map(s => ({...s})));
    }, 50);
  });
}

export function getStudentById(studentId: string): Promise<Student | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let studentIdx = students.findIndex(s => s.studentId === studentId);
      if (studentIdx !== -1) {
        const student = students[studentIdx];
        const updatedStudent = applyAutomaticStatusUpdates({...student});
        if (students[studentIdx].activityStatus !== updatedStudent.activityStatus ||
            students[studentIdx].seatNumber !== updatedStudent.seatNumber ||
            students[studentIdx].feeStatus !== updatedStudent.feeStatus) {
           students[studentIdx] = { ...students[studentIdx], ...updatedStudent };
        }
        resolve(students[studentIdx] ? {...students[studentIdx]} : undefined);
      } else {
        resolve(undefined);
      }
    }, 50);
  });
}

export function getStudentByEmail(email: string): Promise<Student | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const studentIdx = students.findIndex(s => s.email === email);
      if (studentIdx !== -1) {
        const student = students[studentIdx];
        const updatedStudent = applyAutomaticStatusUpdates({...student});
        if (students[studentIdx].activityStatus !== updatedStudent.activityStatus ||
            students[studentIdx].seatNumber !== updatedStudent.seatNumber ||
            students[studentIdx].feeStatus !== updatedStudent.feeStatus) {
           students[studentIdx] = { ...students[studentIdx], ...updatedStudent };
        }
        resolve(students[studentIdx] ? {...students[studentIdx]} : undefined);
      } else {
        resolve(undefined);
      }
    }, 50);
  });
}

function getNextStudentId(): string {
  const maxId = students.reduce((max, s) => {
    if (s.studentId && s.studentId.startsWith('TS')) {
        const idNum = parseInt(s.studentId.replace('TS', ''), 10);
        if (!isNaN(idNum)) {
          return idNum > max ? idNum : max;
        }
    }
    return max;
  }, 0);
  return `TS${String(maxId + 1).padStart(3, '0')}`;
}

export interface AddStudentData {
  name: string;
  email?: string;
  phone: string;
  shift: Shift;
  seatNumber: string;
  idCardFileName?: string;
}

export function addStudent(studentData: AddStudentData): Promise<Student> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      processStudentsForUpdates([...students]);

      const isSeatTakenForShift = students.some(s =>
        s.activityStatus === "Active" &&
        s.seatNumber === studentData.seatNumber &&
        (
          s.shift === "fullday" ||
          studentData.shift === "fullday" ||
          s.shift === studentData.shift
        )
      );

      if (isSeatTakenForShift) {
        reject(new Error(`Seat ${studentData.seatNumber} is not available for the ${studentData.shift} shift.`));
        return;
      }
      if (!ALL_SEAT_NUMBERS.includes(studentData.seatNumber)) {
        reject(new Error("Invalid seat number selected."));
        return;
      }

      const today = new Date();
      const newStudent: Student = {
        ...studentData,
        studentId: getNextStudentId(),
        feeStatus: "Due",
        activityStatus: "Active",
        registrationDate: format(today, 'yyyy-MM-dd'),
        amountDue: studentData.shift === "fullday" ? "₹1200" : "₹700",
        nextDueDate: format(addMonths(today, 1), 'yyyy-MM-dd'),
        profilePictureUrl: "https://placehold.co/200x200.png",
        paymentHistory: [],
        email: studentData.email || undefined,
        idCardFileName: studentData.idCardFileName || undefined,
      };
      students.push(newStudent);
      resolve({...newStudent});
    }, 50);
  });
}

export async function updateStudent(studentId: string, studentUpdateData: Partial<Omit<Student, 'studentId'>>): Promise<Student | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      processStudentsForUpdates([...students]);
      const studentIndex = students.findIndex(s => s.studentId === studentId);
      if (studentIndex === -1) {
        reject(new Error("Student not found."));
        return;
      }

      const currentStudent = { ...students[studentIndex] };

      const newShift = studentUpdateData.shift || currentStudent.shift;
      const newSeatNumber = studentUpdateData.seatNumber !== undefined ? studentUpdateData.seatNumber : currentStudent.seatNumber;

      if (newSeatNumber && (newSeatNumber !== currentStudent.seatNumber || newShift !== currentStudent.shift || (studentUpdateData.activityStatus === 'Active' && currentStudent.activityStatus === 'Left'))) {
        const isSeatTakenForShift = students.some(s =>
          s.studentId !== studentId &&
          s.activityStatus === "Active" &&
          s.seatNumber === newSeatNumber &&
          (s.shift === "fullday" || newShift === "fullday" || s.shift === newShift)
        );
        if (isSeatTakenForShift) {
          reject(new Error(`Seat ${newSeatNumber} is not available for the ${newShift} shift.`));
          return;
        }
        if (!ALL_SEAT_NUMBERS.includes(newSeatNumber)) {
            reject(new Error("Invalid new seat number selected."));
            return;
        }
      }

      let tempUpdatedStudentData = { ...currentStudent, ...studentUpdateData };

      if (studentUpdateData.activityStatus === 'Left' && currentStudent.activityStatus === 'Active') {
        tempUpdatedStudentData.seatNumber = null;
        tempUpdatedStudentData.feeStatus = 'N/A';
        tempUpdatedStudentData.amountDue = 'N/A';
        tempUpdatedStudentData.lastPaymentDate = undefined;
        tempUpdatedStudentData.nextDueDate = undefined;
      } else if (studentUpdateData.activityStatus === 'Active' && currentStudent.activityStatus === 'Left') {
        if (!tempUpdatedStudentData.seatNumber || !ALL_SEAT_NUMBERS.includes(tempUpdatedStudentData.seatNumber)) {
            reject(new Error("A valid seat must be selected to re-activate a student."));
            return;
        }
        tempUpdatedStudentData.feeStatus = 'Due';
        tempUpdatedStudentData.amountDue = tempUpdatedStudentData.shift === "fullday" ? "₹1200" : "₹700";
        tempUpdatedStudentData.lastPaymentDate = undefined;
        tempUpdatedStudentData.nextDueDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
        tempUpdatedStudentData.paymentHistory = [];
      }

      students[studentIndex] = { ...tempUpdatedStudentData };
      const newlyUpdatedStudent = { ...students[studentIndex] };

      let alertSentDueToStatusChange = false;
      if (studentUpdateData.activityStatus === 'Active' && currentStudent.activityStatus === 'Left') {
        try {
           const alertMessage = `Welcome back, ${newlyUpdatedStudent.name}! Your student account has been re-activated.\nYour current details are:\nName: ${newlyUpdatedStudent.name}\nEmail: ${newlyUpdatedStudent.email || 'N/A'}\nPhone: ${newlyUpdatedStudent.phone}\nShift: ${newlyUpdatedStudent.shift}\nSeat Number: ${newlyUpdatedStudent.seatNumber}\nID Card File: ${newlyUpdatedStudent.idCardFileName || 'Not Uploaded'}\n\nYour fee of ${newlyUpdatedStudent.amountDue} is due by ${newlyUpdatedStudent.nextDueDate}.`;
          await sendAlertToStudent(studentId, "Account Re-activated", alertMessage, "info");
          alertSentDueToStatusChange = true;
        } catch (e) { console.error("Failed to send re-activation alert:", e); }
      } else if (studentUpdateData.activityStatus === 'Left' && currentStudent.activityStatus === 'Active') {
        try {
          await sendAlertToStudent(studentId, "Account Status Update", `Hi ${newlyUpdatedStudent.name}, your student account has been marked as 'Left'. If this is an error, please contact administration.`, "info");
          alertSentDueToStatusChange = true;
        } catch (e) { console.error("Failed to send marked-as-left alert:", e); }
      }

      const isFeeStatusChangeOnlyToPaid = studentUpdateData.feeStatus === 'Paid' && currentStudent.feeStatus !== 'Paid' && Object.keys(studentUpdateData).length === 1 && studentUpdateData.lastPaymentDate && studentUpdateData.nextDueDate && studentUpdateData.amountDue === "₹0";


      if (!alertSentDueToStatusChange && !isFeeStatusChangeOnlyToPaid && newlyUpdatedStudent.activityStatus === 'Active') {
        const nameChanged = studentUpdateData.name && studentUpdateData.name !== currentStudent.name;
        const emailChanged = studentUpdateData.email !== undefined && studentUpdateData.email !== currentStudent.email;
        const phoneChanged = studentUpdateData.phone && studentUpdateData.phone !== currentStudent.phone;
        const shiftChanged = studentUpdateData.shift && studentUpdateData.shift !== currentStudent.shift;
        const seatChanged = studentUpdateData.seatNumber !== undefined && studentUpdateData.seatNumber !== currentStudent.seatNumber && studentUpdateData.seatNumber !== null;
        const idCardChanged = studentUpdateData.idCardFileName !== undefined && studentUpdateData.idCardFileName !== currentStudent.idCardFileName;

        if (nameChanged || emailChanged || phoneChanged || shiftChanged || seatChanged || idCardChanged) {
          try {
            const alertMessage = `Hi ${newlyUpdatedStudent.name}, your profile details have been updated by an administrator. Your current details are:\nName: ${newlyUpdatedStudent.name}\nEmail: ${newlyUpdatedStudent.email || 'N/A'}\nPhone: ${newlyUpdatedStudent.phone}\nShift: ${newlyUpdatedStudent.shift}\nSeat Number: ${newlyUpdatedStudent.seatNumber || 'N/A'}\nID Card File: ${newlyUpdatedStudent.idCardFileName || 'Not Uploaded'}\n\nPlease review them in your profile.`;
            await sendAlertToStudent(studentId, "Profile Details Updated", alertMessage, "info");
          } catch (e) { console.error("Failed to send profile update alert:", e); }
        }
      }

      resolve({ ...newlyUpdatedStudent });
    }, 50);
  });
}

export function getAvailableSeats(shiftToConsider: Shift): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      processStudentsForUpdates([...students]);
      const available: string[] = [];
      for (const seat of ALL_SEAT_NUMBERS) {
        const isSeatTaken = students.some(s =>
          s.activityStatus === "Active" &&
          s.seatNumber === seat &&
          (
            s.shift === "fullday" ||
            shiftToConsider === "fullday" ||
            s.shift === shiftToConsider
          )
        );
        if (!isSeatTaken) {
          available.push(seat);
        }
      }
      resolve(available.sort((a, b) => parseInt(a) - parseInt(b)));
    }, 50);
  });
}


export function getActiveCheckIn(studentId: string): Promise<AttendanceRecord | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const activeRecord = attendanceRecords
        .filter(ar => ar.studentId === studentId && ar.date === todayStr && !ar.checkOutTime)
        .sort((a, b) => parseISO(b.checkInTime).getTime() - parseISO(a.checkInTime).getTime())[0];
      resolve(activeRecord ? {...activeRecord} : undefined);
    }, 50);
  });
}

export function addCheckIn(studentId: string): Promise<AttendanceRecord> {
  return new Promise(async (resolve, reject) => {
    setTimeout(async () => {
      const student = students.find(s => s.studentId === studentId);
      if (!student) {
        reject(new Error("Student not found for check-in."));
        return;
      }

      const now = new Date();
      const currentHour = getHours(now);

      let outsideShift = false;
      const shiftName = student.shift;
      let shiftHoursMessage = "";

      if (student.shift === "morning") {
        shiftHoursMessage = "7 AM - 2 PM";
        if (currentHour < 7 || currentHour >= 14) {
          outsideShift = true;
        }
      } else if (student.shift === "evening") {
        shiftHoursMessage = "3 PM - 10 PM";
        if (currentHour < 15 || currentHour >= 22) {
          outsideShift = true;
        }
      }


      if (outsideShift) {
        try {
          await sendAlertToStudent(
            studentId,
            "Outside Shift Warning",
            `Hi ${student.name}, you've checked in outside of your registered ${shiftName} shift (${shiftHoursMessage}). Please ensure you adhere to your allocated timings.`,
            "warning"
          );
        } catch (alertError) {
          console.error("Failed to send outside shift alert:", alertError);
        }
      }

      const newRecord: AttendanceRecord = {
        recordId: getNextAttendanceRecordId(),
        studentId,
        date: format(now, 'yyyy-MM-dd'),
        checkInTime: now.toISOString(),
      };
      attendanceRecords.push(newRecord);
      resolve({ ...newRecord });
    }, 50);
  });
}

export function addCheckOut(recordId: string): Promise<AttendanceRecord | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const recordIndex = attendanceRecords.findIndex(ar => ar.recordId === recordId);
      if (recordIndex !== -1) {
        attendanceRecords[recordIndex].checkOutTime = new Date().toISOString();
        resolve({...attendanceRecords[recordIndex]});
      } else {
        resolve(undefined);
      }
    }, 50);
  });
}

export function getAttendanceForDate(studentId: string, date: string): Promise<AttendanceRecord[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        attendanceRecords
          .filter(ar => ar.studentId === studentId && ar.date === date)
          .map(ar => ({...ar}))
          .sort((a,b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime())
      );
    }, 50);
  });
}

export function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(attendanceRecords.map(ar => ({...ar})));
    }, 50);
  });
}

export function getAttendanceRecordsByStudentId(studentId: string): Promise<AttendanceRecord[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        attendanceRecords
          .filter(ar => ar.studentId === studentId)
          .map(ar => ({...ar}))
      );
    }, 50);
  });
}

export async function recordStudentPayment(
  studentId: string,
  paymentAmountInput: string,
  paymentMethod: PaymentRecord['method'] | "Admin Recorded"
): Promise<Student | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      const studentIndex = students.findIndex(s => s.studentId === studentId);
      if (studentIndex === -1) {
        reject(new Error("Student not found."));
        return;
      }

      const student = students[studentIndex];
      if (student.activityStatus === 'Left') {
        reject(new Error("Cannot record payment for a student who has left."));
        return;
      }

      const today = new Date();
      const newPaymentId = `PAY${String(Date.now()).slice(-6)}${String(Math.floor(Math.random() * 100)).padStart(2,'0')}`;
      const newTransactionId = `TXN${paymentMethod === "Admin Recorded" ? "ADMIN" : "MEM"}${String(Date.now()).slice(-7)}`;

      let actualPaymentAmount = paymentAmountInput;
      if (paymentAmountInput === "FULL_DUE" && student.amountDue && student.amountDue !== "N/A" && student.amountDue !== "₹0") {
        actualPaymentAmount = student.amountDue;
      } else if (paymentAmountInput === "FULL_DUE") {
        actualPaymentAmount = student.shift === "fullday" ? "₹1200" : "₹700";
      }

      const newPaymentRecord: PaymentRecord = {
        paymentId: newPaymentId,
        date: format(today, 'yyyy-MM-dd'),
        amount: actualPaymentAmount,
        transactionId: newTransactionId,
        method: paymentMethod === "Admin Recorded" ? "Desk Payment" : paymentMethod,
      };

      const updatedStudent: Student = {
        ...student,
        feeStatus: "Paid",
        lastPaymentDate: format(today, 'yyyy-MM-dd'),
        nextDueDate: format(addMonths(today, 1), 'yyyy-MM-dd'),
        amountDue: "₹0",
        paymentHistory: [...(student.paymentHistory || []), newPaymentRecord],
      };

      students[studentIndex] = updatedStudent;

      try {
        await sendAlertToStudent(
          studentId,
          "Payment Confirmation",
          `Hi ${updatedStudent.name}, your fee payment of ${actualPaymentAmount} has been successfully recorded. Your fees are now paid up to ${updatedStudent.nextDueDate}. Thank you!`,
          "info"
        );
      } catch (alertError) {
        console.error("Failed to send payment confirmation alert:", alertError);
      }

      resolve({ ...updatedStudent });
    }, 50);
  });
}

// Communication Service Functions

function getNextFeedbackId(): string {
  const maxId = feedbackItems.reduce((max, item) => {
    if (item.id && item.id.startsWith('FB')) {
      const idNum = parseInt(item.id.replace('FB', ''), 10);
      if (!isNaN(idNum)) {
        return idNum > max ? idNum : max;
      }
    }
    return max;
  }, 0);
  return `FB${String(maxId + 1).padStart(3, '0')}`;
}

export function submitFeedback(
  studentId: string | undefined,
  studentName: string | undefined,
  message: string,
  type: FeedbackType
): Promise<FeedbackItem> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newFeedback: FeedbackItem = {
        id: getNextFeedbackId(),
        studentId,
        studentName,
        message,
        type,
        dateSubmitted: new Date().toISOString(),
        status: "Open",
      };
      feedbackItems.push(newFeedback);
      resolve({...newFeedback});
    }, 50);
  });
}

export function getAllFeedback(): Promise<FeedbackItem[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...feedbackItems].sort((a, b) => parseISO(b.dateSubmitted).getTime() - parseISO(a.dateSubmitted).getTime()));
    }, 50);
  });
}

export function updateFeedbackStatus(feedbackId: string, status: FeedbackStatus): Promise<FeedbackItem | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const itemIndex = feedbackItems.findIndex(item => item.id === feedbackId);
      if (itemIndex !== -1) {
        feedbackItems[itemIndex].status = status;
        resolve({...feedbackItems[itemIndex]});
      } else {
        reject(new Error("Feedback item not found."));
      }
    }, 50);
  });
}

// Alert functions
function getNextAlertId(): string {
  const maxId = alertItems.reduce((max, item) => {
    if (item.id && item.id.startsWith('ALERT')) {
      const idNum = parseInt(item.id.replace('ALERT', ''), 10);
      if (!isNaN(idNum)) {
        return idNum > max ? idNum : max;
      }
    }
    return max;
  }, 0);
  return `ALERT${String(maxId + 1).padStart(3, '0')}`;
}

export function sendGeneralAlert(title: string, message: string, type: AlertItem['type']): Promise<AlertItem> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newAlert: AlertItem = {
        id: getNextAlertId(),
        title,
        message,
        type,
        dateSent: new Date().toISOString(),
        isRead: false,
      };
      alertItems.push(newAlert);
      resolve({...newAlert});
    }, 50);
  });
}

export async function sendAlertToStudent(
    studentId: string,
    title: string,
    message: string,
    type: AlertItem['type'],
    originalFeedbackId?: string,
    originalFeedbackMessageSnippet?: string
): Promise<AlertItem> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const studentExists = students.some(s => s.studentId === studentId);
      if (!studentExists) {
        console.warn(`Attempted to send targeted alert to non-existent student ID: ${studentId} for title: "${title}"`);
        if (type === 'feedback_response') {
             reject(new Error(`Student with ID ${studentId} not found for feedback response.`));
             return;
        }
      }
      const newAlert: AlertItem = {
        id: getNextAlertId(),
        studentId,
        title,
        message,
        type,
        dateSent: new Date().toISOString(),
        isRead: false,
        originalFeedbackId,
        originalFeedbackMessageSnippet,
      };
      alertItems.push(newAlert);
      resolve({...newAlert});
    }, 20);
  });
}

export function getAlertsForStudent(studentId: string): Promise<AlertItem[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const studentSpecificReadGeneral = studentReadGeneralAlerts.get(studentId) || new Set<string>();

      const contextualizedAlerts = alertItems
        .filter(alert =>
          alert.studentId === studentId ||
          (!alert.studentId && alert.type !== 'feedback_response')
        )
        .map(originalAlert => {
          const contextualAlert = { ...originalAlert };
          if (!originalAlert.studentId) {
            contextualAlert.isRead = studentSpecificReadGeneral.has(originalAlert.id);
          } else if (originalAlert.studentId === studentId) {
            contextualAlert.isRead = originalAlert.isRead;
          }
          return contextualAlert;
        });

      resolve(contextualizedAlerts.sort((a, b) => parseISO(b.dateSent).getTime() - parseISO(a.dateSent).getTime()));
    }, 50);
  });
}

export function getAllAdminSentAlerts(): Promise<AlertItem[]> {
   return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...alertItems].sort((a, b) => parseISO(b.dateSent).getTime() - parseISO(a.dateSent).getTime()));
    }, 50);
  });
}

export function markAlertAsRead(alertId: string, studentId: string): Promise<AlertItem | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const alertIndex = alertItems.findIndex(alert => alert.id === alertId);
      if (alertIndex !== -1) {
        const alertToUpdate = alertItems[alertIndex];
        if (alertToUpdate.studentId === studentId) {
          alertToUpdate.isRead = true;
        } else if (!alertToUpdate.studentId) {
          if (!studentReadGeneralAlerts.has(studentId)) {
            studentReadGeneralAlerts.set(studentId, new Set<string>());
          }
          studentReadGeneralAlerts.get(studentId)!.add(alertId);
        } else {
          reject(new Error("Alert not found for this student or permission denied."));
          return;
        }

        const contextualAlert = { ...alertToUpdate };
        if (!contextualAlert.studentId) {
            contextualAlert.isRead = studentReadGeneralAlerts.get(studentId)?.has(alertId) || false;
        }
        resolve(contextualAlert);

      } else {
        reject(new Error("Alert not found."));
      }
    }, 50);
  });
}

// New function for calculating monthly revenue
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
            const amountValue = parseInt(payment.amount.replace('₹', ''), 10);
            if (!isNaN(amountValue)) {
              totalRevenue += amountValue;
            }
          }
        } catch (e) {
          console.error("Error parsing payment date or amount:", payment.date, payment.amount, e);
        }
      });
    }
  });
  return `₹${totalRevenue.toLocaleString()}`;
}

export type MonthlyRevenueData = {
  month: string; // e.g., "Jan", "Feb"
  revenue: number;
};

export async function getMonthlyRevenueHistory(numberOfMonths: number): Promise<MonthlyRevenueData[]> {
  const allStudentsData = await getAllStudents(); // Fetch once
  const history: MonthlyRevenueData[] = [];
  const today = new Date();

  for (let i = 0; i < numberOfMonths; i++) {
    const targetMonthDate = subMonths(today, i);
    const monthStart = startOfMonth(targetMonthDate);
    const monthEnd = endOfMonth(targetMonthDate);
    let monthRevenue = 0;

    allStudentsData.forEach(student => {
      if (student.paymentHistory) {
        student.paymentHistory.forEach(payment => {
          try {
            const paymentDate = parseISO(payment.date);
            if (isValid(paymentDate) && isWithinInterval(paymentDate, { start: monthStart, end: monthEnd })) {
              const amountValue = parseInt(payment.amount.replace('₹', ''), 10);
              if (!isNaN(amountValue)) {
                monthRevenue += amountValue;
              }
            }
          } catch (e) {
            console.error(`Error processing payment ${payment.paymentId} for revenue history:`, e);
          }
        });
      }
    });

    history.push({
      month: format(targetMonthDate, 'MMM'), // Short month name e.g., "Jun"
      revenue: monthRevenue,
    });
  }

  return history.reverse(); // To have oldest month first for the chart
}


// New function for calculating monthly study hours for a student
export async function calculateMonthlyStudyHours(studentId: string): Promise<number> {
  const records = await getAttendanceRecordsByStudentId(studentId);
  let totalMilliseconds = 0;
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  records.forEach(record => {
    try {
      const checkInDate = parseISO(record.checkInTime);
      // Ensure the check-in is within the current month
      if (isValid(checkInDate) && isWithinInterval(checkInDate, { start: currentMonthStart, end: currentMonthEnd })) {
        if (record.checkOutTime) {
          const checkOutDate = parseISO(record.checkOutTime);
          // Ensure check-out is also valid and within the month (or if it spans, cap it at month end, though less likely for short check-ins)
          if (isValid(checkOutDate)) {
             if (checkOutDate.getTime() > checkInDate.getTime()) { // Basic sanity check
                // Consider if checkOutDate also needs to be within the current month for this calculation
                // For simplicity, we are assuming check-ins/outs are generally within the same day or reasonably close.
                totalMilliseconds += differenceInMilliseconds(checkOutDate, checkInDate);
            }
          }
        }
        // If student is currently checked in (record.checkOutTime is undefined) and checkInDate is today,
        // we could calculate hours up to now, but the current logic only sums completed sessions for the month.
        // For this iteration, we'll stick to completed sessions.
      }
    } catch (e) {
      console.error("Error processing attendance record for hour calculation:", record, e);
    }
  });
  return Math.round(totalMilliseconds / (1000 * 60 * 60)); // Convert ms to hours
}
