
"use client";

import type { UserRole } from '@/types/auth';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getStudentByIdentifier, getStudentByEmail, removeFCMTokenForStudent, getAdminByEmail, removeAdminFCMToken } from '@/services/student-service'; // Added admin functions
import { useToast } from "@/hooks/use-toast";
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';
import { app as firebaseApp } from '@/lib/firebase'; // For messaging
import { VAPID_KEY_FROM_CLIENT_LIB } from '@/lib/firebase-messaging-client'; // Import VAPID key

interface User {
  email?: string;
  role: UserRole;
  profilePictureUrl?: string;
  firestoreId?: string;
  studentId?: string;
  identifierForDisplay?: string;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, passwordAttempt: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const hardcodedAdminUsers = [
  { name: "Shreyash Rai", email: 'shreyashrai078@gmail.com', phone: '8210183751', password: 'meowmeow123', role: 'admin' as UserRole, profilePictureUrl: undefined },
  { name: "Kritika Rai", email: 'kritigrace@gmail.com', phone: '9621678184', password: 'meowmeow123', role: 'admin' as UserRole, profilePictureUrl: undefined },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  React.useEffect(() => {
    const mockSessionCheck = setTimeout(() => {
      const storedUser = localStorage.getItem('taxshilaUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(mockSessionCheck);
  }, []);

  React.useEffect(() => {
    if (!isLoading && !user && !pathname.startsWith('/login')) {
      router.replace('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (identifier: string, passwordAttempt: string): Promise<User | null> => {
    setIsLoading(true);

    const matchedHardcodedAdmin = hardcodedAdminUsers.find(
      (u) => (u.email.toLowerCase() === identifier.toLowerCase() || u.phone === identifier) && u.password === passwordAttempt
    );

    if (matchedHardcodedAdmin) {
      console.log("[AuthContext] Admin login attempt for:", matchedHardcodedAdmin.email);
      try {
        const adminFromDb = await getAdminByEmail(matchedHardcodedAdmin.email);
        if (adminFromDb) {
          console.log("[AuthContext] Admin details fetched from Firestore:", adminFromDb.firestoreId);
          const userData: User = {
            email: adminFromDb.email,
            role: adminFromDb.role,
            profilePictureUrl: matchedHardcodedAdmin.profilePictureUrl, // Keep using hardcoded one if any
            firestoreId: adminFromDb.firestoreId,
            identifierForDisplay: adminFromDb.email, // Set identifier for admin
          };
          setUser(userData);
          localStorage.setItem('taxshilaUser', JSON.stringify(userData));
          setIsLoading(false);
          return userData;
        } else {
          // Admin exists in hardcoded list but not in Firestore 'admins' collection
          // Log them in with hardcoded details but without firestoreId for now.
          // This means they won't get FCM tokens saved until their DB entry is created.
          console.warn(`[AuthContext] Admin ${matchedHardcodedAdmin.email} found in hardcoded list but not in Firestore 'admins' collection. FCM tokens won't be saved.`);
          const userData: User = { email: matchedHardcodedAdmin.email, role: matchedHardcodedAdmin.role, profilePictureUrl: matchedHardcodedAdmin.profilePictureUrl, firestoreId: undefined, identifierForDisplay: matchedHardcodedAdmin.email };
          setUser(userData);
          localStorage.setItem('taxshilaUser', JSON.stringify(userData));
          setIsLoading(false);
          return userData;
        }
      } catch (dbError) {
        console.error("[AuthContext] Error fetching admin from Firestore, logging in with hardcoded details only:", dbError);
        const userData: User = { email: matchedHardcodedAdmin.email, role: matchedHardcodedAdmin.role, profilePictureUrl: matchedHardcodedAdmin.profilePictureUrl, firestoreId: undefined, identifierForDisplay: matchedHardcodedAdmin.email };
        setUser(userData);
        localStorage.setItem('taxshilaUser', JSON.stringify(userData));
        setIsLoading(false);
        return userData;
      }
    }

    try {
      const member = await getStudentByIdentifier(identifier);
      if (member && member.password === passwordAttempt && member.activityStatus === 'Active') {
        const userData: User = {
          email: member.email ?? undefined,
          role: 'member' as UserRole,
          profilePictureUrl: member.profilePictureUrl,
          firestoreId: member.firestoreId,
          studentId: member.studentId,
          identifierForDisplay: member.email || member.phone,
        };
        setUser(userData);
        localStorage.setItem('taxshilaUser', JSON.stringify(userData));
        setIsLoading(false);
        return userData;
      } else if (member && member.password !== passwordAttempt) {
        toast({ title: "Login Failed", description: "Incorrect password for member.", variant: "destructive" });
      } else if (member && member.activityStatus === 'Left') {
         toast({ title: "Login Failed", description: "This member account is no longer active. Please contact administration.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Member login error:", error);
    }

    if(!matchedHardcodedAdmin){ // Only show this if it wasn't an admin attempt
      toast({ title: "Login Failed", description: "Invalid credentials or user not found.", variant: "destructive" });
    }
    setIsLoading(false);
    return null;
  };

  const logout = async () => {
    if (user && user.firestoreId && typeof window !== 'undefined') {
      try {
        const messaging = getMessaging(firebaseApp);
        if (VAPID_KEY_FROM_CLIENT_LIB && !VAPID_KEY_FROM_CLIENT_LIB.includes("REPLACE THIS")) {
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY_FROM_CLIENT_LIB }).catch(() => null);
          if (currentToken) {
            if (user.role === 'member') {
              console.log("[AuthContext] Attempting to remove FCM token for member on logout:", currentToken.substring(0,15)+"...");
              await removeFCMTokenForStudent(user.firestoreId, currentToken);
            } else if (user.role === 'admin') {
              console.log("[AuthContext] Attempting to remove FCM token for admin on logout:", currentToken.substring(0,15)+"...");
              await removeAdminFCMToken(user.firestoreId, currentToken);
            }
            await deleteToken(messaging).catch(err => console.warn("[AuthContext] Failed to delete token from FCM:", err));
            console.log("[AuthContext] FCM token removed/deleted for user:", user.firestoreId);
          } else {
            console.log("[AuthContext] No current FCM token found on logout, or VAPID key issue for user:", user.email);
          }
        } else {
            console.warn("[AuthContext] VAPID_KEY not configured. Cannot reliably get token for removal on logout for user:", user.email);
        }
      } catch (error) {
        console.error("[AuthContext] Error removing FCM token on logout for user:", user.email, error);
      }
    }

    setUser(null);
    localStorage.removeItem('taxshilaUser');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
