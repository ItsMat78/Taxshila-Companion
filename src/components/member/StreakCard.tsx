"use client";

import * as React from 'react';
import Link from 'next/link';
import { Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

// The streak warms up as it grows — the accents (flame, number, glow) get hotter
// and the copy louder, but the card stays a calm glass tile like its siblings.
type Tier = {
  label: string;
  flame: string; // flame icon + label colour
  num: string;   // number gradient stops
  glow: string;  // soft glow blob
  ring: string;  // border tint
  screaming: boolean;
};

function streakTier(s: number): Tier {
  if (s <= 0) return {
    label: 'Start your streak',
    flame: 'text-slate-400 dark:text-slate-500',
    num: 'from-gray-400 to-gray-500',
    glow: 'bg-slate-400/10',
    ring: 'border-white/60 dark:border-white/5',
    screaming: false,
  };
  if (s < 3) return {
    label: 'Keep it going!',
    flame: 'text-amber-500 dark:text-amber-400',
    num: 'from-amber-400 to-orange-500',
    glow: 'bg-amber-500/15',
    ring: 'border-amber-200/70 dark:border-amber-500/15',
    screaming: true,
  };
  if (s < 7) return {
    label: "You're on a roll!",
    flame: 'text-orange-500 dark:text-orange-400',
    num: 'from-amber-500 to-orange-600',
    glow: 'bg-orange-500/15',
    ring: 'border-orange-200/70 dark:border-orange-500/15',
    screaming: true,
  };
  if (s < 14) return {
    label: 'On fire!',
    flame: 'text-red-500 dark:text-red-400',
    num: 'from-orange-500 to-red-500',
    glow: 'bg-red-500/15',
    ring: 'border-orange-200/70 dark:border-red-500/15',
    screaming: true,
  };
  if (s < 30) return {
    label: 'Blazing hot!',
    flame: 'text-rose-500 dark:text-rose-400',
    num: 'from-orange-500 to-rose-500',
    glow: 'bg-rose-500/15',
    ring: 'border-rose-200/70 dark:border-rose-500/15',
    screaming: true,
  };
  return {
    label: 'Unstoppable!',
    flame: 'text-fuchsia-500 dark:text-fuchsia-400',
    num: 'from-rose-500 to-fuchsia-500',
    glow: 'bg-fuchsia-500/15',
    ring: 'border-fuchsia-200/70 dark:border-fuchsia-500/15',
    screaming: true,
  };
}

export function StreakCard({ streak, loading }: { streak?: number; loading?: boolean }) {
  if (loading || streak === undefined) {
    return <div className="h-full min-h-[112px] animate-pulse rounded-lg bg-gray-200/70 dark:bg-slate-800/60 md:min-h-[128px]" />;
  }

  const tier = streakTier(streak);

  return (
    <div
      className={cn(
        "relative flex h-full min-h-[112px] flex-col justify-between overflow-hidden rounded-lg border bg-white/40 p-4 shadow-[0_4px_16px_rgb(0,0,0,0.04)] backdrop-blur-md dark:bg-slate-900/60 dark:shadow-xl md:min-h-[128px] md:p-5",
        tier.ring,
      )}
    >
      {/* Gentle warm glow — the only ambient flair */}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full blur-2xl",
          tier.glow,
          tier.screaming && "motion-safe:animate-streak-glow",
        )}
      />

      {/* Header: leaderboard button (the only tap target) + flame */}
      <div className="relative mb-2 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/member/leaderboard"
            aria-label="See leaderboard"
            title="See leaderboard"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-100 text-amber-700 shadow-sm transition-all hover:bg-amber-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
          >
            <Trophy className="h-4 w-4" />
          </Link>
          <span className="truncate text-xs font-medium text-gray-500 dark:text-gray-400 md:text-sm">Day streak</span>
        </div>
        <Flame className={cn("h-5 w-5 shrink-0", tier.flame, tier.screaming && "motion-safe:animate-flame-flicker")} />
      </div>

      {/* Count + escalating label */}
      <div className="relative">
        <div className="flex items-end gap-1.5">
          <span
            key={streak}
            className={cn(
              "bg-gradient-to-br bg-clip-text text-3xl font-semibold leading-none tracking-tight text-transparent motion-safe:animate-streak-pop md:text-4xl",
              tier.num,
            )}
          >
            {streak}
          </span>
          <span className="mb-0.5 text-xs font-medium text-gray-400 dark:text-gray-500">{streak === 1 ? 'day' : 'days'}</span>
        </div>
        <p className={cn("mt-1.5 truncate text-[11px] font-semibold md:text-xs", tier.flame)}>{tier.label}</p>
      </div>
    </div>
  );
}
