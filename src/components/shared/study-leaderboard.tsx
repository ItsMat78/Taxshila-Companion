"use client";

import * as React from 'react';
import Link from 'next/link';
import { Crown, Flame, ChevronRight, Armchair } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PrivateAvatar } from '@/components/shared/private-avatar';
import { cn, getInitials } from '@/lib/utils';
import type { LeaderboardEntry } from '@/services/student-service';

const SHIFT_LABEL: Record<string, string> = { morning: 'Morning', evening: 'Evening', fullday: 'Full Day' };

export function formatHours(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  if (hh === 0 && mm === 0) return '0h';
  if (hh === 0) return `${mm}m`;
  return mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
}

// Medal treatment for the top three; muted for the rest.
function rankBadgeClass(rank: number): string {
  if (rank === 1) return 'bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950 shadow-sm shadow-amber-500/40';
  if (rank === 2) return 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800';
  if (rank === 3) return 'bg-gradient-to-br from-orange-300 to-amber-600 text-orange-950';
  return 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400';
}

function Row({ e, isAdmin, isMe }: { e: LeaderboardEntry; isAdmin?: boolean; isMe?: boolean }) {
  const card = (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-xl border p-3 transition-colors md:gap-4",
        "border-white/60 bg-white/50 backdrop-blur-md dark:border-white/5 dark:bg-slate-900/60",
        e.rank === 1 && "bg-gradient-to-r from-amber-50 to-white/50 dark:from-amber-500/10 dark:to-slate-900/60",
        isMe && "ring-2 ring-emerald-500/60",
        isAdmin && "hover:bg-white/75 dark:hover:bg-slate-800/60",
      )}
    >
      {/* Rank medal */}
      <div className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", rankBadgeClass(e.rank))}>
        {e.rank}
        {e.rank === 1 && <Crown className="absolute -top-3 left-1/2 h-4 w-4 -translate-x-1/2 text-amber-400 drop-shadow" />}
      </div>

      {/* Photo */}
      {isAdmin ? (
        <Avatar className="h-11 w-11 shrink-0 border-2 border-white/70 dark:border-white/10">
          <AvatarImage src={e.profilePictureUrl || undefined} alt={e.name} />
          <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 dark:from-indigo-900 dark:to-slate-900 dark:text-indigo-300">
            {getInitials(e.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <PrivateAvatar src={e.profilePictureUrl} name={e.name} className="h-11 w-11 border-2 border-white/70 text-base dark:border-white/10" />
      )}

      {/* Name + (admin-only) meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900 dark:text-white">
          {e.name}
          {isMe && <span className="ml-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">You</span>}
        </p>
        {isAdmin && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="font-mono">{e.studentId}</span>
            {e.seatNumber && (
              <span className="inline-flex items-center gap-0.5"><Armchair className="h-3 w-3" />{e.seatNumber}</span>
            )}
            {e.shift && <span>{SHIFT_LABEL[e.shift] ?? e.shift}</span>}
            <span className="inline-flex items-center gap-0.5 text-[#F05454]"><Flame className="h-3 w-3" />{e.currentStreak}d</span>
          </div>
        )}
      </div>

      {/* Score */}
      <div className="shrink-0 text-right">
        <p className="text-lg font-bold leading-none text-emerald-600 tabular-nums dark:text-emerald-400 md:text-xl">{formatHours(e.weeklyHours)}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">this week</p>
      </div>

      {isAdmin && <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />}
    </div>
  );

  if (isAdmin) {
    return (
      <li>
        <Link
          href={`/students/profiles/${e.studentId}`}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {card}
        </Link>
      </li>
    );
  }
  return <li>{card}</li>;
}

export function StudyLeaderboard({
  entries,
  loading,
  isAdmin,
  currentStudentId,
}: {
  entries: LeaderboardEntry[];
  loading?: boolean;
  isAdmin?: boolean;
  currentStudentId?: string;
}) {
  if (loading) {
    return (
      <ul className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-[68px] animate-pulse rounded-xl bg-gray-200/70 dark:bg-slate-800/60" />
        ))}
      </ul>
    );
  }

  if (!entries.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
        <Flame className="mx-auto mb-2 h-7 w-7 text-gray-300 dark:text-gray-600" />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No study time logged this week yet.</p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Be the first to make the board!</p>
      </div>
    );
  }

  return (
    <ol className="space-y-2.5">
      {entries.map(e => (
        <Row key={e.studentId} e={e} isAdmin={isAdmin} isMe={e.studentId === currentStudentId} />
      ))}
    </ol>
  );
}
