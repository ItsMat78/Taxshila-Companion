"use client";

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle as ShadcnCardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DashboardTileProps = {
  title: string;
  description?: string;
  statistic?: string | number | null;
  isLoadingStatistic?: boolean;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  className?: string;
  isPrimaryAction?: boolean;
  external?: boolean;
  hasNew?: boolean;
  isUrgent?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
};

export const DashboardTile: React.FC<DashboardTileProps> = React.memo(({
  title,
  description,
  statistic,
  isLoadingStatistic,
  icon: Icon,
  href,
  action,
  className = "",
  isPrimaryAction = false,
  external = false,
  hasNew = false,
  isUrgent = false,
  disabled = false,
  children
}) => {
  const content = (
    <Card className={cn(
      "shadow-sm h-full flex flex-col transition-all rounded-md",
      isPrimaryAction
        ? 'bg-gradient-to-br from-primary to-primary/80 dark:from-indigo-500 dark:to-violet-600 text-white border-transparent'
        : 'bg-white/40 dark:bg-black/30 backdrop-blur-xl border-white/60 dark:border-white/10 text-gray-800 dark:text-gray-200',
      !disabled && "hover:shadow-md active:scale-[0.98]",
      disabled ? 'opacity-50 cursor-not-allowed bg-black/10 dark:bg-white/5' : (!isPrimaryAction && 'hover:bg-white/50 dark:hover:bg-black/50'),
      className
    )}>
      <CardHeader className={cn(
        "relative",
        isPrimaryAction ? "p-3 pb-1" : "p-3 pb-1"
      )}>
        {(hasNew || isUrgent) && (
          <span className={cn(
            "absolute top-1 right-1 block h-2.5 w-2.5 rounded-full ring-1 ring-white",
             isUrgent ? 'bg-destructive' : 'bg-primary'
          )} />
        )}
        <div className={cn(
          "flex items-center gap-2",
           isPrimaryAction ? "" : "flex-col text-center"
        )}>
          <Icon className={cn(
            isPrimaryAction ? "h-5 w-5" : "h-5 w-5 mb-0.5",
            isPrimaryAction && isLoadingStatistic && "animate-spin"
          )} />
          <ShadcnCardTitle className={cn(
            "break-words",
            isPrimaryAction ? 'text-base font-bold text-white' : 'text-sm font-semibold',
          )}>
            {title}
          </ShadcnCardTitle>
        </div>
      </CardHeader>
      <CardContent className={cn(
        "flex-grow flex flex-col items-center justify-center",
        isPrimaryAction ? "p-3 pt-1" : "p-3 pt-1"
      )}>
        {isLoadingStatistic && !isPrimaryAction ? (
          <Loader2 role="status" aria-label="Loading" className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary my-2" />
        ) : statistic !== null && statistic !== undefined ? (
          <>
            <div className={cn(
              "font-bold break-words",
               isPrimaryAction ? 'text-xl text-white' : 'text-lg text-foreground',
              isUrgent && !isPrimaryAction && 'text-destructive'
            )}>
              {statistic}
            </div>
            {description && <p className={cn(
              "text-xs mt-0.5 break-words",
              isPrimaryAction ? 'text-white/80' : 'text-muted-foreground text-center',
            )}>{description}</p>}
          </>
        ) : children ? (
          <div className="w-full">{children}</div>
        ) : (
          description && <p className={cn(
            "break-words text-center",
            isPrimaryAction ? 'text-xs text-white/80' : 'text-xs text-muted-foreground',
          )}>{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const linkClasses = "block h-full no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md";

  if (href && !disabled) {
    return (
      <Link
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={cn(linkClasses, className)}
        onClick={(e) => { if (disabled) e.preventDefault(); }}
      >
        {content}
      </Link>
    );
  }

  if (action && !disabled) {
    return <button onClick={action} className={cn("block w-full h-full text-left rounded-md", linkClasses, className)} disabled={disabled}>{content}</button>;
  }

  return <div className={cn(className, disabled ? 'cursor-not-allowed' : '')}>{content}</div>;
});
DashboardTile.displayName = 'DashboardTile';
