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
import { initPushNotifications, VAPID_KEY_FROM_CLIENT_LIB } from '@/lib/firebase-messaging-client';
// Removed getStudentByEmail as it's no longer directly needed here for admin token check
import { useToast } from '@/hooks/use-toast';
import { useNotificationContext } from '@/contexts/notification-context';

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
  const pathname = usePathname();
  const router = useRouter();
  const [isRouteLoading, setIsRouteLoading] = React.useState(false);
  const prevPathnameRef = React.useRef(pathname);
  const { toast } = useToast();
  const { refreshNotifications } = useNotificationContext();

  React.useEffect(() => {
    if (!isAuthLoading && !user && !pathname.startsWith('/login')) {
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
    const setupPush = async () => {
      if (user && user.firestoreId && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        
        if (!VAPID_KEY_FROM_CLIENT_LIB || VAPID_KEY_FROM_CLIENT_LIB.includes("REPLACE THIS")) {
            console.warn("[AppLayout] VAPID_KEY is not configured in firebase-messaging-client.ts. Push notifications will not be initialized.");
            return;
        }
        try {
          // Pass both firestoreId and role to initPushNotifications
          console.log(`[AppLayout] Attempting to initialize push notifications for ${user.role}:`, user.firestoreId);
          await initPushNotifications(user.firestoreId, user.role);
        } catch (error) {
          console.error(`[AppLayout] Error during push notification setup for ${user.role}:`, error);
        }
      } else if (user && !user.firestoreId && user.role === 'admin') {
        console.warn("[AppLayout] Admin user logged in but no firestoreId found in auth context. FCM token cannot be saved. Ensure admin user exists in 'admins' Firestore collection.");
      }
    };
    if (!isAuthLoading && user) {
      setupPush();
    }
  }, [user, isAuthLoading]); // Depend on user to re-run if user object (with firestoreId) changes

  
  React.useEffect(() => {
    const handleForegroundMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      const notificationPayload = customEvent.detail;
      console.log("[AppLayout] Foreground message event received:", notificationPayload);
      if (notificationPayload && notificationPayload.title && notificationPayload.body) {
        toast({
          title: notificationPayload.title,
          description: notificationPayload.body,
        });
        refreshNotifications();
      }
    };
    window.addEventListener('show-foreground-message', handleForegroundMessage);
    return () => {
      window.removeEventListener('show-foreground-message', handleForegroundMessage);
    };
  }, [toast, refreshNotifications]);

  
  React.useEffect(() => {
    const handleNewFeedback = (event: Event) => {
      const customEvent = event as CustomEvent;
      const feedbackId = customEvent.detail?.feedbackId;
      console.log(`[AppLayout] 'new-feedback-submitted' event caught. Feedback ID: ${feedbackId}. User role: ${user?.role}.`);
      if (user && user.role === 'admin') {
        console.log("[AppLayout] Admin detected, showing toast for new feedback and refreshing notifications.");
        toast({
          title: "New Feedback Received",
          description: "A member has submitted new feedback. Please check the feedback section.",
        });
        refreshNotifications();
      }
    };
    window.addEventListener('new-feedback-submitted', handleNewFeedback);
    return () => {
      window.removeEventListener('new-feedback-submitted', handleNewFeedback);
    };
  }, [user, toast, refreshNotifications]);


  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] mt-4" />
        <Skeleton className="h-4 w-[200px] mt-2" />
      </div>
    );
  }

  if (!user && !pathname.startsWith('/login')) {
    return null;
  }

  if (pathname.startsWith('/login')) {
    return (
      <>
        <TopProgressBar isLoading={isRouteLoading} />
        {children}
      </>
    );
  }

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
