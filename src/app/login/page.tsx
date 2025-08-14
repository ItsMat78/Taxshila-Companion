
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPageRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    // Wait until authentication status is known
    if (!isLoading) {
      if (user) {
        // If user is already logged in, redirect them to their respective dashboard
        const destination = user.role === 'admin' ? '/' : '/member/dashboard';
        router.replace(destination);
      } else {
        // If no user, redirect to the specific admin login page
        router.replace('/login/admin');
      }
    }
  }, [router, user, isLoading]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Initializing...</p>
    </div>
  );
}
