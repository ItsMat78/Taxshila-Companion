// Re-export all domain services for backwards compatibility.
// Existing imports from '@/services/student-service' will continue to work.

export * from './student-core-service';
export * from './attendance-client-service';
export * from './fee-service';
export * from './communication-client-service';

// --- Module augmentations (must remain in a single declaration site) ---
declare module '@/types/student' {
  interface Student {
    id?: string;
    firestoreId?: string;
    readGeneralAlertIds?: string[];
  }
}
declare module '@/types/communication' {
  interface FeedbackItem {
    firestoreId?: string;
  }
  interface AlertItem {
    firestoreId?: string;
  }
}
