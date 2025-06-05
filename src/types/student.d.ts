
export type Shift = "morning" | "evening" | "fullday";
export type FeeStatus = "Paid" | "Due" | "Overdue" | "N/A";
export type ActivityStatus = "Active" | "Left";

export interface Student {
  studentId: string;
  name: string;
  email?: string; // Optional as per registration form
  phone: string;
  password?: string; // Added for member login
  shift: Shift;
  seatNumber: string | null; // Can be null if student has left
  idCardFileName?: string; // Optional, as ID card upload might not always happen
  feeStatus: FeeStatus;
  activityStatus: ActivityStatus;
  registrationDate: string; // ISO date string
  lastPaymentDate?: string; // ISO date string
  nextDueDate?: string; // ISO date string
  amountDue?: string; // e.g., "Rs. 700"
  paymentHistory?: PaymentRecord[];
  profilePictureUrl?: string;
}

export interface PaymentRecord {
  paymentId: string;
  date: string; // ISO date string
  amount: string; // e.g., "Rs. 700"
  transactionId: string;
  method: "UPI" | "Cash" | "Card" | "Online" | "Desk Payment"; // Added Desk Payment
}

export interface AttendanceRecord {
  recordId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string, optional
}
