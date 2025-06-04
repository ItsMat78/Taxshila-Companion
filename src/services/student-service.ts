
import type { Student, Shift, FeeStatus, PaymentRecord, ActivityStatus, AttendanceRecord } from '@/types/student';
import { format, parseISO, differenceInDays, isPast, addMonths, subHours, subMinutes } from 'date-fns';

// Define ALL_SEAT_NUMBERS directly in this file
const ALL_SEAT_NUMBERS: string[] = [];
for (let i = 1; i <= 85; i++) {
  if (i !== 17) {
    ALL_SEAT_NUMBERS.push(String(i));
  }
}

// In-memory store for students
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
    seatNumber: "20",
    idCardFileName: "priya_id.png",
    feeStatus: "Due",
    activityStatus: "Active",
    registrationDate: "2024-02-20",
    lastPaymentDate: "2024-05-05",
    nextDueDate: "2024-06-05", // This will be overdue
    amountDue: "₹700",
  },
  {
    studentId: "TS003",
    name: "Rohan Mehta Overdue AutoLeft Test",
    email: "rohan.mehta@example.com",
    phone: "9876543212",
    shift: "fullday",
    seatNumber: "35",
    idCardFileName: "rohan_aadhar.jpeg",
    feeStatus: "Overdue", 
    activityStatus: "Active",
    registrationDate: "2024-03-10",
    lastPaymentDate: "2024-03-15", 
    nextDueDate: format(addMonths(new Date(), -2), 'yyyy-MM-dd'), // Overdue by 2 months
    amountDue: "₹1200",
  },
   { studentId: "TS004", name: "Vikram Singh", email: "vikram.singh@example.com", phone: "9876543213", shift: "evening", seatNumber: "40", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-01", lastPaymentDate: "2024-06-03", nextDueDate: "2024-07-03", amountDue: "₹0" },
   { studentId: "TS005", name: "Neha Reddy", email: "neha.reddy@example.com", phone: "9876543214", shift: "fullday", seatNumber: "50", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-05", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0" },
   { studentId: "TS006", name: "Old Overdue For Auto-Left", email: "old.overdue@example.com", phone: "9876543215", shift: "morning", seatNumber: "6", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-01-01", lastPaymentDate: "2024-02-01", nextDueDate: format(addMonths(new Date(), -3), 'yyyy-MM-dd'), amountDue: "₹700" },
   { studentId: "TS007", name: "Sanya Gupta Due", email: "sanya.gupta@example.com", phone: "9876543216", shift: "morning", seatNumber: "8", feeStatus: "Due", activityStatus: "Active", registrationDate: "2024-05-01", lastPaymentDate: "2024-05-10", nextDueDate: "2024-06-10", amountDue: "₹700" },
   { studentId: "TS008", name: "Kavita Singh Paid", email: "kavita.singh@example.com", phone: "9876543217", shift: "morning", seatNumber: "10", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-05-10", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0" },
   { studentId: "TS012", name: "Karan Verma Long Overdue", email: "karan.verma@example.com", phone: "9876543221", shift: "evening", seatNumber: "15", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-01-01", lastPaymentDate: "2024-01-20", nextDueDate: format(addMonths(new Date(), -4), 'yyyy-MM-dd'), amountDue: "₹700" },
];

// In-memory store for attendance records
let attendanceRecords: AttendanceRecord[] = [
  { recordId: "AR001", studentId: "TS001", date: format(new Date(), 'yyyy-MM-dd'), checkInTime: subHours(new Date(), 2).toISOString() }, // Checked in 2 hours ago
  { recordId: "AR002", studentId: "TS002", date: format(new Date(), 'yyyy-MM-dd'), checkInTime: subHours(new Date(), 1).toISOString(), checkOutTime: subMinutes(new Date(), 15).toISOString() }, // Checked in 1 hour ago, checked out 15 mins ago
  { recordId: "AR003", studentId: "TS001", date: format(subHours(new Date(), 25).toISOString(), 'yyyy-MM-dd'), checkInTime: subHours(new Date(), 25).toISOString(), checkOutTime: subHours(new Date(), 20).toISOString() }, // Yesterday's record
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
      
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      if (isPast(dueDateOnly) && differenceInDays(todayDateOnly, dueDateOnly) > 5) {
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
        const updatedStudent = applyAutomaticStatusUpdates(s); 
        
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
        resolve(updatedStudentsList.map(s => ({...s}))); // Return copies
    }, 50); // Reduced timeout for faster feedback
  });
}

export function getStudentById(studentId: string): Promise<Student | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let student = students.find(s => s.studentId === studentId);
      if (student) {
        const updatedStudent = applyAutomaticStatusUpdates({...student}); // Work on a copy
        const indexInMainArray = students.findIndex(orig => orig.studentId === updatedStudent.studentId);

        if (indexInMainArray !== -1) {
             // If actual changes occurred due to applyAutomaticStatusUpdates, update the main array
             if (students[indexInMainArray].activityStatus !== updatedStudent.activityStatus ||
                 students[indexInMainArray].seatNumber !== updatedStudent.seatNumber ||
                 students[indexInMainArray].feeStatus !== updatedStudent.feeStatus) {
                 students[indexInMainArray] = { ...students[indexInMainArray], ...updatedStudent };
            }
            resolve(students[indexInMainArray] ? {...students[indexInMainArray]} : undefined); // Return a copy
        } else {
             resolve(updatedStudent ? {...updatedStudent} : undefined); // Return a copy
        }
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
      processStudentsForUpdates([...students]); // Ensure student statuses are up-to-date before checking seats
      if (students.some(s => s.seatNumber === studentData.seatNumber && s.activityStatus === "Active")) {
        reject(new Error("Seat already taken by an active student."));
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
        paymentHistory: []
      };
      students.push(newStudent);
      resolve({...newStudent}); // Return a copy
    }, 50);
  });
}

export function updateStudent(studentId: string, studentUpdateData: Partial<Omit<Student, 'studentId'>>): Promise<Student | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      processStudentsForUpdates([...students]); // Update student statuses first
      const studentIndex = students.findIndex(s => s.studentId === studentId);
      if (studentIndex === -1) {
        reject(new Error("Student not found."));
        return;
      }

      const currentStudent = students[studentIndex];
      
      // Check if seat is being changed and if the new seat is taken
      if (studentUpdateData.seatNumber && 
          studentUpdateData.seatNumber !== currentStudent.seatNumber && 
          (studentUpdateData.activityStatus === 'Active' || (studentUpdateData.activityStatus === undefined && currentStudent.activityStatus === 'Active'))) {
        if (students.some(s => s.seatNumber === studentUpdateData.seatNumber && s.studentId !== studentId && s.activityStatus === 'Active')) {
          reject(new Error("New seat number is already taken by an active student."));
          return;
        }
      }
      
      let updatedStudentData = { ...currentStudent, ...studentUpdateData };

      // If student is marked as Left, clear fee and seat related data
      if (studentUpdateData.activityStatus === 'Left') {
        updatedStudentData.seatNumber = null;
        updatedStudentData.feeStatus = 'N/A';
        updatedStudentData.amountDue = 'N/A';
        updatedStudentData.lastPaymentDate = undefined;
        updatedStudentData.nextDueDate = undefined;
      }
      
      students[studentIndex] = updatedStudentData;
      resolve({...students[studentIndex]}); // Return a copy
    }, 50);
  });
}

export function getAvailableSeats(): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      processStudentsForUpdates([...students]); // Update student statuses first
      const takenSeats = students
        .filter(s => s.activityStatus === 'Active' && s.seatNumber !== null)
        .map(s => s.seatNumber as string);
      const available = ALL_SEAT_NUMBERS.filter(seat => !takenSeats.includes(seat));
      resolve(available.sort((a, b) => parseInt(a) - parseInt(b))); // Sort numerically
    }, 50);
  });
}

export function getTakenSeats(): Promise<string[]> {
   return new Promise((resolve) => {
    setTimeout(() => {
      processStudentsForUpdates([...students]); // Update student statuses first
      const takenSeats = students
        .filter(s => s.activityStatus === 'Active' && s.seatNumber !== null)
        .map(s => s.seatNumber as string);
      resolve(takenSeats.sort((a, b) => parseInt(a) - parseInt(b))); // Sort numerically
    }, 50);
  });
}

// --- Attendance Service Functions (Basic) ---

export function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(attendanceRecords.map(ar => ({...ar}))); // Return copies
    }, 50);
  });
}

export function getAttendanceRecordsByStudentId(studentId: string): Promise<AttendanceRecord[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        attendanceRecords
          .filter(ar => ar.studentId === studentId)
          .map(ar => ({...ar})) // Return copies
      );
    }, 50);
  });
}

export function getAttendanceRecordsByDate(date: string): Promise<AttendanceRecord[]> { // date in YYYY-MM-DD
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        attendanceRecords
          .filter(ar => ar.date === date)
          .map(ar => ({...ar})) // Return copies
      );
    }, 50);
  });
}

// More functions like addCheckIn, addCheckOut will be added later.
