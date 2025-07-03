
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
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
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Loader2, TrendingUp, Clock, Users, PieChart as PieChartIcon, UserPlus, Sparkles, UserX, UserMinus, CreditCard } from 'lucide-react';
import { getInsightsData, type InsightsData, getAllFeedback } from '@/services/student-service';
import { summarizeFeedback, type FeedbackSummaryInput, type FeedbackSummaryOutput } from '@/ai/flows/feedback-summary-flow';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const hourlyChartConfig = {
  checkIns: {
    label: "Check-ins",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


export default function InsightsPage() {
  const { toast } = useToast();
  const [insights, setInsights] = React.useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [feedbackSummary, setFeedbackSummary] = React.useState<FeedbackSummaryOutput | null>(null);
  const [isSummarizing, setIsSummarizing] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getInsightsData();
        setInsights(data);
      } catch (error) {
        console.error("Failed to fetch insights data:", error);
        toast({ title: "Error", description: "Could not load dashboard insights.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleSummarizeFeedback = async () => {
    setIsSummarizing(true);
    setFeedbackSummary(null);
    try {
      const allFeedbackItems = await getAllFeedback();
      const openFeedback = allFeedbackItems.filter(f => f.status === 'Open');

      if (openFeedback.length === 0) {
        toast({ title: "No Feedback to Summarize", description: "There are no open feedback items to analyze." });
        setIsSummarizing(false);
        return;
      }
      
      const feedbackMessages = openFeedback.map(f => f.message);
      const summary = await summarizeFeedback({ feedbacks: feedbackMessages });
      setFeedbackSummary(summary);
      toast({ title: "Summary Generated", description: "AI has analyzed the open feedback." });

    } catch (error) {
      console.error("Failed to summarize feedback:", error);
      toast({ title: "Summarization Failed", description: "Could not generate AI summary.", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  const shiftData = React.useMemo(() => {
    if (!insights) return [];
    return [
      { name: 'Morning', value: insights.shiftCounts.morning, fill: 'rgb(251 146 60)' }, // orange-400
      { name: 'Evening', value: insights.shiftCounts.evening, fill: 'rgb(167 139 250)' }, // violet-400
      { name: 'Full Day', value: insights.shiftCounts.fullday, fill: 'rgb(250 204 21)' }, // yellow-400
    ].filter(item => item.value > 0);
  }, [insights]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Generating insights...</p>
      </div>
    );
  }

  if (!insights) {
    return <p className="text-center text-muted-foreground">Could not load insights data.</p>;
  }

  return (
    <>
      <PageTitle title="Library Insights" description="Data-driven overview of your study hall's activity and performance." />
      
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.totalActiveStudents}</div>
            <p className="text-xs text-muted-foreground">Currently registered & active</p>
          </CardContent>
        </Card>
        <Link href="/admin/fees/due">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fees Due</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{insights.feesDueCount}</div>
              <p className="text-xs text-muted-foreground">Students with due/overdue fees</p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Students</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.newStudentsThisMonth}</div>
            <p className="text-xs text-muted-foreground">New admissions this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Left Students</CardTitle>
            <UserMinus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.totalLeftStudents}</div>
            <p className="text-xs text-muted-foreground">Students marked as 'Left'</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Duration</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.averageSessionDurationHours.toFixed(1)} hours</div>
            <p className="text-xs text-muted-foreground">For completed sessions</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Check-in Hour</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.peakHour}</div>
            <p className="text-xs text-muted-foreground">Busiest time for member arrivals</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-5">
        {/* Main Charts */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Hourly Check-in Trends</CardTitle>
            <CardDescription>Number of check-ins per hour across all days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={hourlyChartConfig} className="min-h-[250px] w-full">
              <BarChart data={insights.hourlyCheckins} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Bar dataKey="checkIns" fill="var(--color-checkIns)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Shift Popularity</CardTitle>
            <CardDescription>Distribution of active students by shift.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {shiftData.length > 0 ? (
            <ChartContainer config={{}} className="min-h-[250px] w-full aspect-square">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={shiftData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                  >
                    {shiftData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                   <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            ) : ( <p className="text-sm text-muted-foreground py-10">No shift data to display.</p> ) }
          </CardContent>
        </Card>
      </div>
      
       {/* AI Feedback Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-primary" />
            AI-Powered Feedback Summary
          </CardTitle>
          <CardDescription>
            Analyze all open feedback to identify common themes and get a quick summary.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSummarizing ? (
             <div className="flex items-center justify-center h-24">
               <Loader2 className="h-6 w-6 animate-spin text-primary" />
               <p className="ml-2 text-muted-foreground">AI is analyzing feedback...</p>
             </div>
          ) : feedbackSummary ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Overall Summary:</h4>
                <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{feedbackSummary.summary}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Common Themes Identified:</h4>
                <div className="flex flex-wrap gap-2">
                  {feedbackSummary.commonThemes.map((theme, index) => (
                    <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">{theme}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
             <div className="text-center text-muted-foreground p-4 border-dashed border-2 rounded-md">
                Click the button below to generate an AI summary of all open feedback items.
             </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleSummarizeFeedback} disabled={isSummarizing}>
            {isSummarizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {feedbackSummary ? 'Re-generate Summary' : 'Generate Summary'}
          </Button>
        </CardFooter>
      </Card>

      {/* Potentially Inactive Students */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-600">
            <UserX className="mr-2 h-5 w-5" />
            Potentially Inactive Students
          </CardTitle>
          <CardDescription>
            Active students who have not checked in for over 14 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights.inactiveStudents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Days Since</TableHead>
                  <TableHead>Fee Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.inactiveStudents.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.lastSeen}</TableCell>
                    <TableCell>{student.daysSinceLastSeen}</TableCell>
                    <TableCell>{student.feeStatus}</TableCell>
                     <TableCell className="text-right">
                        <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                            <Button variant="outline" size="sm">
                                Manage
                            </Button>
                        </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">All active students have checked in recently. Great!</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
