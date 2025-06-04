
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
  LogIn
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Import Badge
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
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getAllStudents, getAvailableSeats, getAllAttendanceRecords, getAllFeedback, calculateMonthlyRevenue } from '@/services/student-service'; 
import type { Student, Shift, AttendanceRecord } from '@/types/student';
import type { FeedbackItem } from '@/types/communication'; 
import { format, parseISO, isToday, getHours } from 'date-fns';

type CheckedInStudentInfo = Student & { 
  checkInTime: string;
  isOutsideShift?: boolean; 
};

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

  const [checkedInStudents, setCheckedInStudents] = React.useState<CheckedInStudentInfo[]>([]);
  const [showCheckedInDialog, setShowCheckedInDialog] = React.useState(false);
  const [hasOpenFeedback, setHasOpenFeedback] = React.useState(false); 
  const [monthlyRevenue, setMonthlyRevenue] = React.useState<string | null>(null);


  React.useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoadingDashboardStats(true);
      setIsLoadingAvailabilityStats(true);
      setIsLoadingCheckedInStudents(true);
      setIsLoadingRevenue(true);
      setHasOpenFeedback(false); 

      try {
        const [
          allStudentsData,
          morningAvail,
          eveningAvail,
          fulldayAvail,
          allAttendance,
          allFeedbackItems, 
          currentMonthRevenue,
        ] = await Promise.all([
          getAllStudents(),
          getAvailableSeats('morning'),
          getAvailableSeats('evening'),
          getAvailableSeats('fullday'),
          getAllAttendanceRecords(),
          getAllFeedback(), 
          calculateMonthlyRevenue(),
        ]);

        // Calculate Total Students stats
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

            const checkInDate = parseISO(record.checkInTime);
            const checkInHour = getHours(checkInDate); // Using date-fns getHours
            let isStudyingOutsideShift = false;

            if (student.shift === "morning") { // 7 AM (7) to 2 PM (14)
              if (checkInHour < 7 || checkInHour >= 14) {
                isStudyingOutsideShift = true;
              }
            } else if (student.shift === "evening") { // 3 PM (15) to 10 PM (22)
              if (checkInHour < 15 || checkInHour >= 22) {
                isStudyingOutsideShift = true;
              }
            }
            // No check for fullday as they cover the entire operational time.

            return { ...student, checkInTime: record.checkInTime, isOutsideShift: isStudyingOutsideShift };
          })
          .filter((s): s is CheckedInStudentInfo => s !== null)
          .sort((a, b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime());
        
        setCheckedInStudents(checkedInStudentDetails);
        setMonthlyRevenue(currentMonthRevenue);

        // Check for open feedback
        const openFeedbackExists = allFeedbackItems.some(fb => fb.status === "Open");
        setHasOpenFeedback(openFeedbackExists);

      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        setMorningShiftStudentCount(0);
        setEveningShiftStudentCount(0);
        setFullDayShiftStudentCount(0);
        setAvailableMorningSlotsCount(0);
        setAvailableEveningSlotsCount(0);
        setAvailableFullDaySlotsCount(0);
        setCheckedInStudents([]);
        setMonthlyRevenue("₹0");
        setHasOpenFeedback(false);
      } finally {
        setIsLoadingDashboardStats(false);
        setIsLoadingAvailabilityStats(false);
        setIsLoadingCheckedInStudents(false);
        setIsLoadingRevenue(false);
      }
    };
    fetchDashboardData();
  }, []);

  const adminActionTiles = [
    { title: "Manage Students", icon: Users, description: "View, edit student details.", href: "/students/list" },
    { title: "Register Student", icon: UserPlus, description: "Add new students to system.", href: "/students/register" },
    { title: "Attendance Overview", icon: CalendarDays, description: "Check student attendance logs.", href: "/attendance/calendar" },
    { title: "Send Alert", icon: SendIcon, description: "Broadcast to all members.", href: "/admin/alerts/send" },
    { title: "View Feedback", icon: Inbox, description: "Review member suggestions.", href: "/admin/feedback", dynamicHasNew: () => hasOpenFeedback }, 
    { title: "Seat Dashboard", icon: Eye, description: "View current seat status.", href: "/seats/availability" },
  ];

  const totalRegisteredStudents = morningShiftStudentCount + eveningShiftStudentCount + fullDayShiftStudentCount;

  return (
    <>
      <PageTitle title="Admin Dashboard" description="Overview of Taxshila Companion activities." />
      
      <Dialog open={showCheckedInDialog} onOpenChange={setShowCheckedInDialog}>
        <DialogContent className="sm:max-w-[725px]">
           <DialogHeader>
            <ShadcnDialogTitle className="flex items-center"><LogIn className="mr-2 h-5 w-5" />Students Currently In Library</ShadcnDialogTitle>
          </DialogHeader>
          {isLoadingCheckedInStudents ? (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead>Check-in Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedInStudents.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell className="font-medium">
                        {student.name}
                        {student.isOutsideShift && (
                            <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600 text-xs">Outside Shift</Badge>
                        )}
                      </TableCell>
                      <TableCell>{student.seatNumber || 'N/A'}</TableCell>
                      <TableCell>{format(parseISO(student.checkInTime), 'p')}</TableCell>
                    </TableRow>
                  ))}
                  {checkedInStudents.length === 0 && (
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
                <div className="text-2xl font-bold text-foreground mb-1">{checkedInStudents.length}</div>
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
        
        <Link href="/admin/fees/payments-history" className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full">
             <Card className="flex flex-col items-center justify-center text-center p-3 w-full h-full shadow-md hover:shadow-lg transition-shadow">
                <IndianRupee className="h-6 w-6 mb-1 text-primary" />
                <ShadcnCardTitle className="text-sm font-semibold text-card-foreground mb-1">Revenue (This Month)</ShadcnCardTitle>
                {isLoadingRevenue ? (
                     <Loader2 className="h-5 w-5 animate-spin my-1" />
                ) : (
                    <div className="text-2xl font-bold text-foreground mb-1">{monthlyRevenue || "₹0"}</div>
                )}
                <p className="text-xs text-muted-foreground">Est. from current data</p>
            </Card>
        </Link>
      </div>

      <div className="my-8 border-t border-border"></div>
      <h2 className="text-lg font-headline font-semibold tracking-tight mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {adminActionTiles.map((tile) => {
          const Icon = tile.icon;
          const currentHasNew = tile.dynamicHasNew ? tile.dynamicHasNew() : (tile as any).hasNew; 
          return (
            <Link href={tile.href} key={tile.title} className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full">
              <Card className={cn(
                "shadow-md hover:shadow-lg transition-shadow h-full flex flex-col aspect-square",
                currentHasNew && "border-destructive ring-2 ring-destructive/50"
              )}>
                <CardHeader className="p-3 pb-1 relative">
                   {currentHasNew && (
                     <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-destructive ring-1 ring-white" />
                   )}
                  <div className="flex items-center gap-2">
                    <Icon className="h-6 w-6 text-primary" /> 
                    <ShadcnCardTitle className="text-base font-semibold">{tile.title}</ShadcnCardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 flex-grow flex flex-col items-center justify-center">
                  <ShadcnCardDescription className="text-xs text-muted-foreground text-center">{tile.description}</ShadcnCardDescription>
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

  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'member') {
        router.replace('/member/dashboard');
      }
    } else if (!isLoading && !user) {
       router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || (!isLoading && !user && !router.pathname?.startsWith('/login'))) { 
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

  return (
     <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
  );
}

