
"use client";

import type { UserRole } from '@/types/auth';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  getStudentByIdentifier, 
  getAdminByEmail, 
  removeFCMTokenForStudent, 
  removeAdminFCMToken, 
  updateUserTheme,
} from '@/services/student-service';
import type { Student } from '@/types/student';
import type { Admin } from '@/types/auth';
import { useToast } from "@/hooks/use-toast";
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { app as firebaseApp } from '@/lib/firebase';
import { useTheme } from 'next-themes';

interface User {
  email?: string;
  role: UserRole;
  profilePictureUrl?: string;
  firestoreId: string;
  studentId?: string;
  identifierForDisplay?: string;
  theme: string;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, passwordAttempt: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
  saveThemePreference: (theme: string) => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const auth = getAuth(firebaseApp);

  React.useEffect(() => {
    try {
      const storedUser = localStorage.getItem('taxshilaUser');
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        if (parsedUser.theme) {
          setTheme(parsedUser.theme);
        }
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('taxshilaUser');
    } finally {
      setIsLoading(false);
    }
  }, [setTheme]);

  const login = async (identifier: string, passwordAttempt: string): Promise<User | null> => {
    setIsLoading(true);
    let userRecord: Student | Admin | null = null;
    let userRole: UserRole = 'member';
    let emailForAuth: string | undefined = undefined;

    if (identifier.includes('@')) {
        const admin = await getAdminByEmail(identifier);
        if (admin) {
            userRecord = admin;
            userRole = 'admin';
        } else {
            userRecord = (await getStudentByIdentifier(identifier)) ?? null;
        }
        emailForAuth = identifier;
    } else {
        userRecord = (await getStudentByIdentifier(identifier)) ?? null;
        if (userRecord) {
            emailForAuth = userRecord.email || `${identifier}@taxshila-auth.com`;
        }
    }

    if (!userRecord || !emailForAuth) {
        toast({ title: "Login Failed", description: "Invalid credentials or user not found.", variant: "destructive" });
        setIsLoading(false);
        return null;
    }

    try {
        await signInWithEmailAndPassword(auth, emailForAuth, passwordAttempt);
        
        let userData: User;
        if (userRole === 'admin') {
            const adminRecord = userRecord as Admin;
            userData = {
                email: adminRecord.email,
                role: 'admin',
                firestoreId: adminRecord.firestoreId,
                identifierForDisplay: adminRecord.email,
                theme: adminRecord.theme || 'light-default',
            };
        } else {
             const studentRecord = userRecord as Student;
             if (studentRecord.activityStatus !== 'Active') {
                toast({ title: "Login Failed", description: "This account is no longer active.", variant: "destructive" });
                await signOut(auth);
                setIsLoading(false);
                return null;
             }
             if (!studentRecord.firestoreId) {
                toast({ title: "Login Error", description: "Critical error: User profile is missing a database ID.", variant: "destructive" });
                await signOut(auth);
                setIsLoading(false);
                return null;
             }
             userData = {
                email: studentRecord.email ?? undefined,
                role: 'member',
                profilePictureUrl: studentRecord.profilePictureUrl,
                firestoreId: studentRecord.firestoreId,
                studentId: studentRecord.studentId,
                identifierForDisplay: studentRecord.email || studentRecord.phone,
                theme: studentRecord.theme || 'light-default',
            };
        }
        
        setUser(userData);
        localStorage.setItem('taxshilaUser', JSON.stringify(userData));
        setTheme(userData.theme);
        return userData;

    } catch (error: any) {
        console.error("Firebase login error:", error.code);
        if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email', 'auth/invalid-credential'].includes(error.code)) {
            toast({ title: "Login Failed", description: "Invalid credentials.", variant: "destructive" });
        } else {
            toast({ title: "Login Error", description: "An unexpected error occurred.", variant: "destructive" });
        }
    } finally {
        setIsLoading(false);
    }

    return null;
  };

  const logout = async () => {
    const loggedOutUser = user;
    
    setUser(null);
    localStorage.removeItem('taxshilaUser');
    setTheme('light-default');
    
    await signOut(auth).catch(err => console.warn("Firebase sign out error:", err));
    
    if (loggedOutUser && loggedOutUser.firestoreId && typeof window !== 'undefined') {
      try {
        const messaging = getMessaging(firebaseApp);
        const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (VAPID_KEY) {
          const registration = await navigator.serviceWorker.getRegistration('/firebase-push-worker.js');
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration }).catch(() => null);
          if (currentToken) {
            if (loggedOutUser.role === 'member') await removeFCMTokenForStudent(loggedOutUser.firestoreId, currentToken);
            else if (loggedOutUser.role === 'admin') await removeAdminFCMToken(loggedOutUser.firestoreId, currentToken);
            await deleteToken(messaging).catch(err => console.warn("[AuthContext] Failed to delete token:", err));
          }
        }
      } catch (error) {
        console.error("[AuthContext] Error on logout:", error);
      }
    }
    
    router.push('/login');
  };

  const saveThemePreference = React.useCallback(async (newTheme: string) => {
    if (user && user.theme !== newTheme) {
      try {
        await updateUserTheme(user.firestoreId, user.role, newTheme);
        const updatedUser = { ...user, theme: newTheme };
        setUser(updatedUser);
        localStorage.setItem('taxshilaUser', JSON.stringify(updatedUser));
      } catch (error) {
        console.error("Failed to save theme:", error);
        toast({ title: "Theme Error", description: "Could not save theme.", variant: "destructive" });
      }
    }
  }, [user, toast]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, saveThemePreference }}>
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
