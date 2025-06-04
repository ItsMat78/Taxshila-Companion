
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page now redirects to the member login page by default.
export default function LoginPageRedirect() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/login/member');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
    </div>
  );
}
