
"use client";

import type { UserRole } from '@/types/auth';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getStudentByIdentifier } from '@/services/student-service'; 
import { useToast } from "@/hooks/use-toast"; 

interface User {
  email: string;
  role: UserRole;
  profilePictureUrl?: string; 
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, passwordAttempt: string) => Promise<User | null>; 
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const adminUsers = [
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
      const storedUser = localStorage.getItem('taxshilaUser'); // Changed to localStorage
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
      const userData: User = { email: admin.email, role: admin.role, profilePictureUrl: admin.profilePictureUrl };
      setUser(userData);
      localStorage.setItem('taxshilaUser', JSON.stringify(userData)); // Changed to localStorage
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
        const userData: User = { email: member.email, role: 'member' as UserRole, profilePictureUrl: member.profilePictureUrl };
        setUser(userData);
        localStorage.setItem('taxshilaUser', JSON.stringify(userData)); // Changed to localStorage
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('taxshilaUser'); // Changed to localStorage
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
