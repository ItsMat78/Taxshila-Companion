"use client";

import * as React from 'react';
import Link from 'next/link';
import { Crown, Flame, Clock, ChevronRight, Armchair } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import type { MemberRankEntry } from '@/services/student-service';

const SHIFT_LABEL: Record<string, string> = { morning: 'Morning', evening: 'Evening', fullday: 'Full Day' };

function formatHours(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  if (hh === 0 && mm === 0) return '0h';
  if (hh === 0) return `${mm}m`;
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

function rankBadgeClass(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 shadow-sm shadow-amber-500/40';
  if (rank === 2) return 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800';
  if (rank === 3) return 'bg-gradient-to-br from-orange-300 to-amber-600 text-orange-950';
  return 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400';
}

function Row({ e, rank, primary }: { e: MemberRankEntry; rank: number; primary: 'hours' | 'streak' }) {
  return (
    <li>
      <Link
        href={`/students/profiles/${e.studentId}`}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 dark:border-white/5 dark:bg-slate-900 dark:hover:bg-slate-800/70",
            rank === 1 && "bg-gradient-to-r from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900",
          )}
        >
          <div className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", rankBadgeClass(rank))}>
            {rank}
            {rank === 1 && <Crown className="absolute -top-3 left-1/2 h-4 w-4 -translate-x-1/2 text-amber-400 drop-shadow" />}
          </div>

          <Avatar className="h-11 w-11 shrink-0 border-2 border-white/70 dark:border-white/10">
            <AvatarImage src={e.profilePictureUrl || undefined} alt={e.name} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 dark:from-indigo-900 dark:to-slate-900 dark:text-indigo-300">
              {getInitials(e.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-900 dark:text-white">{e.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="font-mono">{e.studentId}</span>
              {e.seatNumber && <span className="inline-flex items-center gap-0.5"><Armchair className="h-3 w-3" />{e.seatNumber}</span>}
              {e.shift && <span>{SHIFT_LABEL[e.shift] ?? e.shift}</span>}
            </div>
          </div>

          <div className="shrink-0 text-right">
            {primary === 'hours' ? (
              <>
                <p className="text-lg font-bold leading-none tabular-nums text-emerald-600 dark:text-emerald-400 md:text-xl">{formatHours(e.weeklyHours)}</p>
                <p className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-[#F05454]"><Flame className="h-3 w-3" />{e.currentStreak}d streak</p>
              </>
            ) : (
              <>
                <p className="inline-flex items-baseline gap-1 text-lg font-bold leading-none text-[#F05454] md:text-xl">
                  <Flame className="h-4 w-4" />
                  <span className="tabular-nums">{e.currentStreak}</span>
                  <span className="text-xs font-medium text-gray-400">{e.currentStreak === 1 ? 'day' : 'days'}</span>
                </p>
                <p className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-gray-500 dark:text-gray-400"><Clock className="h-3 w-3" />{formatHours(e.weeklyHours)} this week</p>
              </>
            )}
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
        </div>
      </Link>
    </li>
  );
}

export function RankList({
  entries,
  primary,
  loading,
  emptyText,
}: {
  entries: MemberRankEntry[];
  primary: 'hours' | 'streak';
  loading?: boolean;
  emptyText?: string;
}) {
  if (loading) {
    return (
      <ul className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-[68px] animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800/60" />
        ))}
      </ul>
    );
  }

  if (!entries.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400">
        {emptyText ?? 'Nothing to show yet.'}
      </div>
    );
  }

  return (
    <ol className="space-y-2.5">
      {entries.map((e, i) => (
        <Row key={e.studentId} e={e} rank={i + 1} primary={primary} />
      ))}
    </ol>
  );
}
