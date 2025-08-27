

"use client";
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebarContent } from './app-sidebar-content';
import { Button } from '@/components/ui/button';
import { PanelLeft, Inbox, Bell, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationBadge } from '@/components/shared/notification-badge';
import { cn } from '@/lib/utils';
import { TopProgressBar } from '@/components/shared/top-progress-bar';
import { useToast } from '@/hooks/use-toast';
import { useNotificationContext } from '@/contexts/notification-context';
import { useTheme } from "next-themes";
import { useNotificationCounts } from '@/hooks/use-notification-counts';
import { setupPushNotifications } from '@/lib/notification-setup';

function NotificationIconArea() {
  const { user } = useAuth();
  const { count: notificationCount, isLoadingCount } = useNotificationCounts();
  
  if (!user) return null;

  const icon = user.role === 'admin' ? Inbox : Bell;
  const href = user.role === 'admin' ? '/admin/feedback' : '/member/alerts';
  
  if(isLoadingCount) {
    return (
        <Button size="icon" variant="ghost" className="relative" asChild>
            <Link href={href}>
               <Loader2 className="h-5 w-5 animate-spin" />
            </Link>
        </Button>
    )
  }

  return (
    <Button size="icon" variant="ghost" className="relative" asChild>
      <Link href={href}>
        <NotificationBadge icon={icon} count={notificationCount} />
        <span className="sr-only">Notifications</span>
      </Link>
    </Button>
  );
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isRouteLoading, setIsRouteLoading] = React.useState(false);
  const prevPathnameRef = React.useRef(pathname);
  const { toast } = useToast();
  const { refreshNotifications } = useNotificationContext();
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    const isPublicPath = pathname.startsWith('/login');
    if (!isAuthLoading && !user && !isPublicPath) {
      router.replace('/login');
    }
  }, [user, isAuthLoading, pathname, router]);

  React.useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setIsRouteLoading(true);
      prevPathnameRef.current = pathname;
      const timer = setTimeout(() => {
        setIsRouteLoading(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  React.useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setTheme(user.theme);
    }
  }, [user, theme, setTheme]);
  
  // --- New Robust Notification Setup ---
  React.useEffect(() => {
    if (user && user.firestoreId && user.role) {
      // Check if permission has already been granted but not explicitly denied
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          console.log("[AppLayout] Notification permission already granted. Setting up push notifications silently.");
          setupPushNotifications(user.firestoreId, user.role);
      }
    }
  }, [user]);
  // --- End New Logic ---


  const isPublicPath = pathname.startsWith('/login');

  if (isAuthLoading && !isPublicPath) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] mt-4" />
        <Skeleton className="h-4 w-[200px] mt-2" />
      </div>
    );
  }
  
  if (!user && !isPublicPath) {
    return null;
  }

  if (isPublicPath) {
    return (
      <>
        <TopProgressBar isLoading={isRouteLoading} />
        {children}
      </>
    );
  }
  
  if (user) {
    return (
      <SidebarProvider defaultOpen>
        <TopProgressBar isLoading={isRouteLoading} />
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
            <div className="ml-auto flex items-center gap-2">
              <NotificationIconArea />
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return null;
}
