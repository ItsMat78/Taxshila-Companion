
export type Shift = "morning" | "evening" | "fullday";
export type FeeStatus = "Paid" | "Due" | "Overdue" | "N/A";
export type ActivityStatus = "Active" | "Left";

export interface Student {
  uid?: string; // Firebase Auth UID
  firestoreId?: string; // Firestore document ID, populated when read from Firestore
  studentId: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  password?: string;
  shift: Shift;
  seatNumber: string | null;
  idCardFileName?: string;
  feeStatus: FeeStatus;
  activityStatus: ActivityStatus;
  registrationDate: string;
  lastPaymentDate?: string;
  nextDueDate?: string;
  leftDate?: string; // New field for when student is marked as left
  lastAttendanceDate?: string; // ISO date string of most recent check-in
  amountDue?: string;
  paymentHistory?: PaymentRecord[];
  profilePictureUrl?: string;
  fcmTokens?: string[]; // For Firebase Web Push
  oneSignalPlayerIds?: string[]; // For OneSignal App Push
  theme?: string;
}

export interface Admin {
  firestoreId: string;
  email: string;
  name: string;
  role: 'admin';
  fcmTokens?: string[];
  oneSignalPlayerIds?: string[];
  theme?: string;
}


export interface PaymentRecord {
  paymentId: string;
  date: string;
  amount: string;
  transactionId: string;
  method: "Cash" | "Online" | "Desk Payment" | "UPI" | "Card" | "Imported";
  previousDueDate?: string; // yyyy-MM-dd — value of nextDueDate BEFORE this payment
  newDueDate?: string;      // yyyy-MM-dd — value of nextDueDate AFTER this payment
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

export interface WifiConfig {
  id: string;
  ssid: string;
  password?: string;
  notes?: string;
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

export type CheckedInStudentInfo = Student & { checkInTime: string; isOutsideShift: boolean; };

export interface StudentSeatAssignment {
  studentId: string;
  name: string;
  shift: Shift;
  seatNumber: string | null;
  activityStatus: ActivityStatus;
  profilePictureUrl?: string;
}
