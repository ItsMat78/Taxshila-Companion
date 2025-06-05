
"use client";

import type { UserRole } from '@/types/auth';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getStudentByIdentifier } from '@/services/student-service'; // Import service
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface User {
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, passwordAttempt: string) => Promise<void>; // Updated signature
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const adminUsers = [
  { name: "Shreyash Rai", email: 'shreyashrai078@gmail.com', phone: '8210183751', password: 'meowmeow123', role: 'admin' as UserRole },
  { name: "Kritika Rai", email: 'kritigrace@gmail.com', phone: '9621678184', password: 'meowmeow123', role: 'admin' as UserRole },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  React.useEffect(() => {
    const mockSessionCheck = setTimeout(() => {
      const storedUser = sessionStorage.getItem('taxshilaUser');
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

  const login = async (identifier: string, passwordAttempt: string) => {
    setIsLoading(true);

    // Try admin login
    const admin = adminUsers.find(
      (u) => (u.email.toLowerCase() === identifier.toLowerCase() || u.phone === identifier) && u.password === passwordAttempt
    );
    if (admin) {
      const userData = { email: admin.email, role: admin.role };
      setUser(userData);
      sessionStorage.setItem('taxshilaUser', JSON.stringify(userData));
      router.push('/'); // Admin dashboard
      setIsLoading(false);
      return;
    }

    // Try member login
    try {
      const member = await getStudentByIdentifier(identifier);
      if (member && member.password === passwordAttempt && member.activityStatus === 'Active') {
        if (!member.email) {
            toast({ title: "Login Issue", description: "Member account has no email. Please contact admin.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        const userData = { email: member.email, role: 'member' as UserRole };
        setUser(userData);
        sessionStorage.setItem('taxshilaUser', JSON.stringify(userData));
        router.push('/member/dashboard');
        setIsLoading(false);
        return;
      } else if (member && member.password !== passwordAttempt) {
        toast({ title: "Login Failed", description: "Incorrect password for member.", variant: "destructive" });
      } else if (member && member.activityStatus === 'Left') {
         toast({ title: "Login Failed", description: "This member account is no longer active. Please contact administration.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Member login error:", error);
      // This catch might not be strictly necessary if getStudentByIdentifier returns undefined for not found
    }

    // If neither admin nor member login succeeded
    toast({ title: "Login Failed", description: "Invalid credentials or user not found.", variant: "destructive" });
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('taxshilaUser');
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
