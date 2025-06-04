
export type Shift = "morning" | "evening" | "fullday";
export type FeeStatus = "Paid" | "Due" | "Overdue" | "N/A";
export type ActivityStatus = "Active" | "Left";

export interface Student {
  studentId: string;
  name: string;
  email?: string; // Optional as per registration form
  phone: string;
  shift: Shift;
  seatNumber: string | null; // Can be null if student has left
  idCardFileName?: string; // Optional, as ID card upload might not always happen
  feeStatus: FeeStatus;
  activityStatus: ActivityStatus;
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
// Adjusted to a more realistic seat naming convention for the example
export const ALL_SEAT_NUMBERS = Array.from({ length: 20 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`)
  .concat(Array.from({ length: 20 }, (_, i) => `B${String(i + 1).padStart(2, '0')}`))
  .concat(Array.from({ length: 45 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`));
