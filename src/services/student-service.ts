
import type { Student, Shift, FeeStatus, PaymentRecord, ActivityStatus } from '@/types/student';
import { format, parseISO, differenceInDays, isPast, addMonths } from 'date-fns';

// Define ALL_SEAT_NUMBERS directly in this file
const ALL_SEAT_NUMBERS = Array.from({ length: 20 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`)
  .concat(Array.from({ length: 20 }, (_, i) => `B${String(i + 1).padStart(2, '0')}`))
  .concat(Array.from({ length: 45 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`));


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
    nextDueDate: "2024-06-05",
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
    feeStatus: "Overdue", // To test auto-left if date is old
    activityStatus: "Active",
    registrationDate: "2024-03-10",
    lastPaymentDate: "2024-03-15", // Older payment
    nextDueDate: "2024-04-15", // Overdue date in the past
    amountDue: "₹1200",
  },
   { studentId: "TS004", name: "Vikram Singh", email: "vikram.singh@example.com", phone: "9876543213", shift: "evening", seatNumber: "C02", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-01", lastPaymentDate: "2024-06-03", nextDueDate: "2024-07-03", amountDue: "₹0" },
   { studentId: "TS005", name: "Neha Reddy", email: "neha.reddy@example.com", phone: "9876543214", shift: "fullday", seatNumber: "D05", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-04-05", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0" },
   { studentId: "TS006", name: "Old Overdue For Auto-Left", email: "old.overdue@example.com", phone: "9876543215", shift: "morning", seatNumber: "A04", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-01-01", lastPaymentDate: "2024-02-01", nextDueDate: "2024-03-01", amountDue: "₹700" },
   { studentId: "TS007", name: "Sanya Gupta", email: "sanya.gupta@example.com", phone: "9876543216", shift: "morning", seatNumber: "A05", feeStatus: "Due", activityStatus: "Active", registrationDate: "2024-05-01", lastPaymentDate: "2024-05-10", nextDueDate: "2024-06-10", amountDue: "₹700" },
   { studentId: "TS008", name: "Kavita Singh", email: "kavita.singh@example.com", phone: "9876543217", shift: "morning", seatNumber: "A12", feeStatus: "Paid", activityStatus: "Active", registrationDate: "2024-05-10", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0" },
   { studentId: "TS012", name: "Karan Verma Long Overdue", email: "karan.verma@example.com", phone: "9876543221", shift: "evening", seatNumber: "B15", feeStatus: "Overdue", activityStatus: "Active", registrationDate: "2024-01-01", lastPaymentDate: "2024-01-20", nextDueDate: "2024-02-20", amountDue: "₹700" },
];


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
    // Create a new array with updated students to avoid direct mutation issues if 'studentArray' is 'students'
    const processedStudents = studentArray.map(s => {
        const originalStudentData = {...s};
        const updatedStudent = applyAutomaticStatusUpdates(s);
        
        // Find the student in the global `students` array to update it
        const indexInMainArray = students.findIndex(orig => orig.studentId === updatedStudent.studentId);

        if (indexInMainArray !== -1) {
             // Check if there are actual changes to avoid unnecessary updates
             if (students[indexInMainArray].activityStatus !== updatedStudent.activityStatus ||
                 students[indexInMainArray].seatNumber !== updatedStudent.seatNumber ||
                 students[indexInMainArray].feeStatus !== updatedStudent.feeStatus) {
                students[indexInMainArray] = { ...students[indexInMainArray], ...updatedStudent };
            }
            // Return the potentially updated student from the global array
            return students[indexInMainArray];
        }
        // If student wasn't in global array (should not happen if studentArray comes from `students`), return the processed one.
        // This case is less likely if `studentArray` is always derived from the global `students` array.
        return updatedStudent;
    });
    // If `studentArray` was the global `students` array, it's already updated by reference.
    // If it was a copy, then the global `students` array has been updated.
    return processedStudents; // Return the processed list for immediate use
}


export function getAllStudents(): Promise<Student[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
        // Apply updates and then return a deep copy of the students array
        const updatedStudentsList = processStudentsForUpdates([...students]);
        resolve(updatedStudentsList.map(s => ({...s})));
    }, 200);
  });
}

export function getStudentById(studentId: string): Promise<Student | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let student = students.find(s => s.studentId === studentId);
      if (student) {
        const updatedStudent = applyAutomaticStatusUpdates({...student}); // process a copy
        const indexInMainArray = students.findIndex(orig => orig.studentId === updatedStudent.studentId);

        if (indexInMainArray !== -1) {
             if (students[indexInMainArray].activityStatus !== updatedStudent.activityStatus ||
                 students[indexInMainArray].seatNumber !== updatedStudent.seatNumber ||
                 students[indexInMainArray].feeStatus !== updatedStudent.feeStatus) {
                 students[indexInMainArray] = { ...students[indexInMainArray], ...updatedStudent };
            }
            resolve(students[indexInMainArray] ? {...students[indexInMainArray]} : undefined);
        } else {
             resolve(updatedStudent ? {...updatedStudent} : undefined); // Should not happen if student was found
        }
      } else {
        resolve(undefined);
      }
    }, 200);
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
      processStudentsForUpdates([...students]); // Ensure statuses are up-to-date before checking seats
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
      resolve({...newStudent});
    }, 200);
  });
}

export function updateStudent(studentId: string, studentUpdateData: Partial<Omit<Student, 'studentId'>>): Promise<Student | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      processStudentsForUpdates([...students]); // Ensure statuses are up-to-date before checking seats
      const studentIndex = students.findIndex(s => s.studentId === studentId);
      if (studentIndex === -1) {
        reject(new Error("Student not found."));
        return;
      }

      const currentStudent = students[studentIndex];
      let updatedStudentData = { ...currentStudent, ...studentUpdateData };

      // Check if new seat is taken ONLY if the seat is changing and student is active
      if (studentUpdateData.seatNumber && studentUpdateData.seatNumber !== currentStudent.seatNumber && updatedStudentData.activityStatus === 'Active') {
        if (students.some(s => s.seatNumber === studentUpdateData.seatNumber && s.studentId !== studentId && s.activityStatus === 'Active')) {
          reject(new Error("New seat number is already taken by an active student."));
          return;
        }
      }
      
      if (studentUpdateData.activityStatus === 'Left') {
        updatedStudentData.seatNumber = null;
        updatedStudentData.feeStatus = 'N/A';
        updatedStudentData.amountDue = 'N/A';
        updatedStudentData.lastPaymentDate = updatedStudentData.lastPaymentDate || undefined; // Keep if exists, else undefined
        updatedStudentData.nextDueDate = undefined; // Clear next due date
      }

      students[studentIndex] = updatedStudentData;
      resolve({...students[studentIndex]});
    }, 200);
  });
}

export function getAvailableSeats(): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      processStudentsForUpdates([...students]); // Ensure statuses are up-to-date
      const takenSeats = students
        .filter(s => s.activityStatus === 'Active' && s.seatNumber !== null)
        .map(s => s.seatNumber as string);
      const available = ALL_SEAT_NUMBERS.filter(seat => !takenSeats.includes(seat));
      resolve(available.sort());
    }, 100);
  });
}

export function getTakenSeats(): Promise<string[]> {
   return new Promise((resolve) => {
    setTimeout(() => {
      processStudentsForUpdates([...students]); // Ensure statuses are up-to-date
      const takenSeats = students
        .filter(s => s.activityStatus === 'Active' && s.seatNumber !== null)
        .map(s => s.seatNumber as string);
      resolve(takenSeats.sort());
    }, 100);
  });
}
