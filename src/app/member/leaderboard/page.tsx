"use client";

import * as React from 'react';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { getStudyLeaderboard, type LeaderboardEntry } from '@/services/student-service';
import { StudyLeaderboard } from '@/components/shared/study-leaderboard';
import { Button } from '@/components/ui/button';
import { Trophy, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MemberLeaderboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [top, setTop] = React.useState<LeaderboardEntry[]>([]);
  const [me, setMe] = React.useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStudyLeaderboard({ limit: 7, currentStudentId: user?.studentId });
      setTop(result.top);
      setMe(result.me);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      toast({ title: 'Error', description: 'Could not load the leaderboard. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.studentId, toast]);

  React.useEffect(() => { load(); }, [load]);

  const meInTop = me ? top.some(e => e.studentId === me.studentId) : false;

  return (
    <ErrorBoundary>
      <div className="mx-auto w-full max-w-2xl pb-8 font-headline text-gray-800 dark:text-gray-100">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3 pt-1">
          <span className="rounded-xl bg-gradient-to-br from-amber-300 to-yellow-500 p-2 text-amber-950 shadow-sm shadow-amber-500/40">
            <Trophy className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-light tracking-tight text-gray-900 dark:text-white md:text-3xl">Leaderboard</h1>
            <p className="font-body text-xs text-gray-500 dark:text-gray-400 md:text-sm">Top 7 by study hours this week · resets Sunday</p>
          </div>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading} aria-label="Refresh leaderboard">
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>
        </div>

        <StudyLeaderboard entries={top} loading={loading} currentStudentId={user?.studentId} />

        {/* Your own position, when you're not in the top 7 */}
        {!loading && me && !meInTop && (
          <div className="mt-5">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Your position</p>
            <StudyLeaderboard entries={[me]} currentStudentId={user?.studentId} />
          </div>
        )}

        {/* Studied nothing this week */}
        {!loading && !me && top.length > 0 && (
          <p className="mt-5 rounded-lg bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
            You haven&apos;t logged study time this week yet — check in to climb the board!
          </p>
        )}
      </div>
    </ErrorBoundary>
  );
}
