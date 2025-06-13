
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, TrendingUp, History, IndianRupee } from 'lucide-react'; // Added IndianRupee
import { getMonthlyRevenueHistory, type MonthlyRevenueData } from '@/services/student-service';
import { useToast } from '@/hooks/use-toast';
import { format, parse, compareDesc } from 'date-fns';

const revenueChartConfig = {
  revenue: {
    label: "Revenue (Rs.)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const staticProvidedRevenueInput: { monthName: string; year: number; revenue: number }[] = [
  { monthName: "September", year: 2024, revenue: 1900 },
  { monthName: "October", year: 2024, revenue: 4500 },
  { monthName: "November", year: 2024, revenue: 11300 },
  { monthName: "December", year: 2024, revenue: 9550 },
  { monthName: "January", year: 2025, revenue: 8900 },
  { monthName: "February", year: 2025, revenue: 11300 },
  { monthName: "March", year: 2025, revenue: 25700 },
  { monthName: "April", year: 2025, revenue: 57500 },
  { monthName: "May", year: 2025, revenue: 36250 },
];

const staticRevenueData: MonthlyRevenueData[] = staticProvidedRevenueInput.map(item => {
  const monthDate = parse(`${item.monthName} ${item.year}`, 'MMMM yyyy', new Date());
  return {
    monthDate: monthDate,
    monthDisplay: format(monthDate, 'MMMM yyyy'),
    revenue: item.revenue,
  };
});


export default function RevenueHistoryPage() {
  const { toast } = useToast();
  const [allRevenueHistory, setAllRevenueHistory] = React.useState<MonthlyRevenueData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const dynamicHistory = await getMonthlyRevenueHistory();
        
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
        toast({ title: "Error", description: "Could not load revenue history.", variant: "destructive" });
        setAllRevenueHistory(staticRevenueData.sort((a, b) => compareDesc(a.monthDate, b.monthDate)));
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [toast]);

  const graphData = React.useMemo(() => {
    if (isLoading || allRevenueHistory.length === 0) {
      return [];
    }
    return allRevenueHistory
      .slice(0, 6) 
      .reverse() 
      .map(item => ({
        month: format(item.monthDate, 'MMM yy'),
        revenue: item.revenue,
      }));
  }, [allRevenueHistory, isLoading]);

  const tableData = React.useMemo(() => {
    return allRevenueHistory;
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
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Revenue Graph (Last 6 Months)
          </CardTitle>
          <CardDescription>Visual comparison of monthly revenue.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : graphData.length > 0 ? (
            <ChartContainer config={revenueChartConfig} className="min-h-[200px] w-full aspect-video">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={graphData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
                    cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => `Rs. ${Number(value).toLocaleString('en-IN')}`} />}
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No revenue history data available to display for the graph.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Monthly Revenue Log
          </CardTitle>
          <CardDescription>Tabular view of monthly revenue, latest first.</CardDescription>
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
