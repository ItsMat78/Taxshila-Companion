"use client";

import * as React from 'react';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { useToast } from '@/hooks/use-toast';
import { getMemberStudyRankings, type MemberRankEntry } from '@/services/student-service';
import { RankList } from '@/components/admin/study-rankings';
import { Button } from '@/components/ui/button';
import { Trophy, Clock, Flame, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOP_N = 7;

export default function AdminLeaderboardPage() {
  const { toast } = useToast();
  const [entries, setEntries] = React.useState<MemberRankEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await getMemberStudyRankings());
    } catch (err) {
      console.error('Failed to load study rankings:', err);
      toast({ title: 'Error', description: 'Could not load the rankings. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const topHours = React.useMemo(
    () => entries
      .filter(e => e.weeklyHours > 0)
      .sort((a, b) => b.weeklyHours - a.weeklyHours || b.currentStreak - a.currentStreak || a.name.localeCompare(b.name))
      .slice(0, TOP_N),
    [entries],
  );

  const topStreaks = React.useMemo(
    () => entries
      .filter(e => e.currentStreak > 0)
      .sort((a, b) => b.currentStreak - a.currentStreak || b.weeklyHours - a.weeklyHours || a.name.localeCompare(b.name))
      .slice(0, TOP_N),
    [entries],
  );

  return (
    <ErrorBoundary>
      <div className="mx-auto w-full max-w-5xl pb-8 font-headline text-gray-800 dark:text-gray-100">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3 pt-1">
          <span className="rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 p-2 text-amber-950 shadow-sm shadow-amber-500/40">
            <Trophy className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-white md:text-3xl">Study Leaderboard</h1>
            <p className="font-body text-xs text-gray-500 dark:text-gray-400 md:text-sm">Top members this week · tap anyone to open their profile</p>
          </div>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Two lists, side by side on desktop */}
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4 text-emerald-500" />
              Most hours this week
            </h2>
            <RankList entries={topHours} primary="hours" loading={loading} emptyText="No study time logged this week yet." />
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <Flame className="h-4 w-4 text-[#F05454]" />
              Longest active streaks
            </h2>
            <RankList entries={topStreaks} primary="streak" loading={loading} emptyText="No active streaks right now." />
          </section>
        </div>
      </div>
    </ErrorBoundary>
  );
}
