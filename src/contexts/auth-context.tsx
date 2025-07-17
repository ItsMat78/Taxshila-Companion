
"use client";

import type { UserRole } from '@/types/auth';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getStudentByIdentifier, getAdminByEmail, removeFCMTokenForStudent, removeAdminFCMToken, updateUserTheme } from '@/services/student-service';
import { useToast } from "@/hooks/use-toast";
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth'; // Import Firebase Auth functions
import { app as firebaseApp } from '@/lib/firebase';
import { VAPID_KEY_FROM_CLIENT_LIB } from '@/lib/firebase-messaging-client';
import { useTheme } from 'next-themes';

interface User {
  email?: string;
  role: UserRole;
  profilePictureUrl?: string;
  firestoreId?: string;
  studentId?: string;
  identifierForDisplay?: string;
  theme?: string;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, passwordAttempt: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
  saveThemePreference: (theme: string) => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Hardcoded admins remain as a fallback/initial login mechanism
const hardcodedAdminUsers = [
  { name: "Shreyash Rai", email: 'shreyashrai078@gmail.com', phone: '8210183751', password: 'meowmeow123', role: 'admin' as UserRole, profilePictureUrl: undefined },
  { name: "Kritika Rai", email: 'kritigrace@gmail.com', phone: '9621678184', password: 'meowmeow123', role: 'admin' as UserRole, profilePictureUrl: undefined },
  { name: "Kartikey Rai", email: 'kartikrai14@gmail.com', phone: '', password: 'meowmeow123', role: 'admin' as UserRole, profilePictureUrl: undefined },
  { name: "Saksham Mishra", email: '', phone: '7991528885', password: 'meowmeow123', role: 'admin' as UserRole, profilePictureUrl: undefined },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    // This effect runs once on mount to restore the user session from localStorage
    try {
      const storedUser = localStorage.getItem('taxshilaUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
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

  React.useEffect(() => {
    // This effect handles redirection based on auth state
    if (!isLoading && !user && !pathname.startsWith('/login')) {
      router.replace('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = async (identifier: string, passwordAttempt: string): Promise<User | null> => {
    setIsLoading(true);

    const matchedHardcodedAdmin = hardcodedAdminUsers.find(
      (u) => ((u.email && u.email.toLowerCase() === identifier.toLowerCase()) || (u.phone && u.phone === identifier)) && u.password === passwordAttempt
    );

    if (matchedHardcodedAdmin) {
      const adminFromDb = await getAdminByEmail(matchedHardcodedAdmin.email);
      const userData: User = { 
          email: matchedHardcodedAdmin.email, 
          role: 'admin', 
          firestoreId: adminFromDb?.firestoreId, 
          identifierForDisplay: adminFromDb?.email, 
          theme: adminFromDb?.theme || 'light-default'
      };
      setUser(userData);
      localStorage.setItem('taxshilaUser', JSON.stringify(userData));
      setTheme(userData.theme);
      setIsLoading(false);
      return userData;
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
          theme: member.theme || 'light-default',
        };
        setUser(userData);
        localStorage.setItem('taxshilaUser', JSON.stringify(userData));
        setTheme(userData.theme);
        setIsLoading(false);
        return userData;
      } else if (member && member.password !== passwordAttempt) {
        toast({ title: "Login Failed", description: "Incorrect password.", variant: "destructive" });
      } else if (member && member.activityStatus === 'Left') {
         toast({ title: "Login Failed", description: "This account is no longer active.", variant: "destructive" });
      } else {
        toast({ title: "Login Failed", description: "Invalid credentials or user not found.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Member login error:", error);
    }
    
    setIsLoading(false);
    return null;
  };


  const logout = async () => {
    const auth = getAuth(firebaseApp);
    await signOut(auth).catch(err => console.warn("Firebase sign out error:", err)); // Sign out from Firebase Auth
    
    if (user && user.firestoreId && typeof window !== 'undefined') {
      try {
        const messaging = getMessaging(firebaseApp);
        if (VAPID_KEY_FROM_CLIENT_LIB && !VAPID_KEY_FROM_CLIENT_LIB.includes("REPLACE THIS")) {
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY_FROM_CLIENT_LIB }).catch(() => null);
          if (currentToken) {
            if (user.role === 'member') {
              await removeFCMTokenForStudent(user.firestoreId, currentToken);
            } else if (user.role === 'admin') {
              await removeAdminFCMToken(user.firestoreId, currentToken);
            }
            await deleteToken(messaging).catch(err => console.warn("[AuthContext] Failed to delete token from FCM:", err));
          }
        }
      } catch (error) {
        console.error("[AuthContext] Error removing FCM token on logout:", error);
      }
    }

    setUser(null);
    localStorage.removeItem('taxshilaUser');
    setTheme('light-default');
    router.push('/login');
  };


  const saveThemePreference = React.useCallback(async (newTheme: string) => {
    if (user && user.firestoreId && user.role && user.theme !== newTheme) {
      try {
        await updateUserTheme(user.firestoreId, user.role, newTheme);
        const updatedUser = { ...user, theme: newTheme };
        setUser(updatedUser);
        localStorage.setItem('taxshilaUser', JSON.stringify(updatedUser));
      } catch (error) {
        console.error("Failed to save theme preference:", error);
        toast({
          title: "Theme Error",
          description: "Could not save your theme preference.",
          variant: "destructive"
        });
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
