"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { setupPushNotifications } from '@/lib/notification-setup';
import { isMedianApp } from '@/lib/onesignal-median';
import { cn } from '@/lib/utils';

type PermissionState = NotificationPermission | 'unsupported';

/**
 * Explicit, user-gesture opt-in for browser/PWA web push.
 *
 * Renders nothing when there's nothing to do: not logged in, already granted,
 * unsupported, or running inside the Median native app (which manages push via
 * OneSignal). Shows a button while permission is still 'default', and a compact
 * hint when the user has blocked notifications.
 */
export function EnableNotificationsButton({ className }: { className?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [permission, setPermission] = React.useState<PermissionState | null>(null);
  const [isNativeApp, setIsNativeApp] = React.useState(false);
  const [isWorking, setIsWorking] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsNativeApp(isMedianApp());
    setPermission('Notification' in window ? Notification.permission : 'unsupported');
  }, []);

  const handleEnable = async () => {
    if (!user?.firestoreId || !user.role) return;
    setIsWorking(true);
    try {
      await setupPushNotifications(user.firestoreId, user.role);
      const result: PermissionState = 'Notification' in window ? Notification.permission : 'unsupported';
      setPermission(result);

      if (result === 'granted') {
        toast({ title: "Notifications enabled", description: "You'll now receive push alerts on this device." });
      } else if (result === 'denied') {
        toast({ title: "Notifications blocked", description: "You denied permission. Re-enable it in your browser/site settings.", variant: "destructive" });
      } else {
        toast({ title: "Not enabled", description: "Permission wasn't granted. You can try again anytime.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Couldn't enable notifications", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  // Nothing to show: native app, still detecting, not logged in, unsupported, or already on.
  if (isNativeApp) return null;
  if (permission === null || permission === 'unsupported' || permission === 'granted') return null;
  if (!user?.firestoreId || !user.role) return null;

  if (permission === 'denied') {
    return (
      <span
        className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}
        title="Notifications are blocked. Re-enable them in your browser or site settings to receive alerts."
      >
        <BellOff className="h-3.5 w-3.5" />
        Notifications blocked
      </span>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleEnable} disabled={isWorking} className={className}>
      {isWorking ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
      {isWorking ? "Enabling…" : "Enable notifications"}
    </Button>
  );
}
