"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, History, IndianRupee, Wallet, Banknote, CreditCard } from 'lucide-react';
import { getMonthlyRevenueHistory, type MonthlyRevenueData as MonthlyRevenueDataFromService } from '@/services/student-service';
import { useToast } from '@/hooks/use-toast';
import { format, parse, parseISO, compareDesc, subMonths, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "bg-white/40 dark:bg-slate-900/60 backdrop-blur-md",
    "border border-white/60 dark:border-white/5",
    "shadow-[0_4px_16px_rgb(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]",
    "rounded-xl overflow-hidden",
    className
  )}>
    {children}
  </div>
);

const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "#eab308",
  },
} satisfies ChartConfig;

type MonthlyRevenueData = {
  monthDate: Date;
  monthDisplay: string;
  revenue: number;
  // Method breakdown — present for dynamic (Firestore) data, absent for legacy static figures.
  cashRevenue?: number;
  onlineRevenue?: number;
  otherRevenue?: number;
};

const staticProvidedRevenueInput: { monthName: string; year: number; revenue: number }[] = [
  { monthName: "September", year: 2024, revenue: 13000 },
  { monthName: "October", year: 2024, revenue: 15600 },
  { monthName: "November", year: 2024, revenue: 22400 },
  { monthName: "December", year: 2024, revenue: 20650 },
  { monthName: "January", year: 2025, revenue: 20000 },
  { monthName: "February", year: 2025, revenue: 22400 },
  { monthName: "March", year: 2025, revenue: 36800 },
  { monthName: "April", year: 2025, revenue: 68600 },
  { monthName: "May", year: 2025, revenue: 47350 },
];

const staticRevenueData: MonthlyRevenueData[] = staticProvidedRevenueInput.map(item => {
  const monthDate = parse(`${item.monthName} ${item.year}`, 'MMMM yyyy', new Date());
  return { monthDate, monthDisplay: format(monthDate, 'MMMM yyyy'), revenue: item.revenue };
});

type TimeRange = '3m' | '6m' | '12m' | 'all';

export default function RevenueHistoryPage() {
  const { toast } = useToast();
  const [allRevenueHistory, setAllRevenueHistory] = React.useState<MonthlyRevenueData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [timeRange, setTimeRange] = React.useState<TimeRange>('6m');
  const [selectedMonthKey, setSelectedMonthKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const dynamicHistoryFromService: MonthlyRevenueDataFromService[] = await getMonthlyRevenueHistory();
        const dynamicHistory = dynamicHistoryFromService.map(item => ({
          ...item,
          monthDate: parseISO(item.monthDate),
        }));

        const combinedMap = new Map<string, MonthlyRevenueData>();
        dynamicHistory.forEach(item => combinedMap.set(format(item.monthDate, 'yyyy-MM'), item));
        staticRevenueData.forEach(item => combinedMap.set(format(item.monthDate, 'yyyy-MM'), item));

        setAllRevenueHistory(
          Array.from(combinedMap.values()).sort((a, b) => compareDesc(a.monthDate, b.monthDate))
        );
      } catch (error) {
        console.error("Failed to fetch revenue history:", error);
        toast({ title: "Error", description: "Could not load revenue history. Displaying static data only.", variant: "destructive" });
        setAllRevenueHistory(staticRevenueData.sort((a, b) => compareDesc(a.monthDate, b.monthDate)));
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [toast]);

  const graphData = React.useMemo(() => {
    if (isLoading) return [];
    const now = new Date();
    const endDate = endOfMonth(now);
    let startDate: Date;

    if (timeRange === 'all') {
      if (allRevenueHistory.length === 0) return [];
      startDate = allRevenueHistory.reduce(
        (earliest, item) => item.monthDate < earliest ? item.monthDate : earliest,
        new Date()
      );
    } else {
      const monthsToSubtract = { '3m': 3, '6m': 6, '12m': 12 }[timeRange];
      startDate = startOfMonth(subMonths(now, monthsToSubtract - 1));
    }

    const revenueMap = new Map<string, number>();
    allRevenueHistory.forEach(item => revenueMap.set(format(item.monthDate, 'yyyy-MM'), item.revenue));

    const chartData = [];
    let currentMonth = startDate;
    let safetyCounter = 0;
    while (currentMonth <= endDate && safetyCounter < 240) {
      chartData.push({
        month: format(currentMonth, 'MMM yy'),
        revenue: revenueMap.get(format(currentMonth, 'yyyy-MM')) || 0,
      });
      currentMonth = addMonths(currentMonth, 1);
      safetyCounter++;
    }
    return chartData;
  }, [allRevenueHistory, isLoading, timeRange]);

  const tableData = React.useMemo(
    () => [...allRevenueHistory].sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime()),
    [allRevenueHistory]
  );

  const totalRevenueAmount = React.useMemo(() => {
    if (isLoading || allRevenueHistory.length === 0) return null;
    return allRevenueHistory.reduce((sum, item) => sum + item.revenue, 0);
  }, [allRevenueHistory, isLoading]);

  // Default the breakdown month to the most recent one once data arrives.
  React.useEffect(() => {
    if (selectedMonthKey === null && tableData.length > 0) {
      setSelectedMonthKey(tableData[0].monthDisplay);
    }
  }, [tableData, selectedMonthKey]);

  const selectedMonthData = React.useMemo(
    () => tableData.find(item => item.monthDisplay === selectedMonthKey) ?? null,
    [tableData, selectedMonthKey]
  );

  // Breakdown is only available for dynamic (Firestore) data; legacy static figures lack method info.
  const selectedBreakdown = React.useMemo(() => {
    if (!selectedMonthData || selectedMonthData.cashRevenue === undefined || selectedMonthData.onlineRevenue === undefined) {
      return null;
    }
    return {
      cash: selectedMonthData.cashRevenue,
      online: selectedMonthData.onlineRevenue,
      other: selectedMonthData.otherRevenue ?? 0,
      total: selectedMonthData.revenue,
    };
  }, [selectedMonthData]);

  return (
    <div className="bg-transparent font-headline pb-12 w-full">
      <PageTitle title="Monthly Revenue History" description="Track revenue from received payments over time." />

      <div className="space-y-4 mt-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Total Summary */}
        <GlassCard className="p-5 relative group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-yellow-300 dark:bg-yellow-500 blur-[50px] opacity-15 dark:opacity-10 group-hover:opacity-25 transition-opacity duration-700 pointer-events-none rounded-full translate-x-8 -translate-y-8" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-yellow-100/80 dark:bg-yellow-900/30 shrink-0">
              <IndianRupee className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Total Recorded Revenue</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sum of all monthly documented revenues.</p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-9 w-44 animate-pulse bg-muted rounded-lg" />
          ) : totalRevenueAmount !== null ? (
            <p className="text-3xl font-semibold tracking-tight text-foreground">
              ₹{totalRevenueAmount.toLocaleString('en-IN')}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No revenue data available.</p>
          )}
        </GlassCard>

        {/* Cash vs Online Breakdown */}
        <GlassCard className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Wallet className="h-4 w-4 text-blue-500" />
                Cash vs Online
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Payment method split for the selected month.</p>
            </div>
            <Select
              value={selectedMonthKey ?? ''}
              onValueChange={setSelectedMonthKey}
              disabled={isLoading || tableData.length === 0}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs bg-white/40 dark:bg-white/5 border-white/60 dark:border-white/10 focus:ring-0">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent className="bg-white/90 dark:bg-slate-900 border-white/60 dark:border-slate-700 backdrop-blur-xl max-h-72">
                {tableData.map((item) => (
                  <SelectItem key={item.monthDisplay} value={item.monthDisplay}>
                    {item.monthDisplay}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 animate-pulse bg-muted rounded-lg" />
              <div className="h-24 animate-pulse bg-muted rounded-lg" />
            </div>
          ) : selectedBreakdown ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg p-4 bg-green-100/40 dark:bg-green-900/15 border border-green-200/50 dark:border-green-500/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Banknote className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground">Cash</span>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    ₹{selectedBreakdown.cash.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedBreakdown.total > 0
                      ? `${Math.round((selectedBreakdown.cash / selectedBreakdown.total) * 100)}% of total`
                      : '—'}
                  </p>
                </div>
                <div className="rounded-lg p-4 bg-blue-100/40 dark:bg-blue-900/15 border border-blue-200/50 dark:border-blue-500/10">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground">Online</span>
                  </div>
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    ₹{selectedBreakdown.online.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedBreakdown.total > 0
                      ? `${Math.round((selectedBreakdown.online / selectedBreakdown.total) * 100)}% of total`
                      : '—'}
                  </p>
                </div>
              </div>
              {selectedBreakdown.other > 0 && (
                <p className="text-xs text-muted-foreground">
                  Plus ₹{selectedBreakdown.other.toLocaleString('en-IN')} from other/imported methods.
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground text-center">
              {selectedMonthData
                ? 'Payment method breakdown is not available for this month.'
                : 'No revenue data available.'}
            </div>
          )}
        </GlassCard>

        {/* Revenue Graph */}
        <GlassCard className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Revenue Graph
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Monthly revenue over the selected period.</p>
            </div>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs bg-white/40 dark:bg-white/5 border-white/60 dark:border-white/10 focus:ring-0">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent className="bg-white/90 dark:bg-slate-900 border-white/60 dark:border-slate-700 backdrop-blur-xl">
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="12m">Last 12 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-[260px]">
              <Loader2 role="status" aria-label="Loading" className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : graphData.length > 0 ? (
            <ChartContainer config={revenueChartConfig} className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graphData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenueHistory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.12)" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={8} />
                  <YAxis
                    tickFormatter={(value) => `₹${(Number(value) / 1000).toLocaleString('en-IN')}k`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    width={55}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'rgba(128,128,128,0.06)' }}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#eab308"
                    strokeWidth={2}
                    fill="url(#colorRevenueHistory)"
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#ca8a04' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
              No revenue history data available for this range.
            </div>
          )}
        </GlassCard>

        {/* Revenue Table */}
        <GlassCard className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <History className="h-4 w-4 text-muted-foreground" />
              Monthly Revenue Log
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tabular view of all captured monthly aggregates.</p>
          </div>

          <div className="rounded-lg overflow-hidden border border-white/40 dark:border-white/5">
            {isLoading && tableData.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 role="status" aria-label="Loading" className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-white/40 dark:bg-white/5 border-b border-white/40 dark:border-white/5 hover:bg-transparent dark:hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Month</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((item) => (
                    <TableRow
                      key={item.monthDisplay}
                      className="border-b border-white/20 dark:border-white/5 hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
                    >
                      <TableCell className="text-sm font-medium text-foreground/80">{item.monthDisplay}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-foreground">
                        ₹ {item.revenue.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {tableData.length === 0 && !isLoading && (
                    <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                      <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-8 border-none">
                        No revenue data found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
