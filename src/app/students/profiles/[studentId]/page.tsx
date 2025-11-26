
"use client";

import * as React from 'react';
import Image from 'next/image';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CreditCard, CalendarDays, Receipt, Loader2, UserCircle, Briefcase, History as HistoryIcon, LogIn, LogOut, Clock, FileText, Download, Mail, Phone, Edit, TrendingUp, ChevronLeft, ChevronRight, View, MapPin, BadgeIndianRupee, Armchair } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { getStudentById, getAttendanceForDate, getAttendanceForDateRange } from '@/services/student-service';
import type { Student, PaymentRecord, AttendanceRecord, Shift } from '@/types/student';
import { format, parseISO, isValid, differenceInMilliseconds, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isAfter, isToday, getDay, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Bar } from 'recharts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

const DEFAULT_PROFILE_PLACEHOLDER = "https://placehold.co/100x100.png";
const ID_CARD_PLACEHOLDER = "https://placehold.co/300x200.png?text=ID+Card";


const ChartTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const hours = payload[0].value;
        const minutes = Math.round((hours % 1) * 60);
        return (
            <div className="p-2 bg-popover text-popover-foreground border rounded-md shadow-md text-sm">
                <p className="font-semibold">{format(parseISO(label), 'PP')}</p>
                <p>
                    {payload[0].name}: {Math.floor(hours)} hr {minutes} min
                </p>
            </div>
        );
    }

    return null;
};

const StudyGrid = ({ data, month, onDayClick }: { data: { date: string; hours: number }[]; month: Date, onDayClick: (date: Date) => void }) => {
    if (!data.length) return null;

    const getIntensityClass = (hours: number) => {
        if (hours <= 0) return 'bg-muted/30';
        if (hours < 3) return 'bg-primary/20';
        if (hours < 6) return 'bg-primary/50';
        if (hours < 9) return 'bg-primary/70';
        return 'bg-primary';
    };

    const weekStartsOn = 0; // 0 for Sunday
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const gridStart = startOfWeek(monthStart, { weekStartsOn });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn });

    const daysInGrid = eachDayOfInterval({ start: gridStart, end: gridEnd });
    
    const studyDataMap = new Map(data.map(item => [item.date, item.hours]));
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <TooltipProvider>
            <div className="flex flex-col items-center justify-center gap-2 w-full">
                <div className="grid grid-cols-7 gap-1.5 w-full">
                    {weekdays.map((day, index) => (
                        <div key={`${day}-${index}`} className="text-xs text-center font-semibold text-muted-foreground">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5 w-full">
                    {daysInGrid.map((day) => {
                        const dateString = format(day, 'yyyy-MM-dd');
                        const hours = studyDataMap.get(dateString) ?? 0;
                        const isCurrentMonth = isSameMonth(day, month);

                        return (
                            <Tooltip key={dateString} delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <button 
                                      onClick={() => { onDayClick(day); }}
                                      className={cn(
                                        "aspect-square w-full rounded-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:z-10", 
                                        getIntensityClass(hours),
                                        isCurrentMonth ? "border border-border" : "opacity-50",
                                        isToday(day) && "ring-2 ring-offset-2 ring-accent"
                                    )} />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-sm font-semibold">{format(day, 'MMM d, yyyy')}</p>
                                    <p className="text-xs">
                                        {Math.floor(hours)}h {Math.round((hours % 1) * 60)}m of study
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <span>Less</span>
                    <div className="h-3 w-3 rounded-sm bg-muted/30" title="0 hours" />
                    <div className="h-3 w-3 rounded-sm bg-primary/20" title="< 3 hours" />
                    <div className="h-3 w-3 rounded-sm bg-primary/50" title="< 6 hours" />
                    <div className="h-3 w-3 rounded-sm bg-primary/70" title="< 9 hours" />
                    <div className="h-3 w-3 rounded-sm bg-primary" title="> 9 hours" />
                    <span>More</span>
                </div>
            </div>
        </TooltipProvider>
    );
};

// Mobile Card Item for Payment History
const PaymentHistoryCardItem = ({ payment }: { payment: PaymentRecord }) => (
  <div className="p-3 border rounded-md bg-muted/30 shadow-sm">
    <div className="flex justify-between items-start mb-1">
      <div className="font-medium text-sm">{payment.amount}</div>
      <Badge variant="outline" className="text-xs capitalize">{payment.method}</Badge>
    </div>
    <div className="text-xs text-muted-foreground space-y-1">
      <p>Date: {payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'dd-MMM-yy') : 'N/A'}</p>
      <p>Transaction ID: {payment.transactionId}</p>
    </div>
    <div className="mt-2">
      <Button variant="outline" size="sm" disabled className="w-full">
        <Download className="mr-1 h-3 w-3" /> Invoice
      </Button>
    </div>
  </div>
);

const DateBox = ({ date, label }: { date?: string; label: string }) => {
  const parsedDate = date && isValid(parseISO(date)) ? parseISO(date) : null;
  
  if (!parsedDate) {
    return (
      <div className="flex-1 text-center p-2 rounded-md bg-muted/50 min-w-[70px]">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">N/A</div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 text-center p-2 rounded-md bg-muted/50 min-w-[70px]">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{format(parsedDate, 'd')}</div>
      <div className="text-xs font-medium text-primary">{format(parsedDate, 'MMM')}</div>
    </div>
  );
};



export default function StudentDetailPage() {
  const paramsHook = useParams();
  const studentId = paramsHook.studentId as string;
  const { toast } = useToast();

  const [student, setStudent] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());
  const [dailyAttendanceRecords, setDailyAttendanceRecords] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDailyAttendance, setIsLoadingDailyAttendance] = React.useState(false);

  const [viewedMonth, setViewedMonth] = React.useState(new Date());
  const [monthlyStudyData, setMonthlyStudyData] = React.useState<{ date: string; hours: number }[]>([]);
  const [isLoadingMonthlyStudyData, setIsLoadingMonthlyStudyData] = React.useState(true);
  
  const [showMonthlyStudyTime, setShowMonthlyStudyTime] = React.useState(false);
  const [showAttendanceOverview, setShowAttendanceOverview] = React.useState(false);

  React.useEffect(() => {
    if (studentId) {
      const fetchStudentData = async () => {
        setIsLoading(true);
        try {
          const fetchedStudent = await getStudentById(studentId);
          setStudent(fetchedStudent || null);
        } catch (error) {
          console.error("Failed to fetch student:", error);
          toast({ title: "Error", description: "Could not load student details.", variant: "destructive" });
          setStudent(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchStudentData();
    }
  }, [studentId, toast]);

  React.useEffect(() => {
    if (studentId && selectedCalendarDate && showAttendanceOverview) {
      const fetchDailyData = async () => {
        setIsLoadingDailyAttendance(true);
        setDailyAttendanceRecords([]);
        try {
          const records = await getAttendanceForDate(studentId, format(selectedCalendarDate, 'yyyy-MM-dd'));
          setDailyAttendanceRecords(records.sort((a,b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime()));
        } catch (error) {
          console.error("Failed to fetch daily attendance records:", error);
          toast({ title: "Error", description: "Could not load attendance for selected date.", variant: "destructive" });
          setDailyAttendanceRecords([]);
        } finally {
          setIsLoadingDailyAttendance(false);
        }
      };
      fetchDailyData();
    }
  }, [studentId, selectedCalendarDate, showAttendanceOverview, toast]);

  const getDailyStudyDataForMonth = React.useCallback(async (studentId: string, month: Date) => {
    setIsLoadingMonthlyStudyData(true);
    try {
        const startDate = startOfMonth(month);
        const endDate = endOfMonth(month);
        
        const recordsForMonth = await getAttendanceForDateRange(studentId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
        const dailyHoursMap = new Map<string, number>();

        recordsForMonth.forEach(record => {
            let totalMilliseconds = 0;
            if (record.checkInTime && record.checkOutTime && isValid(parseISO(record.checkInTime)) && isValid(parseISO(record.checkOutTime))) {
                totalMilliseconds = differenceInMilliseconds(parseISO(record.checkOutTime), parseISO(record.checkInTime));
            }
            const dateKey = format(parseISO(record.checkInTime), 'yyyy-MM-dd');
            dailyHoursMap.set(dateKey, (dailyHoursMap.get(dateKey) || 0) + totalMilliseconds);
        });

        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        const studyData = allDays.map(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            const totalMilliseconds = dailyHoursMap.get(dateString) || 0;
            const totalHours = totalMilliseconds / (1000 * 60 * 60);
            return { date: dateString, hours: totalHours };
        });
        setMonthlyStudyData(studyData);
    } catch (error) {
        console.error("Error fetching daily study data:", error);
        toast({ title: "Chart Error", description: "Could not load monthly study data.", variant: "destructive" });
    } finally {
        setIsLoadingMonthlyStudyData(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (studentId && showMonthlyStudyTime) {
      getDailyStudyDataForMonth(studentId, viewedMonth);
    }
  }, [studentId, viewedMonth, getDailyStudyDataForMonth, showMonthlyStudyTime]);

    const handlePrevMonth = () => {
        setViewedMonth((prev) => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setViewedMonth((prev) => addMonths(prev, 1));
    };

  const getFeeStatusBadge = (studentData: Student) => {
    if (studentData.activityStatus === 'Left') {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">N/A (Left)</Badge>;
    }
    switch (studentData.feeStatus) {
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'Due':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Due</Badge>;
      case 'Paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Paid</Badge>;
      default:
        return <Badge variant="outline">{studentData.feeStatus}</Badge>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  }
  
  const getShiftColorClass = (shift: Shift | undefined) => {
    if (!shift) return 'bg-gray-100 text-gray-800 border-gray-300';
    switch (shift) {
      case 'morning': return 'bg-seat-morning text-seat-morning-foreground border-orange-300 dark:border-orange-700';
      case 'evening': return 'bg-seat-evening text-seat-evening-foreground border-purple-300 dark:border-purple-700';
      case 'fullday': return 'bg-seat-fullday text-seat-fullday-foreground border-yellow-300 dark:border-yellow-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };


  if (isLoading && !student) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading student details...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <>
        <PageTitle title="Student Not Found" description={`No student found with ID: ${studentId}`} >
          <Link href="/students/list" passHref legacyBehavior>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Student List
            </Button>
          </Link>
        </PageTitle>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              The student you are looking for does not exist or could not be loaded.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageTitle title={`Student Profile: ${student.name}`} description={`Details for student ID: ${studentId}`} >
        <div className="flex items-center space-x-2">
          <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Student
            </Button>
          </Link>
          <Link href="/students/list" passHref legacyBehavior>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Student List
            </Button>
          </Link>
        </div>
      </PageTitle>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center gap-4">
                 <Dialog>
                    <DialogTrigger asChild>
                        <div className="cursor-pointer relative group flex-shrink-0">
                            <Avatar className="h-20 w-20 border-2 border-primary shadow-md">
                                <AvatarImage src={student.profilePictureUrl || undefined} alt={student.name} data-ai-hint="profile person"/>
                                <AvatarFallback className="text-3xl">{getInitials(student.name)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <View className="text-white h-8 w-8"/>
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-md w-auto p-2">
                        <Image
                            src={student.profilePictureUrl || DEFAULT_PROFILE_PLACEHOLDER}
                            alt="Profile Picture Full View"
                            width={500}
                            height={500}
                            className="rounded-md object-contain max-h-[80vh] w-full h-auto"
                        />
                    </DialogContent>
                </Dialog>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl break-words">{student.name}</CardTitle>
                  <CardDescription className="break-words">Student ID: {student.studentId}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm">
                <div className="flex items-start">
                  <Mail className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium break-words">{student.email || 'N/A'}</p>
                  </div>
                </div>
                 <div className="flex items-start">
                  <Phone className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium break-words">{student.phone}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Briefcase className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex items-center gap-2">
                    <p className="font-medium capitalize">{student.shift}</p>
                    <div className={cn("flex items-center justify-center h-8 w-8 text-sm rounded-md border-2 font-bold", getShiftColorClass(student.shift))}>
                        {student.seatNumber || 'N/A'}
                    </div>
                  </div>
                </div>
                 <div className="flex items-start">
                  <BadgeIndianRupee className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Fee Status</p>
                    <div className="font-medium">{getFeeStatusBadge(student)}</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <UserCircle className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Activity Status</p>
                     <Badge
                        variant={student.activityStatus === "Active" ? "default" : "secondary"}
                        className={cn("font-medium", student.activityStatus === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")}
                    >
                        {student.activityStatus}
                    </Badge>
                  </div>
                </div>
                <div className="pt-2 border-t mt-4 flex flex-wrap gap-2">
                    <DateBox date={student.registrationDate} label="Registered" />
                    <DateBox date={student.lastPaymentDate} label="Last Paid" />
                    {student.activityStatus === 'Left' ? (
                       <DateBox date={student.leftDate} label="Date Left" />
                    ) : (
                       <DateBox date={student.nextDueDate} label="Next Due" />
                    )}
                </div>
              </CardContent>
            </Card>
        </div>

        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <HistoryIcon className="mr-2 h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>Record of all past payments made by the student.</CardDescription>
          </CardHeader>
          <CardContent>
            {(student.paymentHistory && student.paymentHistory.length > 0) ? (
              <>
                <div className="md:hidden space-y-3 max-h-80 overflow-y-auto">
                  {student.paymentHistory.slice().reverse().map((payment: PaymentRecord) => (
                    <PaymentHistoryCardItem key={payment.paymentId} payment={payment} />
                  ))}
                </div>
                <div className="hidden md:block max-h-80 w-full overflow-y-auto overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.paymentHistory.slice().reverse().map((payment: PaymentRecord) => (
                        <TableRow key={payment.paymentId}>
                          <TableCell className="whitespace-nowrap">{payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'dd-MMM-yy') : 'N/A'}</TableCell>
                          <TableCell className="whitespace-nowrap">{payment.amount}</TableCell>
                          <TableCell className="capitalize whitespace-nowrap">{payment.method}</TableCell>
                          <TableCell className="whitespace-nowrap">{payment.transactionId}</TableCell>
                           <TableCell className="whitespace-nowrap">
                            <Button variant="outline" size="sm" disabled>
                              <Download className="mr-1 h-3 w-3" /> Invoice
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">No payment history found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-md w-full overflow-x-auto">
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2">
                <div className="flex-grow">
                  <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5" />
                      Monthly Study Time
                  </CardTitle>
                  <CardDescription className="mt-1">Hours studied per day this month</CardDescription>
                </div>
                {showMonthlyStudyTime && (
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isLoadingMonthlyStudyData}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium w-32 text-center">{format(viewedMonth, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoadingMonthlyStudyData}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </CardHeader>
        <CardContent>
            {!showMonthlyStudyTime ? (
                 <div className="text-center py-10">
                    <Button onClick={() => setShowMonthlyStudyTime(true)}>
                        Show Monthly Study Chart
                    </Button>
                </div>
            ) : isLoadingMonthlyStudyData ? (
                <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                </div>
            ) : (
                (monthlyStudyData.length > 0 && monthlyStudyData.some(d => d.hours > 0)) ? (
                    <div className="min-h-[300px] w-full">
                        <div className="md:hidden">
                           <StudyGrid data={monthlyStudyData} month={viewedMonth} onDayClick={(day) => { setSelectedCalendarDate(day); setShowAttendanceOverview(true); }}/>
                        </div>
                        <div className="hidden md:block">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyStudyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={(date) => format(parseISO(date), 'dd')} tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        width={50}
                                        tickFormatter={(value) => `${value}h`}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                                        content={<ChartTooltipContent />}
                                    />
                                    <Bar dataKey="hours" name="Hours Studied" fill="hsl(var(--primary))" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-10 h-[300px] flex items-center justify-center">No study history data available for this month.</p>
                )
            )}
        </CardContent>
    </Card>

      <Card className="mt-6 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="mr-2 h-5 w-5" />
            Attendance Overview
          </CardTitle>
          <CardDescription>
            Select a date to view attendance for {student.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {!showAttendanceOverview ? (
                <div className="text-center py-10">
                    <Button onClick={() => setShowAttendanceOverview(true)}>
                        Show Attendance Calendar
                    </Button>
                </div>
            ) : (
              <div className="flex flex-col items-stretch gap-6 md:flex-row md:items-start">
                <div className="w-full flex justify-center md:w-auto">
                  <Calendar
                    mode="single"
                    selected={selectedCalendarDate}
                    onSelect={setSelectedCalendarDate}
                    className="rounded-md border shadow-inner min-w-[280px] sm:min-w-[320px]"
                    modifiers={{ today: new Date() }}
                    modifiersStyles={{ today: { color: 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } }}
                  />
                </div>
                <div className="w-full md:flex-1">
                  <h4 className="text-md font-semibold mb-2">
                    Details for {selectedCalendarDate ? format(selectedCalendarDate, 'PPP') : 'selected date'}:
                  </h4>
                  {isLoadingDailyAttendance ? (
                    <div className="flex items-center justify-center text-muted-foreground py-4">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading details...
                    </div>
                  ) : dailyAttendanceRecords.length === 0 ? (
                    <p className="text-muted-foreground py-4">No attendance records found for this day.</p>
                  ) : (
                    <ul className="space-y-3 max-h-80 overflow-y-auto">
                      {dailyAttendanceRecords.map(record => (
                        <li key={record.recordId} className="p-3 border rounded-md bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <LogIn className="mr-2 h-4 w-4 text-green-600" />
                              <span className="font-medium">Checked In:</span>
                            </div>
                            <span className="text-sm">
                              {record.checkInTime && isValid(parseISO(record.checkInTime)) ? format(parseISO(record.checkInTime), 'p') : 'N/A'}
                            </span>
                          </div>
                          {record.checkOutTime ? (
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center">
                                <LogOut className="mr-2 h-4 w-4 text-red-600" />
                                <span className="font-medium">Checked Out:</span>
                              </div>
                              <span className="text-sm">
                                {isValid(parseISO(record.checkOutTime)) ? format(parseISO(record.checkOutTime), 'p') : 'N/A'}
                                </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                                <span className="font-medium">Status:</span>
                              </div>
                              <span className="text-sm text-yellow-600">Currently Checked In</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}

    

    