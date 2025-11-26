
export type UserRole = 'admin' | 'member';

// This interface is now primarily for client-side representation.
// The canonical data structure is in src/types/student.d.ts
export interface Admin {
  firestoreId: string;
  email: string;
  name: string;
  role: 'admin';
  fcmTokens?: string[];
  oneSignalPlayerIds?: string[];
  theme?: string;
}
