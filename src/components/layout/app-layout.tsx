
"use client";
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarContent } from './app-sidebar-content';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user && !pathname.startsWith('/login')) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] mt-4" />
        <Skeleton className="h-4 w-[200px] mt-2" />
      </div>
    );
  }
  
  // If not authenticated and not on a login page, router effect will redirect.
  // This check prevents rendering layout for non-authed users briefly.
  if (!user && !pathname.startsWith('/login')) {
    return null; 
  }

  // If on a login page, don't render the AppLayout (sidebar, header, etc.)
  if (pathname.startsWith('/login')) {
    return <>{children}</>;
  }
  
  // Authenticated users see the AppLayout
  return (
    <SidebarProvider defaultOpen>
      <AppSidebarContent />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
          <SidebarTrigger asChild>
            <Button size="icon" variant="outline" className="md:hidden">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SidebarTrigger>
          <Link href="/" className="flex items-center gap-2 font-headline text-lg font-semibold">
             Taxshila Companion
          </Link>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0"> {/* Added min-w-0 here */}
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
