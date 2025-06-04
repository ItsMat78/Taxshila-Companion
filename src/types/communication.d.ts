
export type FeedbackType = "Suggestion" | "Complaint" | "Issue" | "Compliment";
export type FeedbackStatus = "Open" | "Resolved" | "Archived";

export interface FeedbackItem {
  id: string;
  studentId?: string;
  studentName?: string;
  message: string;
  type: FeedbackType;
  dateSubmitted: string; // ISO date string
  status: FeedbackStatus;
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "closure"; // Corresponds to admin alert types
  dateSent: string; // ISO date string
}
