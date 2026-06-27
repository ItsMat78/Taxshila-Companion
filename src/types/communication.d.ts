
export type FeedbackType = "Suggestion" | "Complaint" | "Issue" | "Compliment" | "Request";
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
  type: "info" | "warning" | "closure" | "feedback_response"; // Added feedback_response
  dateSent: string; // ISO date string
  isRead?: boolean; // New field for read status
  originalFeedbackId?: string; // New field
  originalFeedbackMessageSnippet?: string; // New field
}

// Per-channel push delivery counts returned by the notification service / API.
export interface NotificationResult {
  fcm: { sent: number; failed: number };       // browser / PWA web push
  oneSignal: { sent: number; failed: number }; // native app push
  recipients: number;                          // total tokens/ids attempted
}

// Per-member delivery breakdown (used for broadcasts so we can show who was reached).
export interface MemberDelivery {
  studentId: string;
  name: string;
  result: NotificationResult;
}

// An aggregate result that may also carry a per-member breakdown (general broadcasts).
export interface AlertDispatchResult extends NotificationResult {
  perMember?: MemberDelivery[];
}
