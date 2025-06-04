
import type { Student, Shift, FeeStatus, PaymentRecord, ALL_SEAT_NUMBERS as SeatList } from '@/types/student';
import { format } from 'date-fns';

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
    feeStatus: "Overdue",
    registrationDate: "2024-03-10",
    lastPaymentDate: "2024-04-15",
    nextDueDate: "2024-05-15",
    amountDue: "₹1200",
  },
   { studentId: "TS004", name: "Vikram Singh", email: "vikram.singh@example.com", phone: "9876543213", shift: "evening", seatNumber: "C02", feeStatus: "Paid", registrationDate: "2024-04-01", lastPaymentDate: "2024-06-03", nextDueDate: "2024-07-03", amountDue: "₹0" },
   { studentId: "TS005", name: "Neha Reddy", email: "neha.reddy@example.com", phone: "9876543214", shift: "fullday", seatNumber: "D05", feeStatus: "Paid", registrationDate: "2024-04-05", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0" },
   { studentId: "TS007", name: "Sanya Gupta", email: "sanya.gupta@example.com", phone: "9876543216", shift: "morning", seatNumber: "A05", feeStatus: "Due", registrationDate: "2024-05-01", lastPaymentDate: "2024-05-10", nextDueDate: "2024-06-10", amountDue: "₹700" },
   { studentId: "TS008", name: "Kavita Singh", email: "kavita.singh@example.com", phone: "9876543217", shift: "morning", seatNumber: "A12", feeStatus: "Paid", registrationDate: "2024-05-10", lastPaymentDate: "2024-06-01", nextDueDate: "2024-07-01", amountDue: "₹0" },
   { studentId: "TS012", name: "Karan Verma", email: "karan.verma@example.com", phone: "9876543221", shift: "evening", seatNumber: "B15", feeStatus: "Overdue", registrationDate: "2024-03-01", lastPaymentDate: "2024-03-20", nextDueDate: "2024-04-20", amountDue: "₹700" },
];

// Define all seat numbers (e.g., A01-A20, B01-B20, etc.) - simplified for example
// The actual ALL_SEAT_NUMBERS will be imported from student.d.ts
// For this example, we'll use a simplified list if needed, but ideally, it's managed from student.d.ts
const ALL_SEAT_NUMBERS = Array.from({ length: 20 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`)
  .concat(Array.from({ length: 20 }, (_, i) => `B${String(i + 1).padStart(2, '0')}`))
  .concat(Array.from({ length: 45 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`)); // Total 85 seats for C section


export function getAllStudents(): Promise<Student[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...students]), 200); // Simulate network delay
  });
}

export function getStudentById(studentId: string): Promise<Student | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(students.find(s => s.studentId === studentId)), 200);
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
  seatNumber: string;
  idCardFileName?: string;
}

export function addStudent(studentData: AddStudentData): Promise<Student> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (students.find(s => s.seatNumber === studentData.seatNumber)) {
        reject(new Error("Seat already taken."));
        return;
      }
      const newStudent: Student = {
        ...studentData,
        studentId: getNextStudentId(),
        feeStatus: "Due", // Default fee status for new students
        registrationDate: format(new Date(), 'yyyy-MM-dd'),
        amountDue: studentData.shift === "fullday" ? "₹1200" : "₹700", // Example fee logic
        // nextDueDate can be set based on registrationDate + 1 month
      };
      students.push(newStudent);
      resolve(newStudent);
    }, 200);
  });
}

export function updateStudent(studentId: string, studentData: Partial<Omit<Student, 'studentId'>>): Promise<Student | undefined> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const studentIndex = students.findIndex(s => s.studentId === studentId);
      if (studentIndex === -1) {
        reject(new Error("Student not found."));
        return;
      }
      // If seat number is being changed, check availability
      if (studentData.seatNumber && studentData.seatNumber !== students[studentIndex].seatNumber) {
        if (students.find(s => s.seatNumber === studentData.seatNumber && s.studentId !== studentId)) {
          reject(new Error("New seat number is already taken."));
          return;
        }
      }
      students[studentIndex] = { ...students[studentIndex], ...studentData };
      resolve(students[studentIndex]);
    }, 200);
  });
}

export function getAvailableSeats(): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const takenSeats = students.map(s => s.seatNumber);
      const available = ALL_SEAT_NUMBERS.filter(seat => !takenSeats.includes(seat));
      resolve(available);
    }, 100);
  });
}

export function getTakenSeats(): Promise<string[]> {
   return new Promise((resolve) => {
    setTimeout(() => {
      const takenSeats = students.map(s => s.seatNumber).filter(Boolean) as string[];
      resolve(takenSeats);
    }, 100);
  });
}
