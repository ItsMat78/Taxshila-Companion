"use client";

import * as React from 'react';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { useToast } from '@/hooks/use-toast';
import { getStudyLeaderboard, type LeaderboardEntry } from '@/services/student-service';
import { StudyLeaderboard } from '@/components/shared/study-leaderboard';
import { Button } from '@/components/ui/button';
import { Trophy, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLeaderboardPage() {
  const { toast } = useToast();
  const [entries, setEntries] = React.useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStudyLeaderboard({ limit: 7 });
      setEntries(result.top);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      toast({ title: 'Error', description: 'Could not load the leaderboard. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <ErrorBoundary>
      <div className="mx-auto w-full max-w-2xl pb-8 font-headline text-gray-800 dark:text-gray-100">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3 pt-1">
          <span className="rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 p-2 text-amber-950 shadow-sm shadow-amber-500/40">
            <Trophy className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-white md:text-3xl">Study Leaderboard</h1>
            <p className="font-body text-xs text-gray-500 dark:text-gray-400 md:text-sm">Top 7 performers by study hours this week · tap a student for their profile</p>
          </div>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading} aria-label="Refresh leaderboard">
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>
        </div>

        <StudyLeaderboard entries={entries} loading={loading} isAdmin />
      </div>
    </ErrorBoundary>
  );
}
