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

// --- THEME COLORS CONFIGURATION ---
const themeColors: Record<string, string> = {
    'light-default': '#D6D5D8',
    'light-mint': '#E2F1EB', 
    'light-sunrise': '#FEF4E7', 
    'light-sakura': '#FAEAF0', 
    'dark-default': '#000000', 
    'dark-midnight': '#141822', 
    'dark-forest': '#121912', 
    'dark-rose': '#1C1519', 
};

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
  const { theme, setTheme, resolvedTheme } = useTheme(); // Added resolvedTheme for system mode support

  React.useEffect(() => {
    const isPublicPath = pathname.startsWith('/login');
    if (!isAuthLoading && !user && !isPublicPath) {
      router.replace('/login');
    }
  }, [user, isAuthLoading, pathname, router]);

  React.useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setIsRouteLoading(true);
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
  
  // --- 1. STATUS BAR COLOR LOGIC (Median Native) ---
  React.useEffect(() => {
    // Determine the safe "Fallback" theme (guaranteed string)
    const fallbackTheme = resolvedTheme === 'dark' ? 'dark-default' : 'light-default';

    // Check if the current 'theme' is valid and exists in our colors map
    const activeTheme = (theme && themeColors[theme]) ? theme : fallbackTheme;
    const color = themeColors[activeTheme];

    if (color) {
        // A. Update Browser Meta Tag
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', color);
        }

        // B. Update Median Native Status Bar
        const median = (window as any).median;
        if (median?.statusbar) {
            median.statusbar.setBackgroundColor({ color: color });
            
            // Contrast Logic: Dark themes need Light text (White)
            const isDark = activeTheme.startsWith('dark');
            median.statusbar.setStyle({ style: isDark ? 'light' : 'dark' });
        }
    }
  }, [theme, resolvedTheme]); // Re-run when theme changes

  // --- 2. ROBUST NOTIFICATION SETUP ---
  React.useEffect(() => {
    if (user && user.firestoreId && user.role) {
      
      // A. Firebase Web Push (Keep existing logic)
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          setupPushNotifications(user.firestoreId, user.role);
      }
      
      // B. Median / OneSignal Native Push Logic
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
              const subscriptionId = data.subscription?.id;
              
              // Fallback to legacy ID if the new structure isn't present
              const legacyId = data.oneSignalId || data.oneSignalUserId; 

              // Prioritize Subscription ID
              const targetId = subscriptionId || legacyId;

              if (targetId) {
                  // Make the key unique to the CURRENT user to avoid "second user" bugs
                  const storageKey = `oneSignalPlayerId_${user.firestoreId}`;
                  const savedPlayerId = localStorage.getItem(storageKey);

                  if (savedPlayerId !== targetId) {
                      console.log(`[AppLayout] Saving ID for ${user.role}: ${targetId}`);
                      await saveOneSignalPlayerId(user.firestoreId, user.role, targetId);
                      
                      // Save using the unique key
                      localStorage.setItem(storageKey, targetId);
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
          {/* Header with Safe Area padding for Overlay Mode */}
          <header className="sticky top-0 z-10 flex min-h-14 items-center gap-4 border-b bg-background/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-sm sm:min-h-16 sm:px-6 md:hidden">
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