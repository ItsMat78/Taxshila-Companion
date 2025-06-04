
import type { Student, Shift, FeeStatus, PaymentRecord, ActivityStatus, AttendanceRecord } from '@/types/student';
import type { FeedbackItem, FeedbackType, FeedbackStatus } from '@/types/communication';
import { format, parseISO, differenceInDays, isPast, addMonths, subHours, subMinutes, startOfDay, endOfDay, isValid } from 'date-fns';

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
    profilePictureUrl: "https://placehold.co/200x200.png",
    paymentHistory: [
        { paymentId: "PAY001", date: "2024-06-01", amount: "₹700", transactionId: "TXN12345601", method: "UPI" },
    ]
  },
  {
    studentId: "TS002",
    name: "Priya Patel",
    email: "priya.patel@example.com",
    phone: "9876543211",
    shift: "evening",
    seatNumber: "1", 
    idCardFileName: "priya_id.png",
    feeStatus: "Paid", // Updated from previous successful payment test
    activityStatus: "Active",
    registrationDate: "2024-02-20",
    lastPaymentDate: format(new Date(), 'yyyy-MM-dd'), // Updated from previous successful payment test
    nextDueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'), // Updated from previous successful payment test
    amountDue: "₹0", // Updated from previous successful payment test
    paymentHistory: [
      { paymentId: "AUTOGEN_PAYID_PREVIOUS", date: format(new Date(), 'yyyy-MM-dd'), amount: "₹700", transactionId: "AUTOGEN_TXNID_PREVIOUS", method: "UPI" },
    ],
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
    paymentHistory: [],
  },
   { studentId: "TS004", name: "Vikram Singh", email: "vikram.singh@example.com", phone: "9876543213", shift: "evening", seatNumber: "40", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-01", lastPaymentDate: "2024-06-03", nextDueDate: "2024-07-03", amountDue: "₹0", paymentHistory: [] },
   { studentId: "TS005", name: "Neha Reddy", email: "neha.reddy@example.com", phone: "9876543214", shift: "fullday", seatNumber: "50", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-05", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0", paymentHistory: [] },
   { studentId: "TS006", name: "Old Overdue For Auto-Left", email: "old.overdue@example.com", phone: "9876543215", shift: "morning", seatNumber: "6", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-01-01", lastPaymentDate: "2024-02-01", nextDueDate: format(addMonths(new Date(), -3), 'yyyy-MM-dd'), amountDue: "₹700", paymentHistory: [] },
   { studentId: "TS007", name: "Sanya Gupta Due", email: "sanya.gupta@example.com", phone: "9876543216", shift: "morning", seatNumber: "8", feeStatus: "Due", activityStatus: "Active", registrationDate: "2024-05-01", lastPaymentDate: "2024-05-10", nextDueDate: "2024-06-10", amountDue: "₹700", paymentHistory: [] },
   { studentId: "TS008", name: "Kavita Singh Paid", email: "kavita.singh@example.com", phone: "9876543217", shift: "morning", seatNumber: "10", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-05-10", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0", paymentHistory: [] },
   { studentId: "TS012", name: "Karan Verma Long Overdue", email: "karan.verma@example.com", phone: "9876543221", shift: "evening", seatNumber: "15", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-01-01", lastPaymentDate: "2024-01-20", nextDueDate: format(addMonths(new Date(), -4), 'yyyy-MM-dd'), amountDue: "₹700", paymentHistory: [] },
];

let attendanceRecords: AttendanceRecord[] = [
  { recordId: "AR001", studentId: "TS001", date: format(new Date(), 'yyyy-MM-dd'), checkInTime: subHours(new Date(), 2).toISOString(), checkOutTime: subHours(new Date(), 1).toISOString() },
  { recordId: "AR002", studentId: "TS002", date: format(new Date(), 'yyyy-MM-dd'), checkInTime: subHours(new Date(), 1).toISOString(), checkOutTime: subMinutes(new Date(), 15).toISOString() },
  { recordId: "AR003", studentId: "TS001", date: format(subHours(new Date(), 25), 'yyyy-MM-dd'), checkInTime: subHours(new Date(), 25).toISOString(), checkOutTime: subHours(new Date(), 20).toISOString() },
];

let feedbackItems: FeedbackItem[] = [
    { id: "FB001", studentId: "TS002", studentName: "Priya Patel", dateSubmitted: "2024-06-28", type: "Complaint", message: "The AC in the evening shift section is not working properly. It gets very warm.", status: "Open" },
    { id: "FB002", studentId: "TS005", studentName: "Neha Reddy", dateSubmitted: "2024-06-27", type: "Suggestion", message: "Could we have more charging points available near the window seats?", status: "Open" },
];


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
                if (isValid(dueDate) && isPast(dueDate)) {
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
      const studentIdx = students.findIndex(s => s.email === email); // Check all students, not just active
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

export function updateStudent(studentId: string, studentUpdateData: Partial<Omit<Student, 'studentId'>>): Promise<Student | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      processStudentsForUpdates([...students]);
      const studentIndex = students.findIndex(s => s.studentId === studentId);
      if (studentIndex === -1) {
        reject(new Error("Student not found."));
        return;
      }

      const currentStudent = students[studentIndex];
      const newShift = studentUpdateData.shift || currentStudent.shift;
      const newSeatNumber = studentUpdateData.seatNumber !== undefined ? studentUpdateData.seatNumber : currentStudent.seatNumber;

      if (newSeatNumber && (newSeatNumber !== currentStudent.seatNumber || newShift !== currentStudent.shift || (studentUpdateData.activityStatus === 'Active' && currentStudent.activityStatus === 'Left'))) {
        const isSeatTakenForShift = students.some(s =>
          s.studentId !== studentId && 
          s.activityStatus === "Active" &&
          s.seatNumber === newSeatNumber &&
          (
            s.shift === "fullday" ||
            newShift === "fullday" ||
            s.shift === newShift
          )
        );

        if (isSeatTakenForShift) {
          reject(new Error(`Seat ${newSeatNumber} is not available for the ${newShift} shift.`));
          return;
        }
        if (newSeatNumber && !ALL_SEAT_NUMBERS.includes(newSeatNumber)) {
            reject(new Error("Invalid new seat number selected."));
            return;
        }
      }

      let updatedStudentData = { ...currentStudent, ...studentUpdateData };

      if (studentUpdateData.activityStatus === 'Left') {
        updatedStudentData.seatNumber = null;
        updatedStudentData.feeStatus = 'N/A';
        updatedStudentData.amountDue = 'N/A';
        updatedStudentData.lastPaymentDate = undefined;
        updatedStudentData.nextDueDate = undefined;
      } else if (studentUpdateData.activityStatus === 'Active' && currentStudent.activityStatus === 'Left') {
        if (!updatedStudentData.seatNumber || !ALL_SEAT_NUMBERS.includes(updatedStudentData.seatNumber)) {
            reject(new Error("A valid seat must be selected to re-activate a student."));
            return;
        }
        updatedStudentData.feeStatus = 'Due';
        updatedStudentData.amountDue = updatedStudentData.shift === "fullday" ? "₹1200" : "₹700";
        updatedStudentData.lastPaymentDate = undefined; 
        updatedStudentData.nextDueDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd'); 
        updatedStudentData.paymentHistory = []; 
      }


      students[studentIndex] = updatedStudentData;
      resolve({...students[studentIndex]});
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
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date();
      const newRecord: AttendanceRecord = {
        recordId: getNextAttendanceRecordId(),
        studentId,
        date: format(now, 'yyyy-MM-dd'),
        checkInTime: now.toISOString(),
      };
      attendanceRecords.push(newRecord);
      resolve({...newRecord});
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

export function recordStudentPayment(
  studentId: string,
  paymentAmount: string, 
  paymentMethod: "UPI" | "Cash" | "Card" | "Online"
): Promise<Student | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
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
      const newTransactionId = `TXN${String(Date.now()).slice(-8)}`;

      const newPaymentRecord: PaymentRecord = {
        paymentId: newPaymentId,
        date: format(today, 'yyyy-MM-dd'),
        amount: paymentAmount,
        transactionId: newTransactionId,
        method: paymentMethod,
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
      resolve({...updatedStudent});
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
        dateSubmitted: format(new Date(), 'yyyy-MM-dd'),
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
      // Return sorted by date, newest first
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

// Placeholder for AlertItem functions if needed later
// let alertItems: AlertItem[] = [];
// export function sendAlert(...) {}
// export function getAllAlerts(...) {}
