
import type { Student, Shift, FeeStatus, PaymentRecord, ActivityStatus, ALL_SEAT_NUMBERS as SeatListType } from '@/types/student';
import { format, parseISO, differenceInDays, isPast, addMonths } from 'date-fns';
import { ALL_SEAT_NUMBERS } from '@/types/student';


// In-memory store for students
let students: Student[] = [
  {
    studentId: "TS001",
    name: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    phone: "9876543210",
    shift: "morning",
    seatNumber: "A01",
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
    seatNumber: "B03",
    idCardFileName: "priya_id.png",
    feeStatus: "Due",
    activityStatus: "Active",
    registrationDate: "2024-02-20",
    lastPaymentDate: "2024-05-05",
    nextDueDate: "2024-06-05", // This student is due
    amountDue: "₹700",
  },
  {
    studentId: "TS003",
    name: "Rohan Mehta",
    email: "rohan.mehta@example.com",
    phone: "9876543212",
    shift: "fullday",
    seatNumber: "C07",
    idCardFileName: "rohan_aadhar.jpeg",
    feeStatus: "Overdue",
    activityStatus: "Active",
    registrationDate: "2024-03-10",
    lastPaymentDate: "2024-04-15",
    nextDueDate: "2024-05-15", // This student is overdue by more than 5 days from a typical "today" like late June
    amountDue: "₹1200",
  },
   { studentId: "TS004", name: "Vikram Singh", email: "vikram.singh@example.com", phone: "9876543213", shift: "evening", seatNumber: "C02", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-01", lastPaymentDate: "2024-06-03", nextDueDate: "2024-07-03", amountDue: "₹0" },
   { studentId: "TS005", name: "Neha Reddy", email: "neha.reddy@example.com", phone: "9876543214", shift: "fullday", seatNumber: "D05", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-05", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0" },
   { studentId: "TS006", name: "Old Overdue", email: "old.overdue@example.com", phone: "9876543215", shift: "morning", seatNumber: "A04", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-01-01", lastPaymentDate: "2024-03-01", nextDueDate: "2024-04-01", amountDue: "₹700" }, // Will be auto-marked as Left
   { studentId: "TS007", name: "Sanya Gupta", email: "sanya.gupta@example.com", phone: "9876543216", shift: "morning", seatNumber: "A05", feeStatus: "Due", activityStatus: "Active", registrationDate: "2024-05-01", lastPaymentDate: "2024-05-10", nextDueDate: "2024-06-10", amountDue: "₹700" },
   { studentId: "TS008", name: "Kavita Singh", email: "kavita.singh@example.com", phone: "9876543217", shift: "morning", seatNumber: "A12", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-05-10", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0" },
   { studentId: "TS012", name: "Karan Verma", email: "karan.verma@example.com", phone: "9876543221", shift: "evening", seatNumber: "B15", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-03-01", lastPaymentDate: "2024-03-20", nextDueDate: "2024-04-20", amountDue: "₹700" }, // Will also be auto-marked as Left
];


function applyAutomaticStatusUpdates(student: Student): Student {
  if (student.activityStatus === 'Active' && student.feeStatus === 'Overdue' && student.nextDueDate) {
    try {
      const dueDate = parseISO(student.nextDueDate);
      const today = new Date();
      // Ensure we are only comparing date parts, not time
      const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      if (isPast(dueDateOnly) && differenceInDays(todayDateOnly, dueDateOnly) > 5) {
        console.log(`Auto-marking student ${student.studentId} as Left due to overdue fees.`);
        return { ...student, activityStatus: 'Left', seatNumber: null, feeStatus: "N/A", amountDue: "N/A" };
      }
    } catch (e) {
      console.error(`Error parsing date for student ${student.studentId}: ${student.nextDueDate}`, e);
    }
  }
  return student;
}

function processStudentsForUpdates(studentArray: Student[]): Student[] {
    // Apply updates directly to the main `students` array for persistence across calls
    students = studentArray.map(s => {
        const updatedStudent = applyAutomaticStatusUpdates(s);
        // If student was updated, find and replace in the main array
        const indexInMainArray = students.findIndex(orig => orig.studentId === updatedStudent.studentId);
        if (indexInMainArray !== -1 && students[indexInMainArray].activityStatus !== updatedStudent.activityStatus) {
             students[indexInMainArray] = updatedStudent; // Persist change
        }
        return updatedStudent; // Return for current operation
    });
    return students; // Return the potentially modified list
}


export function getAllStudents(): Promise<Student[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
        // Iterate and apply rules. This approach modifies the global `students` array if changes occur.
        const updatedStudentsList = students.map(s => {
            const updatedStudent = applyAutomaticStatusUpdates(s);
             // If student was updated, find and replace in the main array
            const indexInMainArray = students.findIndex(orig => orig.studentId === updatedStudent.studentId);
            if (indexInMainArray !== -1 && (students[indexInMainArray].activityStatus !== updatedStudent.activityStatus || students[indexInMainArray].seatNumber !== updatedStudent.seatNumber)) {
                students[indexInMainArray] = { ...students[indexInMainArray], ...updatedStudent };
            }
            return students[indexInMainArray]; // return from the (potentially) updated main array
        });
        resolve([...updatedStudentsList]); // Return a copy
    }, 200);
  });
}

export function getStudentById(studentId: string): Promise<Student | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let student = students.find(s => s.studentId === studentId);
      if (student) {
        const updatedStudent = applyAutomaticStatusUpdates(student);
        // If student was updated, find and replace in the main array
        const indexInMainArray = students.findIndex(orig => orig.studentId === updatedStudent.studentId);
        if (indexInMainArray !== -1 && (students[indexInMainArray].activityStatus !== updatedStudent.activityStatus || students[indexInMainArray].seatNumber !== updatedStudent.seatNumber)) {
             students[indexInMainArray] = { ...students[indexInMainArray], ...updatedStudent };
        }
        resolve(students[indexInMainArray] ? {...students[indexInMainArray]} : undefined); // Return a copy from the (potentially) updated main array
      } else {
        resolve(undefined);
      }
    }, 200);
  });
}


function getNextStudentId(): string {
  const maxId = students.reduce((max, s) => {
    const idNum = parseInt(s.studentId.replace('TS', ''), 10);
    return idNum > max ? idNum : max;
  }, 0);
  return `TS${String(maxId + 1).padStart(3, '0')}`;
}

export interface AddStudentData {
  name: string;
  email?: string;
  phone: string;
  shift: Shift;
  seatNumber: string; // Seat must be provided
  idCardFileName?: string;
}

export function addStudent(studentData: AddStudentData): Promise<Student> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
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
      };
      students.push(newStudent);
      resolve(newStudent);
    }, 200);
  });
}

export function updateStudent(studentId: string, studentUpdateData: Partial<Omit<Student, 'studentId'>>): Promise<Student | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const studentIndex = students.findIndex(s => s.studentId === studentId);
      if (studentIndex === -1) {
        reject(new Error("Student not found."));
        return;
      }

      const currentStudent = students[studentIndex];
      let updatedStudent = { ...currentStudent, ...studentUpdateData };

      // If seat number is being changed and the student is active
      if (studentUpdateData.seatNumber && studentUpdateData.seatNumber !== currentStudent.seatNumber && updatedStudent.activityStatus === 'Active') {
        if (students.some(s => s.seatNumber === studentUpdateData.seatNumber && s.studentId !== studentId && s.activityStatus === 'Active')) {
          reject(new Error("New seat number is already taken by an active student."));
          return;
        }
      }
      
      // If student is marked as Left, clear their seat
      if (studentUpdateData.activityStatus === 'Left') {
        updatedStudent.seatNumber = null;
        updatedStudent.feeStatus = 'N/A'; // Or some other status indicating they are no longer billed
        updatedStudent.amountDue = 'N/A';
      }

      students[studentIndex] = updatedStudent;
      resolve({...students[studentIndex]}); // Return a copy
    }, 200);
  });
}

export function getAvailableSeats(): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const takenSeats = students
        .filter(s => s.activityStatus === 'Active' && s.seatNumber !== null)
        .map(s => s.seatNumber as string);
      const available = ALL_SEAT_NUMBERS.filter(seat => !takenSeats.includes(seat));
      resolve(available);
    }, 100);
  });
}

export function getTakenSeats(): Promise<string[]> {
   return new Promise((resolve) => {
    setTimeout(() => {
      const takenSeats = students
        .filter(s => s.activityStatus === 'Active' && s.seatNumber !== null)
        .map(s => s.seatNumber as string);
      resolve(takenSeats);
    }, 100);
  });
}
