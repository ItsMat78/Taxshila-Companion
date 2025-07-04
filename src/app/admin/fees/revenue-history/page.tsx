
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { format, parse, parseISO, compareDesc, subMonths, isAfter, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

const revenueChartConfig = {
  revenue: {
    label: "Revenue (Rs.)",
    color: "hsl(var(--chart-1))",
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
    let safetyCounter = 0; // Avoid infinite loops
    while (currentMonth <= endDate && safetyCounter < 240) { // Limit to 20 years
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
    // Ensure table data is always sorted descending (latest first)
    return [...allRevenueHistory].sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime());
  }, [allRevenueHistory]);

  const totalRevenueAmount = React.useMemo(() => {
    if (isLoading || allRevenueHistory.length === 0) {
      return null;
    }
    return allRevenueHistory.reduce((sum, item) => sum + item.revenue, 0);
  }, [allRevenueHistory, isLoading]);


  return (
    <>
      <PageTitle title="Monthly Revenue History" description="Track revenue from received payments over time." />

      <Card className="mb-6 shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <IndianRupee className="mr-2 h-5 w-5" />
            Total Recorded Revenue
          </CardTitle>
          <CardDescription>Sum of all monthly revenues in the log.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[50px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : totalRevenueAmount !== null ? (
            <p className="text-3xl font-bold">
              Rs. {totalRevenueAmount.toLocaleString('en-IN')}
            </p>
          ) : (
            <p className="text-center text-muted-foreground">No revenue data available.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 shadow-lg w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-grow">
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Revenue Graph
              </CardTitle>
              <CardDescription className="mt-1">Visual comparison of monthly revenue.</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="6m">Last 6 Months</SelectItem>
                <SelectItem value="12m">Last 12 Months</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : graphData.length > 0 ? (
            <ChartContainer config={revenueChartConfig} className="min-h-[200px] w-full aspect-video">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={graphData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickFormatter={(value) => `Rs. ${(Number(value) / 1000).toLocaleString('en-IN')}k`}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={50}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'hsl(var(--muted))', stroke: 'var(--color-revenue)', strokeWidth: 1, radius: 4 }}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => `Rs. ${Number(value).toLocaleString('en-IN')}`} />}
                  />
                  <Area type="linear" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} fill="var(--color-revenue)" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No revenue history data available to display for the selected range.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Monthly Revenue Log
          </CardTitle>
          <CardDescription>Tabular view of all monthly revenue, latest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && tableData.length === 0 ? ( 
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Month</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((item) => (
                  <TableRow key={item.monthDisplay}>
                    <TableCell className="font-medium">{item.monthDisplay}</TableCell>
                    <TableCell className="text-right">Rs. {item.revenue.toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))}
                {tableData.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                      No revenue data found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
