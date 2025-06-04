
"use client";
import * as React from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/page-title';
import { StatCard } from '@/components/shared/stat-card';
import { 
  Users, 
  Briefcase, 
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
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getAllStudents, getAvailableSeats, getAllAttendanceRecords } from '@/services/student-service';
import type { Student, Shift, AttendanceRecord } from '@/types/student';
import { format, parseISO, isToday } from 'date-fns';

type StatItemConfig = {
  title: string;
  icon: React.ElementType;
  href?: string;
  // For standard StatCard
  value?: string | number;
  description?: string;
  // For custom cards
  isCustom?: boolean; 
  // For dialog trigger
  dialogContent?: React.ReactNode;
  onCardClick?: () => void;
};

type CheckedInStudentInfo = Student & { checkInTime: string };

function AdminDashboardContent() {
  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = React.useState(true);
  const [isLoadingAvailabilityStats, setIsLoadingAvailabilityStats] = React.useState(true);
  const [isLoadingCheckedInStudents, setIsLoadingCheckedInStudents] = React.useState(true);
  
  // State for "Total Students"
  const [totalActiveStudents, setTotalActiveStudents] = React.useState(0);
  const [morningShiftStudentCount, setMorningShiftStudentCount] = React.useState(0);
  const [eveningShiftStudentCount, setEveningShiftStudentCount] = React.useState(0);
  const [fullDayShiftStudentCount, setFullDayShiftStudentCount] = React.useState(0);

  // State for "Available Booking Slots" breakdown
  const [availableMorningSlotsCount, setAvailableMorningSlotsCount] = React.useState(0);
  const [availableEveningSlotsCount, setAvailableEveningSlotsCount] = React.useState(0);
  const [availableFullDaySlotsCount, setAvailableFullDaySlotsCount] = React.useState(0);

  // State for "Currently In Library"
  const [checkedInStudents, setCheckedInStudents] = React.useState<CheckedInStudentInfo[]>([]);
  const [showCheckedInDialog, setShowCheckedInDialog] = React.useState(false);


  React.useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsLoadingDashboardStats(true);
      setIsLoadingAvailabilityStats(true);
      setIsLoadingCheckedInStudents(true);

      try {
        const [allStudentsData, morningAvail, eveningAvail, fulldayAvail, allAttendance] = await Promise.all([
          getAllStudents(),
          getAvailableSeats('morning'),
          getAvailableSeats('evening'),
          getAvailableSeats('fullday'),
          getAllAttendanceRecords(),
        ]);

        // Calculate Total Students stats
        const activeStudentsWithSeats = allStudentsData.filter(s => s.activityStatus === "Active" && s.seatNumber);
        const morningRegistered = activeStudentsWithSeats.filter(s => s.shift === 'morning').length;
        const eveningRegistered = activeStudentsWithSeats.filter(s => s.shift === 'evening').length;
        const fulldayRegistered = activeStudentsWithSeats.filter(s => s.shift === 'fullday').length;
        
        setMorningShiftStudentCount(morningRegistered);
        setEveningShiftStudentCount(eveningRegistered);
        setFullDayShiftStudentCount(fulldayRegistered);
        setTotalActiveStudents(morningRegistered + eveningRegistered + fulldayRegistered);
        setIsLoadingDashboardStats(false);

        // Calculate Available Booking Slots stats
        setAvailableMorningSlotsCount(morningAvail.length);
        setAvailableEveningSlotsCount(eveningAvail.length);
        setAvailableFullDaySlotsCount(fulldayAvail.length);
        setIsLoadingAvailabilityStats(false);

        // Calculate Currently In Library stats
        const todayCheckedInRecords = allAttendance.filter(
          (record) => isToday(parseISO(record.checkInTime)) && !record.checkOutTime
        );
        
        const checkedInStudentDetails: CheckedInStudentInfo[] = todayCheckedInRecords
          .map(record => {
            const student = allStudentsData.find(s => s.studentId === record.studentId);
            return student ? { ...student, checkInTime: record.checkInTime } : null;
          })
          .filter((s): s is CheckedInStudentInfo => s !== null)
          .sort((a, b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime());
        
        setCheckedInStudents(checkedInStudentDetails);
        setIsLoadingCheckedInStudents(false);

      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        setTotalActiveStudents(0);
        setMorningShiftStudentCount(0);
        setEveningShiftStudentCount(0);
        setFullDayShiftStudentCount(0);
        setAvailableMorningSlotsCount(0);
        setAvailableEveningSlotsCount(0);
        setAvailableFullDaySlotsCount(0);
        setCheckedInStudents([]);
        setIsLoadingDashboardStats(false);
        setIsLoadingAvailabilityStats(false);
        setIsLoadingCheckedInStudents(false);
      }
    };
    fetchDashboardStats();
  }, []);

  const statsConfig: StatItemConfig[] = [
    { 
      title: "Total Students", 
      value: isLoadingDashboardStats ? <Loader2 className="h-5 w-5 animate-spin" /> : totalActiveStudents, 
      icon: Users, 
      description: isLoadingDashboardStats ? "Loading..." : `M: ${morningShiftStudentCount}, E: ${eveningShiftStudentCount}, FD: ${fullDayShiftStudentCount} active`,
      href: "/students/list" 
    },
    { 
      title: "Currently In Library", 
      value: isLoadingCheckedInStudents ? <Loader2 className="h-5 w-5 animate-spin" /> : checkedInStudents.length,
      icon: LogIn, 
      description: "Active check-ins right now",
      onCardClick: () => setShowCheckedInDialog(true),
    },
    { 
      title: "Available Booking Slots", 
      icon: Armchair, 
      href: "/seats/availability",
      isCustom: true, // To render specific content structure
    },
    { title: "Revenue", value: "₹15,670", icon: IndianRupee, description: "This month (est.)", href: "/admin/fees/payments-history" },
  ];

  const adminActionTiles = [
    { title: "Manage Students", icon: Users, description: "View, edit student details.", href: "/students/list" },
    { title: "Register Student", icon: UserPlus, description: "Add new students to system.", href: "/students/register" },
    { title: "Attendance Overview", icon: CalendarDays, description: "Check student attendance logs.", href: "/attendance/calendar" },
    { title: "Send Alert", icon: SendIcon, description: "Broadcast to all members.", href: "/admin/alerts/send" },
    { title: "View Feedback", icon: Inbox, description: "Review member suggestions.", href: "/admin/feedback", hasNew: true },
    { title: "Seat Dashboard", icon: Eye, description: "View current seat status.", href: "/seats/availability" },
  ];


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
                      <TableCell className="font-medium">{student.name}</TableCell>
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat) => {
          const cardContent = (
            <Card className={cn(
                "flex flex-col items-center justify-center text-center p-3 w-full h-full shadow-md hover:shadow-lg transition-shadow",
                stat.onCardClick && "cursor-pointer"
              )}
              onClick={stat.onCardClick}
            >
              {stat.icon && <stat.icon className="h-6 w-6 mb-1 text-primary" />}
              <ShadcnCardTitle className="text-sm font-semibold text-card-foreground mb-1">{stat.title}</ShadcnCardTitle>
              
              {stat.isCustom && stat.title === "Available Booking Slots" ? (
                <CardContent className="p-0 text-xs space-y-0.5 text-muted-foreground w-full">
                  {isLoadingAvailabilityStats ? <Loader2 className="h-5 w-5 animate-spin my-2 mx-auto" /> : (
                    <>
                      <div className="flex justify-between px-2"><span>Morning Slots:</span> <span className="font-semibold text-foreground">{availableMorningSlotsCount}</span></div>
                      <div className="flex justify-between px-2"><span>Evening Slots:</span> <span className="font-semibold text-foreground">{availableEveningSlotsCount}</span></div>
                      <div className="flex justify-between px-2"><span>Full Day Slots:</span> <span className="font-semibold text-foreground">{availableFullDaySlotsCount}</span></div>
                    </>
                  )}
                </CardContent>
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                  {stat.description && <p className="text-xs text-muted-foreground">{stat.description}</p>}
                </>
              )}
            </Card>
          );

          if (stat.href) {
            return (
              <Link href={stat.href} key={stat.title} className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full">
                {cardContent}
              </Link>
            );
          }
          return <div key={stat.title} className="h-full">{cardContent}</div>;
        })}
      </div>

      <div className="my-8 border-t border-border"></div>
      <h2 className="text-lg font-headline font-semibold tracking-tight mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {adminActionTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link href={tile.href} key={tile.title} className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full">
              <Card className={cn(
                "shadow-md hover:shadow-lg transition-shadow h-full flex flex-col aspect-square",
                tile.hasNew && "border-destructive ring-2 ring-destructive/50"
              )}>
                <CardHeader className="p-3 pb-1 relative">
                   {tile.hasNew && (
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
    
