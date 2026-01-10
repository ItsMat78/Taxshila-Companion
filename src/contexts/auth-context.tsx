
"use client";

import type { UserRole } from '@/types/auth';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  getStudentByIdentifier, 
  getAdminByEmail, 
  updateUserTheme,
  removeOneSignalPlayerId, // Import the new function
} from '@/services/student-service';
import type { Student } from '@/types/student';
import type { Admin } from '@/types/auth';
import { useToast } from "@/hooks/use-toast";
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
  updateUser: (updatedData: Partial<User>) => void; // New function
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

  const updateUser = (updatedData: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedData };
      localStorage.setItem('taxshilaUser', JSON.stringify(newUser));
      return newUser;
    });
  };

  const login = async (identifier: string, passwordAttempt: string): Promise<User | null> => {
    setIsLoading(true);
    let userRecord: Student | Admin | null = null;
    let userRole: UserRole = 'member';
    let emailForAuth: string | undefined = undefined;

    // Clear stale user data from local storage before attempting a new login
    localStorage.removeItem('taxshilaUser');

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
       await auth.currentUser.getIdToken(true);
        
        let userData: User;
        if (userRole === 'admin') {
            const adminRecord = userRecord as Admin;
            userData = {
                email: adminRecord.email,
                role: 'admin',
                firestoreId: adminRecord.firestoreId,
                identifierForDisplay: adminRecord.name, // Use name for display
                theme: adminRecord.theme || 'light-default',
            };
        } else {
             const studentRecord = userRecord as Student;
             if (studentRecord.activityStatus !== 'Active') {
                toast({ title: "Login Failed", description: "This account is no longer active. Please contact an admin.", variant: "destructive" });
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
                identifierForDisplay: studentRecord.name, // Use name for display
                theme: studentRecord.theme || 'light-default',
            };
        }
        
        setUser(userData);
        localStorage.setItem('taxshilaUser', JSON.stringify(userData));
        setTheme(userData.theme);
        return userData;

    } catch (error: any) {
        console.error("Firebase login error:", error.code, error.message);
        if (['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email', 'auth/invalid-credential'].includes(error.code)) {
            toast({ title: "Login Failed", description: "Invalid credentials.", variant: "destructive" });
        } else {
            toast({ title: "Login Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
        }
    } finally {
        setIsLoading(false);
    }

    return null;
  };

  const logout = async () => {
    try {
        if (user) {
            // 1. Retrieve the ID for the CURRENT user before we delete it
            const storageKey = `oneSignalPlayerId_${user.firestoreId}`;
            const playerId = localStorage.getItem(storageKey);

            // 2. Remove it from Firestore (Fire & Forget)
            if (playerId) {
                // We don't await this because we don't want to block the logout UI
                removeOneSignalPlayerId(user.firestoreId, user.role, playerId)
                    .catch(err => console.error("Failed to remove OneSignal ID:", err));
                
                // 3. Clean up LocalStorage
                localStorage.removeItem(storageKey);
            }
        }
    } catch (error) {
        console.error("Error during OneSignal ID cleanup on logout:", error);
    }

    setUser(null);
    localStorage.removeItem('taxshilaUser');
    setTheme('light-default');
    
    await signOut(auth).catch(err => console.warn("Firebase sign out error:", err));
    
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
    <AuthContext.Provider value={{ user, updateUser, login, logout, isLoading, saveThemePreference }}>
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
