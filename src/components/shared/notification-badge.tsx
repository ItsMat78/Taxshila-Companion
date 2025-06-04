
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  icon: LucideIcon;
  count: number;
  iconClassName?: string;
  badgeClassName?: string;
}

export function NotificationBadge({ 
  icon: Icon, 
  count, 
  iconClassName = "h-5 w-5", // Default icon size
  badgeClassName 
}: NotificationBadgeProps) {
  const displayCount = count > 9 ? '9+' : String(count);

  if (count === 0) {
    return <Icon className={iconClassName} />;
  }

  return (
    <div className="relative">
      <Icon className={iconClassName} />
      {count > 0 && (
        <span
          className={cn(
            "absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-1 ring-background",
            badgeClassName
          )}
        >
          {displayCount}
        </span>
      )}
    </div>
  );
}
