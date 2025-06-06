
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
import { initPushNotifications } from '@/lib/firebase-messaging-client'; // Import push init
import { getStudentByEmail } from '@/services/student-service'; // To get student Firestore ID

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

  // Initialize Push Notifications
  React.useEffect(() => {
    const setupPush = async () => {
      if (user && user.role === 'member' && user.email && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          // We need the student's Firestore ID to save the token
          const student = await getStudentByEmail(user.email);
          if (student?.firestoreId) {
            console.log("AppLayout: Attempting to initialize push notifications for member:", student.studentId);
            await initPushNotifications(student.firestoreId);
          } else if (student) {
             console.warn("AppLayout: Member found, but Firestore ID missing. Cannot init push.");
          } else {
             console.warn("AppLayout: Member record not found by email. Cannot init push.");
          }
        } catch (error) {
          console.error("AppLayout: Error during push notification setup for member:", error);
        }
      }
      // TODO: Handle push notification setup for admin users if needed.
      // This would likely involve a different way to get their user ID/document for token storage.
    };
    if (!isAuthLoading && user) {
      setupPush();
    }
  }, [user, isAuthLoading]);


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
