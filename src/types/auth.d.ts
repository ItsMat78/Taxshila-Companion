
export type UserRole = 'admin' | 'member';

export interface Admin {
  firestoreId: string;
  email: string;
  name: string;
  role: 'admin';
  fcmTokens?: string[];
  theme?: string;
}
