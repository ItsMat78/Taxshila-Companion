
export type Shift = "morning" | "evening" | "fullday";
export type FeeStatus = "Paid" | "Due" | "Overdue" | "N/A";
export type ActivityStatus = "Active" | "Left";

export interface Student {
  studentId: string;
  name: string;
  email?: string; 
  phone: string;
  password?: string; 
  shift: Shift;
  seatNumber: string | null; 
  idCardFileName?: string; 
  feeStatus: FeeStatus;
  activityStatus: ActivityStatus;
  registrationDate: string; 
  lastPaymentDate?: string; 
  nextDueDate?: string; 
  amountDue?: string; 
  paymentHistory?: PaymentRecord[];
  profilePictureUrl?: string;
}

export interface PaymentRecord {
  paymentId: string;
  date: string; 
  amount: string; 
  transactionId: string;
  method: "UPI" | "Cash" | "Card" | "Online" | "Desk Payment" | "Imported"; // Added Imported
}

export interface AttendanceRecord {
  recordId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO string
  checkOutTime?: string; // ISO string, optional
}

export interface FeeStructure {
  morningFee: number;
  eveningFee: number;
  fullDayFee: number;
}

// For CSV Import
export interface AttendanceImportData {
  'Student ID': string; // Match CSV header exactly
  'Date': string; // YYYY-MM-DD
  'Check-In Time': string; // HH:MM:SS or YYYY-MM-DD HH:MM:SS
  'Check-Out Time'?: string; // HH:MM:SS or YYYY-MM-DD HH:MM:SS, optional
}

export interface PaymentImportData {
  'Student ID': string;
  'Date': string; // YYYY-MM-DD
  'Amount': string; // "700" or "Rs. 700"
  'Transaction ID'?: string;
  'Method'?: string; // "UPI", "Cash", etc. defaults to "Imported"
}
