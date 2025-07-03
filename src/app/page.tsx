
"use client";
import * as React from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/page-title';
import {
  Users,
  Armchair,
  IndianRupee,
  Loader2,
  UserPlus,
  CalendarDays,
  Send as SendIcon,
  Inbox,
  Eye,
  Database,
  CreditCard,
  Receipt,
  BarChart3,
  History,
  QrCode,
  MessageSquare,
  Bell,
  ScrollText,
  Star,
  Edit,
  ClipboardCheck,
  Landmark,
  type Icon as LucideIcon,
  Home,
  UserCircle,
  TrendingUp,
  Settings,
  UploadCloud,
  LogIn,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as ShadcnDialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getAllStudents, getAvailableSeats, getAllAttendanceRecords, calculateMonthlyRevenue } from '@/services/student-service';
import type { Student, Shift, AttendanceRecord } from '@/types/student';
import type { FeedbackItem } from '@/types/communication';
import { format, parseISO, isToday, getHours, getMinutes } from 'date-fns';
import { useNotificationCounts } from '@/hooks/use-notification-counts';
import { useFinancialCounts } from '@/hooks/use-financial-counts';

interface CheckedInStudentInfo extends Student {
  checkInTime: string;
  isOutsideShift: boolean; // Based on check-in time initially, then updated live
  shift: Shift; // Student's registered shift
}

const staticAdminActionTilesConfig = [
  { baseTitle: "Manage Students", icon: Users, description: "View, edit student details.", href: "/students/list" },
  { baseTitle: "Register Student", icon: UserPlus, description: "Add new students to system.", href: "/students/register" },
  { baseTitle: "Attendance Overview", icon: CalendarDays, description: "Check student attendance logs.", href: "/attendance/calendar" },
  {
    baseTitle: "Payment Due List",
    icon: CreditCard,
    description: "View students with due fees.",
    href: "/admin/fees/due",
    isFinancialTile: true,
  },
  { baseTitle: "Payment History", icon: History, description: "See all past transactions.", href: "/admin/fees/payments-history" },
  { baseTitle: "Send Alert", icon: SendIcon, description: "Broadcast to all members.", href: "/admin/alerts/send" },
  {
    baseTitle: "View Feedback",
    icon: Inbox,
    description: "Review member suggestions.",
    href: "/admin/feedback",
    isFeedbackTile: true,
  },
  { baseTitle: "Seat Dashboard", icon: Eye, description: "View current seat status.", href: "/seats/availability" },
];


function AdminDashboardContent() {
  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = React.useState(true);
  const [isLoadingAvailabilityStats, setIsLoadingAvailabilityStats] = React.useState(true);
  const [isLoadingCheckedInStudents, setIsLoadingCheckedInStudents] = React.useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = React.useState(true);

  const [morningShiftStudentCount, setMorningShiftStudentCount] = React.useState(0);
  const [eveningShiftStudentCount, setEveningShiftStudentCount] = React.useState(0);
  const [fullDayShiftStudentCount, setFullDayShiftStudentCount] = React.useState(0);

  const [availableMorningSlotsCount, setAvailableMorningSlotsCount] = React.useState(0);
  const [availableEveningSlotsCount, setAvailableEveningSlotsCount] = React.useState(0);
  const [availableFullDaySlotsCount, setAvailableFullDaySlotsCount] = React.useState(0);

  const [baseCheckedInStudents, setBaseCheckedInStudents] = React.useState<CheckedInStudentInfo[]>([]);
  const [liveCheckedInStudents, setLiveCheckedInStudents] = React.useState<CheckedInStudentInfo[]>([]);
  const [showCheckedInDialog, setShowCheckedInDialog] = React.useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = React.useState<string | null>(null);
  const [currentMonthName, setCurrentMonthName] = React.useState<string>(format(new Date(), 'MMMM'));

  const { count: openFeedbackCount, isLoadingCount: isLoadingFeedbackCount } = useNotificationCounts();
  const { count: financialCount, isLoadingCount: isLoadingFinancialCount } = useFinancialCounts();


  React.useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingDashboardStats(true);
      setIsLoadingAvailabilityStats(true);
      setIsLoadingCheckedInStudents(true);
      setIsLoadingRevenue(true);

      try {
        const [
          allStudentsData,
          morningAvail,
          eveningAvail,
          fulldayAvail,
          allAttendance,
          currentMonthRevenue,
        ] = await Promise.all([
          getAllStudents(),
          getAvailableSeats('morning'),
          getAvailableSeats('evening'),
          getAvailableSeats('fullday'),
          getAllAttendanceRecords(),
          calculateMonthlyRevenue(),
        ]);

        const activeStudentsWithSeats = allStudentsData.filter(s => s.activityStatus === "Active" && s.seatNumber);
        const morningRegistered = activeStudentsWithSeats.filter(s => s.shift === 'morning').length;
        const eveningRegistered = activeStudentsWithSeats.filter(s => s.shift === 'evening').length;
        const fulldayRegistered = activeStudentsWithSeats.filter(s => s.shift === 'fullday').length;

        setMorningShiftStudentCount(morningRegistered);
        setEveningShiftStudentCount(eveningRegistered);
        setFullDayShiftStudentCount(fulldayRegistered);

        setAvailableMorningSlotsCount(morningAvail.length);
        setAvailableEveningSlotsCount(eveningAvail.length);
        setAvailableFullDaySlotsCount(fulldayAvail.length);

        const todayCheckedInRecords = allAttendance.filter(
          (record) => isToday(parseISO(record.checkInTime)) && !record.checkOutTime
        );

        const checkedInStudentDetails: CheckedInStudentInfo[] = todayCheckedInRecords
          .map(record => {
            const student = allStudentsData.find(s => s.studentId === record.studentId);
            if (!student) return null;

            let isOutsideAtCheckIn = false;
            const checkInTime = parseISO(record.checkInTime);
            const checkInHour = getHours(checkInTime);
            const checkInMinutes = getMinutes(checkInTime);

            if (student.shift === "morning" && (checkInHour < 7 || checkInHour >= 14)) {
              isOutsideAtCheckIn = true;
            } else if (student.shift === "evening" && (checkInHour < 14 || checkInHour > 21 || (checkInHour === 21 && checkInMinutes > 30))) {
              isOutsideAtCheckIn = true;
            }
            // Full day students are never outside their shift by this definition.

            return { ...student, checkInTime: record.checkInTime, isOutsideShift: isOutsideAtCheckIn, shift: student.shift };
          })
          .filter((s): s is CheckedInStudentInfo => s !== null)
          .sort((a, b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime()) as CheckedInStudentInfo[];

        setBaseCheckedInStudents(checkedInStudentDetails);
        setMonthlyRevenue(currentMonthRevenue);
        setCurrentMonthName(format(new Date(), 'MMMM'));

      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        setMorningShiftStudentCount(0);
        setEveningShiftStudentCount(0);
        setFullDayShiftStudentCount(0);
        setAvailableMorningSlotsCount(0);
        setAvailableEveningSlotsCount(0);
        setAvailableFullDaySlotsCount(0);
        setBaseCheckedInStudents([]);
        setMonthlyRevenue("Rs. 0");
      } finally {
        setIsLoadingDashboardStats(false);
        setIsLoadingAvailabilityStats(false);
        setIsLoadingCheckedInStudents(false);
        setIsLoadingRevenue(false);
      }
    };
    fetchDashboardData();
  }, []);

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const updateLiveStudentStatus = () => {
      const now = new Date();
      const currentHour = getHours(now);
      const currentMinutes = getMinutes(now);

      setLiveCheckedInStudents(
        baseCheckedInStudents.map(student => {
          let currentlyOutsideShift = false;
          if (student.shift === "morning") { // Morning: 7 AM to 2 PM (14:00)
            if (currentHour < 7 || currentHour >= 14) {
              currentlyOutsideShift = true;
            }
          } else if (student.shift === "evening") { // Evening: 2 PM (14:00) to 9:30 PM (21:30)
             if (currentHour < 14 || currentHour > 21 || (currentHour === 21 && currentMinutes > 30)) {
              currentlyOutsideShift = true;
            }
          }
          // Full day students are by definition not "outside shift" during library hours
          return { ...student, isOutsideShift: currentlyOutsideShift };
        })
      );
    };

    if (showCheckedInDialog && baseCheckedInStudents.length > 0) {
      updateLiveStudentStatus(); // Initial update when dialog opens
      intervalId = setInterval(updateLiveStudentStatus, 30000); // Update every 30 seconds
    } else {
      setLiveCheckedInStudents([]); // Clear live data if dialog is closed or no base students
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [showCheckedInDialog, baseCheckedInStudents]);


  const totalRegisteredStudents = morningShiftStudentCount + eveningShiftStudentCount + fullDayShiftStudentCount;
  const studentsToDisplayInDialog = liveCheckedInStudents.length > 0 ? liveCheckedInStudents : baseCheckedInStudents;


  return (
    <>
      <PageTitle title="Admin Dashboard" description="Overview of Taxshila Companion activities." />

      <Dialog open={showCheckedInDialog} onOpenChange={setShowCheckedInDialog}>
        <DialogContent className="sm:max-w-[725px]">
          <DialogHeader>
            <ShadcnDialogTitle className="flex items-center"><LogIn className="mr-2 h-5 w-5" />Students Currently In Library</ShadcnDialogTitle>
          </DialogHeader>
          {isLoadingCheckedInStudents && baseCheckedInStudents.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead>Check-in Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentsToDisplayInDialog.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium flex items-center">
                        {student.name}
                        {student.isOutsideShift && (
                          <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600 text-xs">
                            Outside Shift
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{student.shift}</TableCell>
                      <TableCell>{student.seatNumber || 'N/A'}</TableCell>
                      <TableCell>{format(parseISO(student.checkInTime), 'p' )}</TableCell>
                    </TableRow>
                  ))}
                  {studentsToDisplayInDialog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                        No students are currently checked in.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <Link href="/students/list" className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full">
          <Card className="flex flex-col items-center justify-center text-center p-3 w-full h-full shadow-md hover:shadow-lg transition-shadow">
            <Users className="h-6 w-6 mb-1 text-primary" />
            <ShadcnCardTitle className="text-sm font-semibold text-card-foreground mb-1">Total Students</ShadcnCardTitle>
            {isLoadingDashboardStats ? (
              <Loader2 className="h-5 w-5 animate-spin my-1" />
            ) : (
              <div className="text-2xl font-bold text-foreground mb-1">{totalRegisteredStudents}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {isLoadingDashboardStats ? "Loading..." : `M: ${morningShiftStudentCount}, E: ${eveningShiftStudentCount}, FD: ${fullDayShiftStudentCount} active`}
            </p>
          </Card>
        </Link>

        <Card
          className="flex flex-col items-center justify-center text-center p-3 w-full h-full shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setShowCheckedInDialog(true)}
        >
          <LogIn className="h-6 w-6 mb-1 text-primary" />
          <ShadcnCardTitle className="text-sm font-semibold text-card-foreground mb-1">Currently In Library</ShadcnCardTitle>
          {isLoadingCheckedInStudents ? (
            <Loader2 className="h-5 w-5 animate-spin my-1" />
          ) : (
            <div className="text-2xl font-bold text-foreground mb-1">{baseCheckedInStudents.length}</div>
          )}
          <p className="text-xs text-muted-foreground">Active check-ins right now</p>
        </Card>

        <Link href="/seats/availability" className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full">
          <Card className="flex flex-col items-center justify-center text-center p-3 w-full h-full shadow-md hover:shadow-lg transition-shadow">
            <Armchair className="h-6 w-6 mb-1 text-primary" />
            <ShadcnCardTitle className="text-sm font-semibold text-card-foreground mb-1">Available Booking Slots</ShadcnCardTitle>
            <CardContent className="p-0 text-xs text-muted-foreground w-full mt-1 space-y-0.5">
              {isLoadingAvailabilityStats ? <Loader2 className="h-5 w-5 animate-spin my-2 mx-auto" /> : (
                <>
                  <div className="flex justify-between px-2"><span>Morning Slots:</span> <span className="font-semibold text-foreground">{availableMorningSlotsCount}</span></div>
                  <div className="flex justify-between px-2"><span>Evening Slots:</span> <span className="font-semibold text-foreground">{availableEveningSlotsCount}</span></div>
                  <div className="flex justify-between px-2"><span>Full Day Slots:</span> <span className="font-semibold text-foreground">{availableFullDaySlotsCount}</span></div>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/fees/revenue-history" className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full">
          <Card className="flex flex-col items-center justify-center text-center p-3 w-full h-full shadow-md hover:shadow-lg transition-shadow">
            <IndianRupee className="h-6 w-6 mb-1 text-primary" />
            <ShadcnCardTitle className="text-sm font-semibold text-card-foreground mb-1">Revenue ({currentMonthName})</ShadcnCardTitle>
            {isLoadingRevenue ? (
              <Loader2 className="h-5 w-5 animate-spin my-1" />
            ) : (
              <div className="text-2xl font-bold text-foreground mb-1">{monthlyRevenue || "Rs. 0"}</div>
            )}
            <p className="text-xs text-muted-foreground">From received payments this month</p>
          </Card>
        </Link>
      </div>

      <div className="my-8 border-t border-border"></div>

      <h2 className="text-lg font-headline font-semibold tracking-tight mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {staticAdminActionTilesConfig.map((tileConfig) => {
          const Icon = tileConfig.icon;
          let currentTitle = tileConfig.baseTitle;
          let hasNewBadge = false;

          if (tileConfig.isFeedbackTile) {
            if (isLoadingFeedbackCount) {
              currentTitle = "Feedback (Loading...)";
            } else if (openFeedbackCount > 0) {
              currentTitle = `View Feedback (${openFeedbackCount} Open)`;
              hasNewBadge = true;
            } else {
              currentTitle = "View Feedback";
            }
          }

          if (tileConfig.isFinancialTile) {
            if (isLoadingFinancialCount) {
              currentTitle = "Payment Due (Loading...)";
            } else if (financialCount > 0) {
              currentTitle = `Payment Due (${financialCount})`;
              hasNewBadge = true;
            } else {
              currentTitle = "Payment Due List";
            }
          }

          return (
            <Link href={tileConfig.href} key={tileConfig.baseTitle} className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full">
              <Card className={cn(
                "shadow-md hover:shadow-lg transition-shadow h-full flex flex-col",
                hasNewBadge && "border-destructive ring-2 ring-destructive/50"
              )}>
                <CardHeader className="p-3 pb-1 relative">
                  {hasNewBadge && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-destructive ring-1 ring-white" />
                  )}
                  <div className="flex items-center gap-2">
                    <Icon className="h-6 w-6 text-primary" />
                    <ShadcnCardTitle className="text-base font-semibold">{currentTitle}</ShadcnCardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 flex-grow flex flex-col items-center justify-center">
                  <ShadcnCardDescription className="text-xs text-muted-foreground text-center">{tileConfig.description}</ShadcnCardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default function MainPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'member') {
        router.replace('/member/dashboard');
      }
    } else if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || (!isLoading && !user && !pathname.startsWith('/login'))) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (user && user.role === 'member') {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  if (user && user.role === 'admin') {
    return <AdminDashboardContent />;
  }

  if (!isLoading && !user && pathname.startsWith('/login')) {
    // This case can happen if user is on login page and logs out, or directly navigates to login.
    // We don't want to show a full-page loader here because the login page should render.
    // The AppLayout handles the redirection if they try to access protected routes without auth.
    // If AppLayout is not handling children correctly for /login route, this might be a safety net.
    // However, with the current AppLayout, this condition might lead to rendering the loader over the login page.
    // It's better handled by AppLayout structure. For now, let the login page render.
     return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  );
}
