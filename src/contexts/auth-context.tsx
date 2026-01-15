
"use client";

import type { UserRole } from '@/types/auth';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { 
  getStudentByIdentifier, 
  getAdminByEmail, 
  updateUserTheme,
  removeOneSignalPlayerId,
} from '@/services/student-service';
import type { Student } from '@/types/student';
import type { Admin } from '@/types/auth';
import { useToast } from "@/hooks/use-toast";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
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
  uid: string; // Ensure UID is always present
}

interface AuthContextType {
  user: User | null;
  updateUser: (updatedData: Partial<User>) => void;
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setIsLoading(true);
      if (firebaseUser && firebaseUser.email) {
        // User is signed in, fetch their profile from Firestore
        let userRecord: Student | Admin | null = null;
        let userRole: UserRole = 'member';
        
        const admin = await getAdminByEmail(firebaseUser.email);
        if (admin) {
            userRecord = admin;
            userRole = 'admin';
        } else {
            userRecord = (await getStudentByIdentifier(firebaseUser.email)) ?? null;
        }

        if (userRecord) {
            const userData: User = {
                uid: firebaseUser.uid,
                email: userRecord.email,
                role: userRole,
                profilePictureUrl: userRole === 'member' ? (userRecord as Student).profilePictureUrl : undefined,
                firestoreId: userRecord.firestoreId,
                studentId: userRole === 'member' ? (userRecord as Student).studentId : undefined,
                identifierForDisplay: userRecord.name,
                theme: userRecord.theme || 'light-default',
            };
            setUser(userData);
            localStorage.setItem('taxshilaUser', JSON.stringify(userData)); // Keep for quick initial loads
            setTheme(userData.theme);
        } else {
            // Auth user exists but no DB record, force logout
            await signOut(auth);
            setUser(null);
            localStorage.removeItem('taxshilaUser');
        }
      } else {
        // User is signed out
        setUser(null);
        localStorage.removeItem('taxshilaUser');
      }
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [auth, setTheme]);


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
       const userCredential = await signInWithEmailAndPassword(auth, emailForAuth, passwordAttempt);
       const idToken = await userCredential.user.getIdToken(true);
        
        let userData: User;
        if (userRole === 'admin') {
            try {
                await fetch('/api/admin/verify-and-set-claim', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
            } catch (claimError) {
                console.warn("Could not heal admin claims, this might affect permissions.", claimError);
            }

            const adminRecord = userRecord as Admin;
            userData = {
                uid: userCredential.user.uid,
                email: adminRecord.email,
                role: 'admin',
                firestoreId: adminRecord.firestoreId,
                identifierForDisplay: adminRecord.name,
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
                uid: userCredential.user.uid,
                email: studentRecord.email ?? undefined,
                role: 'member',
                profilePictureUrl: studentRecord.profilePictureUrl,
                firestoreId: studentRecord.firestoreId,
                studentId: studentRecord.studentId,
                identifierForDisplay: studentRecord.name,
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
            const storageKey = `oneSignalPlayerId_${user.firestoreId}`;
            const playerId = localStorage.getItem(storageKey);
            if (playerId) {
                removeOneSignalPlayerId(user.firestoreId, user.role, playerId)
                    .catch(err => console.error("Failed to remove OneSignal ID:", err));
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
    
    router.push('/');
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
