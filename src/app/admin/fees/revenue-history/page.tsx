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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, TrendingUp, History, IndianRupee } from 'lucide-react';
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

// Bring in the GlassCard from dashboard for consistency
const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const revenueChartConfig = {
  revenue: {
    label: "Revenue (Rs.)",
    color: "#eab308", // Matching yellow theme from the dashboard revenue card
  },
} satisfies ChartConfig;

type MonthlyRevenueData = {
  monthDate: Date;
  monthDisplay: string;
  revenue: number;
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
  return {
    monthDate: monthDate,
    monthDisplay: format(monthDate, 'MMMM yyyy'),
    revenue: item.revenue,
  };
});

type TimeRange = '3m' | '6m' | '12m' | 'all';

export default function RevenueHistoryPage() {
  const { toast } = useToast();
  const [allRevenueHistory, setAllRevenueHistory] = React.useState<MonthlyRevenueData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [timeRange, setTimeRange] = React.useState<TimeRange>('6m');

  React.useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const dynamicHistoryFromService: MonthlyRevenueDataFromService[] = await getMonthlyRevenueHistory();
        const dynamicHistory = dynamicHistoryFromService.map(item => ({
            ...item,
            monthDate: parseISO(item.monthDate)
        }));
        
        const combinedMap = new Map<string, MonthlyRevenueData>();
        
        dynamicHistory.forEach(item => {
          const monthKey = format(item.monthDate, 'yyyy-MM');
          combinedMap.set(monthKey, item);
        });
        staticRevenueData.forEach(item => {
          const monthKey = format(item.monthDate, 'yyyy-MM');
          combinedMap.set(monthKey, item); 
        });
        
        const combinedList = Array.from(combinedMap.values())
          .sort((a, b) => compareDesc(a.monthDate, b.monthDate)); 

        setAllRevenueHistory(combinedList);

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
    let startDate;
    const endDate = endOfMonth(now);

    if (timeRange === 'all') {
        if (allRevenueHistory.length === 0) return [];
        startDate = allRevenueHistory.reduce((earliest, item) => item.monthDate < earliest ? item.monthDate : earliest, new Date());
    } else {
        const monthsToSubtract = { '3m': 3, '6m': 6, '12m': 12 }[timeRange];
        startDate = startOfMonth(subMonths(now, monthsToSubtract - 1));
    }

    const revenueMap = new Map<string, number>();
    allRevenueHistory.forEach(item => {
        const monthKey = format(item.monthDate, 'yyyy-MM');
        revenueMap.set(monthKey, item.revenue);
    });

    const chartData = [];
    let currentMonth = startDate;
    let safetyCounter = 0; 
    while (currentMonth <= endDate && safetyCounter < 240) { 
        const monthKey = format(currentMonth, 'yyyy-MM');
        chartData.push({
            month: format(currentMonth, 'MMM yy'),
            revenue: revenueMap.get(monthKey) || 0,
        });
        currentMonth = addMonths(currentMonth, 1);
        safetyCounter++;
    }
    
    return chartData;
  }, [allRevenueHistory, isLoading, timeRange]);

  const tableData = React.useMemo(() => {
    return [...allRevenueHistory].sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime());
  }, [allRevenueHistory]);

  const totalRevenueAmount = React.useMemo(() => {
    if (isLoading || allRevenueHistory.length === 0) {
      return null;
    }
    return allRevenueHistory.reduce((sum, item) => sum + item.revenue, 0);
  }, [allRevenueHistory, isLoading]);


  return (
    <div className="bg-transparent font-headline pb-12 w-full relative">
      <PageTitle title="Monthly Revenue History" description="Track revenue from received payments over time." />

      <div className="space-y-6 mt-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Total Summary Block */}
        <GlassCard className="p-6 relative group border-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-300 blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none rounded-full transform translate-x-10 -translate-y-10"></div>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-gray-500 font-medium">
                <IndianRupee className="h-5 w-5 text-yellow-600" /> Total Recorded Revenue
              </div>
              <p className="text-sm font-body text-gray-400 mb-4">Sum of all monthly documented revenues in the ledger.</p>
            </div>
          </div>
          
          <div className="mt-2">
            {isLoading ? (
              <div className="h-10 w-48 animate-pulse bg-gray-200/50 rounded-lg"></div>
            ) : totalRevenueAmount !== null ? (
              <p className="text-5xl font-light tracking-tight text-gray-800">
                ₹{totalRevenueAmount.toLocaleString('en-IN')}
              </p>
            ) : (
              <p className="text-muted-foreground">No revenue data available.</p>
            )}
          </div>
        </GlassCard>

        {/* Graph Area */}
        <GlassCard className="p-6 shadow-[0_12px_40px_rgba(234,179,8,0.05)] border-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-lg font-medium flex items-center gap-2 text-gray-800">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Revenue Graph
              </h2>
              <p className="text-sm text-gray-500 font-body">Visual comparison of monthly revenue collections.</p>
            </div>
            <div className="bg-white/40 backdrop-blur-md rounded-xl p-1 border border-white/50 shadow-sm">
                <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                <SelectTrigger className="w-full sm:w-[150px] bg-transparent border-none shadow-none focus:ring-0 text-gray-700 font-medium h-8 text-sm">
                    <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent className="bg-white/80 backdrop-blur-xl border-white/60">
                    <SelectItem value="3m">Last 3 Months</SelectItem>
                    <SelectItem value="6m">Last 6 Months</SelectItem>
                    <SelectItem value="12m">Last 12 Months</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>

          <div className="w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 role="status" aria-label="Loading" className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : graphData.length > 0 ? (
              <ChartContainer config={revenueChartConfig} className="min-h-[200px] w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={graphData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorRevenueHistory" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                    <YAxis
                      tickFormatter={(value) => `₹${(Number(value) / 1000).toLocaleString('en-IN')}k`}
                      tickLine={false}
                      axisLine={false}
                      tick={{fill: '#9ca3af', fontSize: 12}}
                      width={60}
                    />
                    <RechartsTooltip
                      cursor={{fill: 'rgba(0,0,0,0.02)'}}
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', padding: '8px 12px' }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#eab308" strokeWidth={3} fill="url(#colorRevenueHistory)" activeDot={{ r: 6, strokeWidth: 0, fill: '#ca8a04' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400 font-body">
                 No revenue history data available for this range.
              </div>
            )}
          </div>
        </GlassCard>

        {/* Tabular Data */}
        <GlassCard className="p-6 border-white">
          <div className="mb-6">
            <h2 className="text-lg font-medium flex items-center gap-2 text-gray-800">
              <History className="h-5 w-5 text-gray-400" />
              Monthly Revenue Log
            </h2>
            <p className="text-sm text-gray-500 font-body">Tabular view of all captured monthly aggregates.</p>
          </div>
          
          <div className="bg-white/20 rounded-2xl overflow-hidden border border-white/40">
            {isLoading && tableData.length === 0 ? ( 
              <div className="flex items-center justify-center py-12">
                <Loader2 role="status" aria-label="Loading" className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-white/40">
                  <TableRow className="border-b border-gray-200/30 hover:bg-transparent">
                    <TableHead className="w-[300px] font-semibold text-gray-700">Month</TableHead>
                    <TableHead className="text-right font-semibold text-gray-700">Captured Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((item) => (
                    <TableRow key={item.monthDisplay} className="border-b border-gray-100/30 hover:bg-white/40 transition-colors">
                      <TableCell className="font-medium text-gray-600">{item.monthDisplay}</TableCell>
                      <TableCell className="text-right text-gray-800 font-semibold tracking-wide">₹ {item.revenue.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                  {tableData.length === 0 && !isLoading && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={2} className="text-center text-gray-400 font-body py-8 border-none">
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
