
"use client";

import type { UserRole } from '@/types/auth';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, role: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

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

  // This effect handles redirection IF NOT on a login page and user state changes or loads
  React.useEffect(() => {
    if (!isLoading && !user && !pathname.startsWith('/login')) {
      router.replace('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = (email: string, role: UserRole) => {
    const userData = { email, role };
    setUser(userData);
    sessionStorage.setItem('taxshilaUser', JSON.stringify(userData));
    setIsLoading(false); // Ensure loading is false after login attempt
    if (role === 'admin') {
      router.push('/'); // Admin dashboard
    } else {
      router.push('/member/dashboard'); // Member dashboard
    }
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
