
"use client";

import type { UserRole } from '@/types/auth';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getStudentByIdentifier, getStudentByEmail, removeFCMTokenForStudent } from '@/services/student-service';
import { useToast } from "@/hooks/use-toast";
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';
import { app as firebaseApp } from '@/lib/firebase'; // For messaging
import { VAPID_KEY_FROM_CLIENT_LIB } from '@/lib/firebase-messaging-client'; // Import VAPID key

interface User {
  email: string;
  role: UserRole;
  profilePictureUrl?: string;
  firestoreId?: string; // Add for easier token management
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, passwordAttempt: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const adminUsers = [
  { name: "Shreyash Rai", email: 'shreyashrai078@gmail.com', phone: '8210183751', password: 'meowmeow123', role: 'admin' as UserRole, profilePictureUrl: undefined, firestoreId: 'admin_shreyash' }, // Example firestoreId for admin
  { name: "Kritika Rai", email: 'kritigrace@gmail.com', phone: '9621678184', password: 'meowmeow123', role: 'admin' as UserRole, profilePictureUrl: undefined, firestoreId: 'admin_kritika' }, // Example firestoreId for admin
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

    const admin = adminUsers.find(
      (u) => (u.email.toLowerCase() === identifier.toLowerCase() || u.phone === identifier) && u.password === passwordAttempt
    );
    if (admin) {
      const userData: User = { email: admin.email, role: admin.role, profilePictureUrl: admin.profilePictureUrl, firestoreId: admin.firestoreId };
      setUser(userData);
      localStorage.setItem('taxshilaUser', JSON.stringify(userData));
      setIsLoading(false);
      return userData;
    }

    try {
      const member = await getStudentByIdentifier(identifier);
      if (member && member.password === passwordAttempt && member.activityStatus === 'Active') {
        if (!member.email) {
            toast({ title: "Login Issue", description: "Member account has no email. Please contact admin.", variant: "destructive" });
            setIsLoading(false);
            return null;
        }
        const userData: User = { email: member.email, role: 'member' as UserRole, profilePictureUrl: member.profilePictureUrl, firestoreId: member.firestoreId };
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

    if(!admin){
      toast({ title: "Login Failed", description: "Invalid credentials or user not found.", variant: "destructive" });
    }
    setIsLoading(false);
    return null;
  };

  const logout = async () => {
    if (user && user.role === 'member' && user.firestoreId && typeof window !== 'undefined') {
      try {
        const messaging = getMessaging(firebaseApp);
        if (VAPID_KEY_FROM_CLIENT_LIB && !VAPID_KEY_FROM_CLIENT_LIB.includes("REPLACE THIS")) {
          // Attempt to get current token to remove it
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY_FROM_CLIENT_LIB }).catch(() => null);
          if (currentToken) {
            console.log("[AuthContext] Attempting to remove FCM token on logout:", currentToken);
            await removeFCMTokenForStudent(user.firestoreId, currentToken);
            // Optionally, also delete the token from FCM to stop messages completely for this instance
            await deleteToken(messaging).catch(err => console.warn("[AuthContext] Failed to delete token from FCM:", err));
            console.log("[AuthContext] FCM token removed/deleted for student:", user.firestoreId);
          } else {
            console.log("[AuthContext] No current FCM token found on logout, or VAPID key issue.");
          }
        } else {
            console.warn("[AuthContext] VAPID_KEY not configured in firebase-messaging-client.ts, cannot reliably get token for removal on logout.");
        }
      } catch (error) {
        console.error("[AuthContext] Error removing FCM token on logout:", error);
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
