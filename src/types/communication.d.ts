
export type FeedbackType = "Suggestion" | "Complaint" | "Issue" | "Compliment";
export type FeedbackStatus = "Open" | "Resolved" | "Archived";

export interface FeedbackItem {
  id: string;
  studentId?: string; // Optional: for feedback submitted by logged-in students
  studentName?: string; // Optional: name of the student
  message: string;
  type: FeedbackType;
  dateSubmitted: string; // ISO date string
  status: FeedbackStatus;
}

export interface AlertItem {
  id: string;
  studentId?: string; // Optional: for targeted alerts to a specific student
  title: string;
  message: string;
  type: "info" | "warning" | "closure"; // Corresponds to admin alert types
  dateSent: string; // ISO date string
}

    