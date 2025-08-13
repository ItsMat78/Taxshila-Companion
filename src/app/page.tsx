
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
  LogIn,
  CreditCard,
  History,
  UserX,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription, CardFooter } from '@/components/ui/card';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getAllStudents, getAvailableSeats, getAllAttendanceRecords, calculateMonthlyRevenue, getTodaysActiveAttendanceRecords, processCheckedInStudentsFromSnapshot, refreshAllStudentFeeStatuses, sendShiftWarningAlert } from '@/services/student-service';
import type { Student, Shift, AttendanceRecord, CheckedInStudentInfo } from '@/types/student';
import type { FeedbackItem } from '@/types/communication';
import { format, parseISO, isToday, getHours, getMinutes } from 'date-fns';
import { useNotificationCounts } from '@/hooks/use-notification-counts';
import { useFinancialCounts } from '@/hooks/use-financial-counts';
import { ALL_SEAT_NUMBERS as serviceAllSeats } from '@/config/seats';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const staticAdminActionTilesConfig = [
    {
        href: "/admin/students/register",
        icon: UserPlus,
        baseTitle: "Register Student",
        description: "Add a new member.",
    },
    {
        href: "/admin/alerts/send",
        icon: SendIcon,
        baseTitle: "Send Alert",
        description: "Broadcast a message.",
    },
    {
        href: "/admin/feedback",
        icon: Inbox,
        baseTitle: "View Feedback",
        description: "Check new messages.",
        isFeedbackTile: true,
    },
    {
        href: "/admin/fees/due",
        icon: CreditCard,
        baseTitle: "Payment Due",
        description: "View students with fees due.",
        isFinancialTile: true,
    }
];


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

const CheckedInStudentCard = ({ student, onWarn, isWarning }: { student: CheckedInStudentInfo, onWarn: (studentId: string) => void, isWarning: boolean }) => {
  return (
    <Card className="w-full">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 border flex-shrink-0">
            <AvatarImage src={student.profilePictureUrl || undefined} alt={student.name} data-ai-hint="profile person" />
            <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-grow min-w-0">
            <p className="text-sm font-semibold truncate">{student.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={cn(
                  'h-6 w-6 flex items-center justify-center rounded-md border text-xs font-bold',
                  getShiftColorClass(student.shift)
                )}
                title={`Seat ${student.seatNumber}`}
              >
                {student.seatNumber || '?'}
              </div>
              <div className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(parseISO(student.checkInTime), 'p')}
              </div>
            </div>
          </div>
        </div>
        {student.isOutsideShift && (
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-500 text-yellow-600 hover:bg-yellow-500/10 flex-shrink-0"
            onClick={() => onWarn(student.studentId)}
            disabled={isWarning}
          >
            {isWarning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Warn</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};


function AdminDashboardContent() {
  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = React.useState(true);
  const [isLoadingAvailabilityStats, setIsLoadingAvailabilityStats] = React.useState(true);
  const [isLoadingCheckedInStudents, setIsLoadingCheckedInStudents] = React.useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = React.useState(true);

  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [baseCheckedInStudents, setBaseCheckedInStudents] = React.useState<CheckedInStudentInfo[]>([]);
  const [liveCheckedInStudents, setLiveCheckedInStudents] = React.useState<CheckedInStudentInfo[]>([]);
  const [showCheckedInDialog, setShowCheckedInDialog] = React.useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = React.useState<string | null>(null);
  const [currentMonthName, setCurrentMonthName] = React.useState<string>(format(new Date(), 'MMMM'));

  const [isWarningStudentId, setIsWarningStudentId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const { count: openFeedbackCount, isLoadingCount: isLoadingFeedbackCount } = useNotificationCounts();
  const { count: financialCount, isLoadingCount: isLoadingFinancialCount } = useFinancialCounts();


  React.useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingDashboardStats(true);
      setIsLoadingAvailabilityStats(true);
      setIsLoadingCheckedInStudents(true);
      setIsLoadingRevenue(true);

      try {
        // Run fee status refresh silently in the background
        await refreshAllStudentFeeStatuses();

        const [
          allStudentsData,
          attendanceSnapshot,
          revenueData,
        ] = await Promise.all([
          getAllStudents(),
          getTodaysActiveAttendanceRecords(),
          calculateMonthlyRevenue(),
        ]);

        setAllStudents(allStudentsData);
        setMonthlyRevenue(revenueData);

        const checkedInStudents = await processCheckedInStudentsFromSnapshot(attendanceSnapshot, allStudentsData);
        setBaseCheckedInStudents(checkedInStudents);

      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        setAllStudents([]);
        setBaseCheckedInStudents([]);
        setMonthlyRevenue("Rs. 0");
      } finally {
        setIsLoadingDashboardStats(false);
        setIsLoadingAvailabilityStats(false); // This will depend on calculations from allStudents, so turn off loading here.
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

  const handleWarnStudent = async (studentId: string) => {
    setIsWarningStudentId(studentId);
    try {
      await sendShiftWarningAlert(studentId);
      toast({
        title: "Warning Sent",
        description: `An alert has been sent to the student regarding their shift timing.`
      });
    } catch (error) {
      toast({
        title: "Error Sending Alert",
        description: "Could not send the warning alert. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsWarningStudentId(null);
    }
  };

  const activeStudents = allStudents.filter(s => s.activityStatus === "Active");
  const morningShiftStudentCount = activeStudents.filter(s => s.shift === 'morning').length;
  const eveningShiftStudentCount = activeStudents.filter(s => s.shift === 'evening').length;
  const fullDayShiftStudentCount = activeStudents.filter(s => s.shift === 'fullday').length;
  const totalRegisteredStudents = morningShiftStudentCount + eveningShiftStudentCount + fullDayShiftStudentCount;

  // Derive available seats from the single student list
  const occupiedSeatsMorning = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'morning' || s.shift === 'fullday')).map(s => s.seatNumber));
  const occupiedSeatsEvening = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'evening' || s.shift === 'fullday')).map(s => s.seatNumber));
  const allOccupiedSeatNumbers = new Set(activeStudents.filter(s => s.seatNumber).map(s => s.seatNumber));
  const availableForFullDayBookingCount = serviceAllSeats.length - allOccupiedSeatNumbers.size;


  const studentsToDisplayInDialog = liveCheckedInStudents.length > 0 ? liveCheckedInStudents : baseCheckedInStudents;

  return (
    <>
      <PageTitle title="Admin Dashboard" description="Overview of Taxshila Companion activities." />

      <Dialog open={showCheckedInDialog} onOpenChange={setShowCheckedInDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <ShadcnDialogTitle className="flex items-center"><LogIn className="mr-2 h-5 w-5" />Students Currently In Library</ShadcnDialogTitle>
          </DialogHeader>
          {isLoadingCheckedInStudents && baseCheckedInStudents.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto mt-4 space-y-2">
              {studentsToDisplayInDialog.length > 0 ? (
                studentsToDisplayInDialog.map((student) => (
                  <CheckedInStudentCard 
                    key={student.studentId} 
                    student={student} 
                    onWarn={handleWarnStudent}
                    isWarning={isWarningStudentId === student.studentId}
                  />
                ))
              ) : (
                 <div className="text-center text-muted-foreground py-6">
                    No students are currently checked in.
                  </div>
              )}
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
              {isLoadingDashboardStats ? <Loader2 className="h-5 w-5 animate-spin my-2 mx-auto" /> : (
                <>
                  <div className="flex justify-between px-2"><span>Morning Slots:</span> <span className="font-semibold text-foreground">{serviceAllSeats.length - occupiedSeatsMorning.size}</span></div>
                  <div className="flex justify-between px-2"><span>Evening Slots:</span> <span className="font-semibold text-foreground">{serviceAllSeats.length - occupiedSeatsEvening.size}</span></div>
                  <div className="flex justify-between px-2"><span>Full Day Slots:</span> <span className="font-semibold text-foreground">{availableForFullDayBookingCount}</span></div>
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
                "shadow-md hover:shadow-lg transition-shadow h-full w-full flex flex-col p-3 text-center items-center justify-center relative",
                hasNewBadge && "border-destructive ring-1 ring-destructive/50"
              )}>
                {hasNewBadge && (
                  <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-destructive" />
                )}
                <Icon className="h-6 w-6 mb-2 text-primary" />
                <ShadcnCardTitle className="text-sm font-semibold leading-tight">{currentTitle}</ShadcnCardTitle>
                <ShadcnCardDescription className="text-xs text-muted-foreground mt-1">{tileConfig.description}</ShadcnCardDescription>
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
     return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  );
}
