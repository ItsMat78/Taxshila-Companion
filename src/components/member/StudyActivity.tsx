"use client";

import * as React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  Bar, BarChart, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  format, startOfWeek, subWeeks, addWeeks, addDays, startOfDay,
  isAfter, isSameDay, getMonth, subDays,
} from 'date-fns';
import { Activity, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKS = 18;          // ~4 months of history in the contribution heatmap
const RECENT_DAYS = 14;    // days shown in the bar chart

// Emerald intensity ramp, light + dark, indexed by study-time bucket.
const CELL_COLORS = [
  'bg-slate-200/70 dark:bg-white/[0.06]',   // 0 — no study
  'bg-emerald-200 dark:bg-emerald-900',     // 1 — a little
  'bg-emerald-300 dark:bg-emerald-700',     // 2
  'bg-emerald-500 dark:bg-emerald-600',     // 3
  'bg-emerald-600 dark:bg-emerald-400',     // 4 — a lot
];

/** Bucket daily hours into 0–4 for the heatmap colour ramp. */
function levelFor(hours: number): number {
  if (hours <= 0) return 0;
  if (hours < 2) return 1;
  if (hours < 4) return 2;
  if (hours < 6) return 3;
  return 4;
}

function hoursLabel(hours: number): string {
  if (hours <= 0) return 'No study';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m studied`;
  return m > 0 ? `${h}h ${m}m studied` : `${h}h studied`;
}

type DailyDatum = { date: string; hours: number };

export function StudyActivity({ daily, loading }: { daily?: DailyDatum[]; loading?: boolean }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Fast lookup of hours by 'yyyy-MM-dd'.
  const byDate = React.useMemo(() => {
    const m = new Map<string, number>();
    (daily ?? []).forEach(d => m.set(d.date, d.hours));
    return m;
  }, [daily]);

  // Build the heatmap as columns of weeks (Sun–Sat), oldest → newest.
  const { weeks, totalHours, activeDays } = React.useMemo(() => {
    const today = startOfDay(new Date());
    const gridStart = startOfWeek(subWeeks(today, WEEKS - 1), { weekStartsOn: 0 });
    const cols: Array<Array<{ date: Date; key: string; hours: number; future: boolean }>> = [];
    let total = 0;
    let active = 0;
    for (let w = 0; w < WEEKS; w++) {
      const colStart = addWeeks(gridStart, w);
      const col: Array<{ date: Date; key: string; hours: number; future: boolean }> = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(colStart, d);
        const key = format(date, 'yyyy-MM-dd');
        const hours = byDate.get(key) ?? 0;
        const future = isAfter(date, today);
        if (!future && hours > 0) { total += hours; active++; }
        col.push({ date, key, hours, future });
      }
      cols.push(col);
    }
    return { weeks: cols, totalHours: total, activeDays: active };
  }, [byDate]);

  // Recent-days bar chart data.
  const recent = React.useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: RECENT_DAYS }, (_, i) => {
      const date = subDays(today, RECENT_DAYS - 1 - i);
      const key = format(date, 'yyyy-MM-dd');
      return { key, label: format(date, 'EEEEE'), full: format(date, 'EEE, d MMM'), hours: +(byDate.get(key) ?? 0).toFixed(2) };
    });
  }, [byDate]);

  const today = startOfDay(new Date());

  if (loading) {
    return (
      <div className="rounded-lg border border-white/60 bg-white/40 p-4 backdrop-blur-md dark:border-white/5 dark:bg-slate-900/60 md:p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded bg-gray-200/70 dark:bg-white/10" />
          <div className="h-24 w-full rounded bg-gray-200/70 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/60 bg-white/40 p-4 shadow-[0_4px_16px_rgb(0,0,0,0.04)] backdrop-blur-md dark:border-white/5 dark:bg-slate-900/60 dark:shadow-xl md:p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/member/attendance"
            aria-label="View attendance"
            title="View attendance"
            className="inline-flex items-center justify-center rounded-lg border border-emerald-200/80 bg-emerald-100 p-1.5 text-emerald-600 shadow-sm transition-all hover:bg-emerald-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 dark:border-emerald-500/20 dark:bg-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-800/60"
          >
            <Activity className="h-4 w-4" />
          </Link>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white md:text-lg">Study activity</h2>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
          <Flame className="h-3.5 w-3.5 text-[#F05454]" />
          {activeDays} active {activeDays === 1 ? 'day' : 'days'}
        </span>
      </div>

      {/* Contribution heatmap */}
      <div className="overflow-hidden">
        {/* Month labels */}
        <div className="mb-1 flex gap-[3px]">
          {weeks.map((col, wi) => {
            const showMonth = wi === 0
              ? getMonth(col[0].date) !== getMonth(subDays(col[0].date, 7))
              : getMonth(col[0].date) !== getMonth(weeks[wi - 1][0].date);
            return (
              <div key={wi} className="min-w-0 flex-1 whitespace-nowrap text-[8px] leading-none text-gray-400 dark:text-gray-500 md:text-[9px]">
                {showMonth ? format(col[0].date, 'MMM') : ''}
              </div>
            );
          })}
        </div>
        {/* Cells */}
        <div className="flex gap-[3px]">
          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-1 flex-col gap-[3px]">
              {col.map(cell => (
                <div
                  key={cell.key}
                  title={cell.future ? undefined : `${hoursLabel(cell.hours)} · ${format(cell.date, 'EEE, d MMM')}`}
                  className={cn(
                    'aspect-square w-full rounded-[2px] transition-colors',
                    cell.future ? 'opacity-0' : CELL_COLORS[levelFor(cell.hours)],
                    !cell.future && isSameDay(cell.date, today) && 'ring-1 ring-emerald-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900',
                  )}
                />
              ))}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
          <span>Less</span>
          {CELL_COLORS.map((c, i) => (
            <span key={i} className={cn('h-2.5 w-2.5 rounded-[2px]', c)} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Recent-days bar chart */}
      <div className="mt-4 border-t border-black/5 pt-3 dark:border-white/5">
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Last {RECENT_DAYS} days</p>
        <ResponsiveContainer width="100%" height={96}>
          <BarChart data={recent} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="22%">
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#9ca3af' }} />
            <RechartsTooltip
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }}
              contentStyle={{
                borderRadius: 8,
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.6)',
                backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.92)',
                boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.08)',
                backdropFilter: 'blur(8px)', padding: '4px 8px', fontSize: 12,
              }}
              labelStyle={{ color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: 600 }}
              itemStyle={{ color: isDark ? '#e2e8f0' : '#334155' }}
              labelFormatter={(_, p) => (p && p[0] ? p[0].payload.full : '')}
              formatter={(v: number) => [hoursLabel(v), 'Studied']}
            />
            <Bar dataKey="hours" radius={[3, 3, 0, 0]} maxBarSize={26}>
              {recent.map(d => (
                <Cell key={d.key} fill={d.hours > 0 ? '#10b981' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
