
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
import { Loader2, TrendingUp, History } from 'lucide-react';
import { getMonthlyRevenueHistory, type MonthlyRevenueData } from '@/services/student-service';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

const revenueChartConfig = {
  revenue: {
    label: "Revenue (Rs.)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function RevenueHistoryPage() {
  const { toast } = useToast();
  const [allRevenueHistory, setAllRevenueHistory] = React.useState<MonthlyRevenueData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const historyData = await getMonthlyRevenueHistory(); 
        setAllRevenueHistory(historyData);
      } catch (error) {
        console.error("Failed to fetch revenue history:", error);
        toast({ title: "Error", description: "Could not load revenue history.", variant: "destructive" });
        setAllRevenueHistory([]);
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
        month: format(item.monthDate, 'MMM'), 
        revenue: item.revenue,
      }));
  }, [allRevenueHistory, isLoading]);

  const tableData = React.useMemo(() => {
    if (isLoading || allRevenueHistory.length === 0) {
      return [];
    }
    const october2024StartDate = new Date(2024, 9, 1); // Month is 0-indexed (9 = October)
    return allRevenueHistory.filter(item => item.monthDate >= october2024StartDate);
  }, [allRevenueHistory, isLoading]);


  return (
    <>
      <PageTitle title="Monthly Revenue History" description="Track revenue from received payments over time." />

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
            Revenue Data (Since Oct 2024)
          </CardTitle>
          <CardDescription>Tabular view of monthly revenue, latest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                      No revenue data found for this period.
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
