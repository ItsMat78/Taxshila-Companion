
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
import { format, parseISO } from 'date-fns'; // Added parseISO for potential future use, format for month name

const revenueChartConfig = {
  revenue: {
    label: "Revenue (₹)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function RevenueHistoryPage() {
  const { toast } = useToast();
  const [revenueHistory, setRevenueHistory] = React.useState<MonthlyRevenueData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const historyData = await getMonthlyRevenueHistory(12); // Fetch for last 12 months
        setRevenueHistory(historyData);
      } catch (error) {
        console.error("Failed to fetch revenue history:", error);
        toast({ title: "Error", description: "Could not load revenue history.", variant: "destructive" });
        setRevenueHistory([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [toast]);

  return (
    <>
      <PageTitle title="Monthly Revenue History" description="Track revenue from received payments over time." />

      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Revenue Graph (Last 12 Months)
          </CardTitle>
          <CardDescription>Visual comparison of monthly revenue.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : revenueHistory.length > 0 ? (
            <ChartContainer config={revenueChartConfig} className="min-h-[200px] w-full aspect-video">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis
                    tickFormatter={(value) => `₹${value / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={40}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => `₹${Number(value).toLocaleString()}`} />}
                  />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10">No revenue history data available to display.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Revenue Data (Last 12 Months)
          </CardTitle>
          <CardDescription>Tabular view of monthly revenue from received payments.</CardDescription>
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
                {revenueHistory.map((item) => (
                  <TableRow key={item.month}>
                    <TableCell className="font-medium">{item.month}</TableCell>
                    <TableCell className="text-right">₹{item.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {revenueHistory.length === 0 && !isLoading && (
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
