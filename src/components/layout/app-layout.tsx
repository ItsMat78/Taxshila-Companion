

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
import { useNotificationCounts } from '@/hooks/use-notification-counts';
import { NotificationBadge } from '@/components/shared/notification-badge';
import { cn } from '@/lib/utils';
import { TopProgressBar } from '@/components/shared/top-progress-bar';
import { setupPushNotifications } from '@/lib/notification-setup';
import { useToast } from '@/hooks/use-toast';
import { useNotificationContext } from '@/contexts/notification-context';
import { useTheme } from "next-themes";

function NotificationIconArea() {
  const { user } = useAuth();
  const { count, isLoadingCount } = useNotificationCounts();

  if (!user) return null;
  if (isLoadingCount) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }

  let href = "/";
  let IconComponent = Inbox;

  if (user.role === 'admin') {
    href = "/admin/feedback";
    IconComponent = Inbox;
  } else if (user.role === 'member') {
    href = "/member/alerts";
    IconComponent = Bell;
  }

  if (count > 0) {
    return (
      <Link href={href} passHref legacyBehavior>
        <Button variant="ghost" size="icon" aria-label={user.role === 'admin' ? 'View Feedback' : 'View Alerts'}>
          <NotificationBadge icon={IconComponent} count={count} iconClassName="h-5 w-5" />
        </Button>
      </Link>
    );
  }

  return null;
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

  React.useEffect(() => {
    if (user && user.firestoreId && user.role) {
      // Delay setup slightly to ensure all browser services are ready
      setTimeout(() => {
        console.log(`AppLayout: Triggering push notification setup for user ${user.firestoreId}`);
         setupPushNotifications(user.firestoreId, user.role);
      }, 2000);
    }
  }, [user]);

  React.useEffect(() => {
    const handleNewNotification = () => {
        // This event is dispatched from `onMessage` in `notification-setup.ts`
        // It indicates a new foreground notification has arrived.
        // We can refresh the counts to update the UI badges.
        refreshNotifications();
    };
    
    window.addEventListener('new-foreground-notification', handleNewNotification);
    
    // This listener handles the legacy feedback submission event just in case
    const handleNewFeedback = (event: Event) => {
      if (user && user.role === 'admin') {
        toast({
          title: "New Feedback Received",
          description: "A member has submitted new feedback. Please check the feedback section.",
        });
        refreshNotifications();
      }
    };
    window.addEventListener('new-feedback-submitted', handleNewFeedback);
    
    return () => {
      window.removeEventListener('new-foreground-notification', handleNewNotification);
      window.removeEventListener('new-feedback-submitted', handleNewFeedback);
    };
  }, [user, toast, refreshNotifications]);

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
