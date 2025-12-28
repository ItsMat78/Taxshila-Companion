
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
import { saveOneSignalPlayerId } from '@/services/student-service';

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

  const publicPaths = ['/home', '/privacy_policy'];
  const isPublicPath = publicPaths.includes(pathname);

  React.useEffect(() => {
    if (!isAuthLoading && !user && !isPublicPath && pathname !== '/') {
      router.replace('/');
    }
  }, [user, isAuthLoading, pathname, router, isPublicPath]);

  React.useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setIsRouteLoading(true);
      const timer = setTimeout(() => {
        setIsRouteLoading(false);
      }, 250);
      prevPathnameRef.current = pathname;
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  React.useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setTheme(user.theme);
    }
  }, [user, theme, setTheme]);
  
  // --- Robust Notification Setup ---
  React.useEffect(() => {
    if (user && user.firestoreId && user.role) {
      
      // 1. Firebase Web Push (Keep existing logic)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          // console.log("[AppLayout] Web Push Setup..."); 
          setupPushNotifications(user.firestoreId, user.role);
      }
      
      // 2. Median / OneSignal Native Push Logic
      const registerOneSignalPlayerId = async () => {
        const checkInterval = 2000; 
        const maxDuration = 30000;
        let elapsedTime = 0;

        const intervalId = setInterval(async () => {
          elapsedTime += checkInterval;
          const median = (window as any).median;

          // CHECK: Look for the specific 'info' function
          if (median?.onesignal?.info) {
            try {
              const data = await median.onesignal.info();
              
              // --- THE FIX: Access the nested 'subscription.id' ---
              // The JSON shows data.subscription.id is the correct path for the Device ID
              const subscriptionId = data.subscription?.id;
              
              // Fallback to legacy ID if the new structure isn't present
              const legacyId = data.oneSignalId || data.oneSignalUserId; 

              // Prioritize Subscription ID
              const targetId = subscriptionId || legacyId;

              if (targetId) {
                  const savedPlayerId = localStorage.getItem('oneSignalPlayerId');

                  // Inside registerOneSignalPlayerId...

if (targetId) {
  // 🔴 OLD: const savedPlayerId = localStorage.getItem('oneSignalPlayerId');
  
  // 🟢 NEW: Make the key unique to the CURRENT user
  const storageKey = `oneSignalPlayerId_${user.firestoreId}`;
  const savedPlayerId = localStorage.getItem(storageKey);

  if (savedPlayerId !== targetId) {
      console.log(`[AppLayout] Saving ID for ${user.role}: ${targetId}`);
      await saveOneSignalPlayerId(user.firestoreId, user.role, targetId);
      
      // Save using the unique key
      localStorage.setItem(storageKey, targetId);
  }
  } else {
                      console.log("[AppLayout] ID already up to date in localStorage.");
                  }

                  clearInterval(intervalId); // Success
              }
            } catch (err) {
               console.error("[AppLayout] Error calling median.onesignal.info():", err);
            }
          } 
          
          if (elapsedTime >= maxDuration) {
              clearInterval(intervalId);
          }
        }, checkInterval);

        return () => clearInterval(intervalId);
      };

      registerOneSignalPlayerId();
    }
  }, [user]);


  if (isAuthLoading && !isPublicPath) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-[250px] mt-4" />
        <Skeleton className="h-4 w-[200px] mt-2" />
      </div>
    );
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

  // If not authenticated and not a public path, show the login page (which is at the root)
  if (!user && pathname === '/') {
    return (
       <>
        <TopProgressBar isLoading={isRouteLoading} />
        {children}
      </>
    );
  }

  // Fallback for edge cases, might show a brief blank screen before redirect.
  return null;
}
