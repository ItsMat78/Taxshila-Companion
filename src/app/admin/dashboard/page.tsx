
"use client";
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Database,
  Shield,
  ListChecks,
  View,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogTrigger,
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
import { cn } from '@/lib/utils';
import { getStudentSeatAssignments, getAllStudents, getAvailableSeats, getAllAttendanceRecords, calculateMonthlyRevenue, getTodaysActiveAttendanceRecords, processCheckedInStudentsFromSnapshot, refreshAllStudentFeeStatuses, sendShiftWarningAlert } from '@/services/student-service';
import type { Student, Shift, AttendanceRecord, CheckedInStudentInfo, StudentSeatAssignment } from '@/types/student';
import { format, parseISO, isToday, getHours, getMinutes } from 'date-fns';
import { useNotificationCounts } from '@/hooks/use-notification-counts';
import { useFinancialCounts } from '@/hooks/use-financial-counts';
import { ALL_SEAT_NUMBERS as serviceAllSeats } from '@/config/seats';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';


const staticAdminActionTilesConfig = [
    {
        href: "/students/list",
        icon: ListChecks,
        baseTitle: "Manage Students",
        description: "View and edit students.",
    },
    {
        href: "/admin/students/register",
        icon: UserPlus,
        baseTitle: "Register Student",
        description: "Add a new member.",
    },
    {
        href: "/attendance/calendar",
        icon: CalendarDays,
        baseTitle: "Attendance Overview",
        description: "View daily check-ins.",
    },
    {
        href: "/admin/fees/due",
        icon: CreditCard,
        baseTitle: "Payment Due",
        description: "View students with fees due.",
        isFinancialTile: true,
    },
    {
        href: "/admin/fees/payments-history",
        icon: History,
        baseTitle: "Payment History",
        description: "Browse all transactions.",
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
        href: "/seats/availability",
        icon: Armchair,
        baseTitle: "Seat Availability",
        description: "Check hall occupancy.",
    },
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
        <Dialog>
          <DialogTrigger asChild>
            <div className="flex items-center gap-3 min-w-0 cursor-pointer group">
              <Avatar className="h-10 w-10 border flex-shrink-0">
                <AvatarImage src={student.profilePictureUrl || undefined} alt={student.name} data-ai-hint="profile person" />
                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-grow min-w-0">
                <p className="text-sm font-semibold truncate group-hover:underline">{student.name}</p>
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
                      <LogIn className="h-3 w-3 mr-1 text-green-500" />
                      {format(parseISO(student.checkInTime), 'p')}
                  </div>
                </div>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md w-auto p-2">
            <DialogHeader className="mb-2">
              <ShadcnDialogTitle>{student.name}</ShadcnDialogTitle>
            </DialogHeader>
            <Image
              src={student.profilePictureUrl || "https://placehold.co/400x400.png"}
              alt={`${student.name}'s profile picture`}
              width={400}
              height={400}
              className="rounded-md object-contain max-h-[70vh] w-full h-auto"
            />
          </DialogContent>
        </Dialog>
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
            <span className="ml-2">Warn</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};


export default function AdminDashboardPage() {
  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = React.useState(true);
  const [isLoadingAvailabilityStats, setIsLoadingAvailabilityStats] = React.useState(true);
  const [isLoadingCheckedInStudents, setIsLoadingCheckedInStudents] = React.useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = React.useState(true);

  const [seatAssignments, setSeatAssignments] = React.useState<StudentSeatAssignment[]>([]);
  const [baseCheckedInStudents, setBaseCheckedInStudents] = React.useState<CheckedInStudentInfo[]>([]);
  const [liveCheckedInStudents, setLiveCheckedInStudents] = React.useState<CheckedInStudentInfo[]>([]);
  const [showCheckedInDialog, setShowCheckedInDialog] = React.useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = React.useState<string | null>(null);
  const [currentMonthName, setCurrentMonthName] = React.useState<string>(format(new Date(), 'MMMM'));

  const [isWarningStudentId, setIsWarningStudentId] = React.useState<string | null>(null);
  const { toast } = useToast();

  const { count: openFeedbackCount, isLoadingCount: isLoadingFeedbackCount } = useNotificationCounts();
  const { count: financialCount, isLoadingCount: isLoadingFinancialCount } = useFinancialCounts();
  
  const [sortOrder, setSortOrder] = React.useState<'time' | 'seat'>('time');


  React.useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingDashboardStats(true);
      setIsLoadingAvailabilityStats(true);
      setIsLoadingCheckedInStudents(true);
      setIsLoadingRevenue(true);

      try {
        await refreshAllStudentFeeStatuses();

        const [
          seatAssignmentsData,
          attendanceSnapshot,
          revenueData,
        ] = await Promise.all([
          getStudentSeatAssignments(),
          getTodaysActiveAttendanceRecords(),
          calculateMonthlyRevenue(),
        ]);

        setSeatAssignments(seatAssignmentsData);
        setMonthlyRevenue(revenueData);

        const checkedInStudents = await processCheckedInStudentsFromSnapshot(attendanceSnapshot, seatAssignmentsData);
        setBaseCheckedInStudents(checkedInStudents);

      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        setSeatAssignments([]);
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
          return { ...student, isOutsideShift: currentlyOutsideShift };
        })
      );
    };

    if (showCheckedInDialog && baseCheckedInStudents.length > 0) {
      updateLiveStudentStatus(); 
      intervalId = setInterval(updateLiveStudentStatus, 30000); 
    } else {
      setLiveCheckedInStudents([]); 
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [showCheckedInDialog, baseCheckedInStudents]);

  const sortedStudentsToDisplay = React.useMemo(() => {
    const students = liveCheckedInStudents.length > 0 ? liveCheckedInStudents : baseCheckedInStudents;
    return [...students].sort((a, b) => {
      if (sortOrder === 'seat') {
        return (parseInt(a.seatNumber || '999') - parseInt(b.seatNumber || '999'));
      }
      // Default sort by time
      return parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime();
    });
  }, [liveCheckedInStudents, baseCheckedInStudents, sortOrder]);


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

  const activeStudents = seatAssignments.filter(s => s.activityStatus === "Active");
  const morningShiftStudentCount = activeStudents.filter(s => s.shift === 'morning').length;
  const eveningShiftStudentCount = activeStudents.filter(s => s.shift === 'evening').length;
  const fullDayShiftStudentCount = activeStudents.filter(s => s.shift === 'fullday').length;
  const totalRegisteredStudents = morningShiftStudentCount + eveningShiftStudentCount + fullDayShiftStudentCount;

  const occupiedSeatsMorning = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'morning' || s.shift === 'fullday')).map(s => s.seatNumber));
  const occupiedSeatsEvening = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'evening' || s.shift === 'fullday')).map(s => s.seatNumber));
  const allOccupiedSeatNumbers = new Set(activeStudents.filter(s => s.seatNumber).map(s => s.seatNumber));
  const availableForFullDayBookingCount = serviceAllSeats.length - allOccupiedSeatNumbers.size;

  return (
    <>
      <PageTitle title="Admin Dashboard" description="Overview of Taxshila Companion activities." />

      <Dialog open={showCheckedInDialog} onOpenChange={setShowCheckedInDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <ShadcnDialogTitle className="flex items-center"><LogIn className="mr-2 h-5 w-5" />Students Currently In</ShadcnDialogTitle>
              <ToggleGroup type="single" variant="outline" size="sm" value={sortOrder} onValueChange={(value) => { if (value) setSortOrder(value as 'time' | 'seat') }}>
                  <ToggleGroupItem value="time" aria-label="Sort by time">
                      <Clock className="h-4 w-4 mr-1" /> Time
                  </ToggleGroupItem>
                  <ToggleGroupItem value="seat" aria-label="Sort by seat number">
                      <Armchair className="h-4 w-4 mr-1" /> Seat
                  </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </DialogHeader>
          {isLoadingCheckedInStudents && baseCheckedInStudents.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto mt-4 space-y-2">
              {sortedStudentsToDisplay.length > 0 ? (
                sortedStudentsToDisplay.map((student) => (
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
