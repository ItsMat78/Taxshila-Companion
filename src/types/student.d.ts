
export type Shift = "morning" | "evening" | "fullday";
export type FeeStatus = "Paid" | "Due" | "Overdue" | "N/A";

export interface Student {
  studentId: string;
  name: string;
  email?: string; // Optional as per registration form
  phone: string;
  shift: Shift;
  seatNumber: string; // Assuming seat is assigned on registration
  idCardFileName?: string; // Optional, as ID card upload might not always happen
  feeStatus: FeeStatus;
  registrationDate: string; // ISO date string
  lastPaymentDate?: string; // ISO date string
  nextDueDate?: string; // ISO date string
  amountDue?: string; // e.g., "₹700"
  paymentHistory?: PaymentRecord[];
  profilePictureUrl?: string;
}

export interface PaymentRecord {
  paymentId: string;
  date: string; // ISO date string
  amount: string; // e.g., "₹700"
  transactionId: string;
  method: "UPI" | "Cash" | "Card" | "Online"; // Add more as needed
}

// Define all seat numbers (e.g., 01-85)
export const ALL_SEAT_NUMBERS = Array.from({ length: 85 }, (_, i) => String(i + 1).padStart(2, '0'));
