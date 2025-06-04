
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
  AlertTriangle, 
  UserCheck, 
  Clock, 
  Loader2,
  UserPlus,
  CalendarDays,
  Send as SendIcon, 
  Inbox,
  Eye,
  Database 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Card, CardContent, CardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Placeholder data for active students - now includes shift and overstayed status
const placeholderActiveStudents = [
  { id: "TS001", name: "Aarav Sharma", timeIn: "2 hours 30 minutes", shift: "morning", hasOverstayed: false, seatNumber: "A01" },
  { id: "TS002", name: "Priya Patel", timeIn: "7 hours 15 minutes", shift: "morning", hasOverstayed: true, seatNumber: "B03" },
  { id: "TS004", name: "Vikram Singh", timeIn: "4 hours 5 minutes", shift: "evening", hasOverstayed: false, seatNumber: "C02" },
  { id: "TS005", name: "Neha Reddy", timeIn: "0 hours 45 minutes", shift: "fullday", hasOverstayed: false, seatNumber: "D05" },
  { id: "TS008", name: "Kavita Singh", timeIn: "8 hours 0 minutes", shift: "morning", hasOverstayed: true, seatNumber: "A12" },
];

// Placeholder data for available seats
const placeholderAvailableSeats = [
  { seatNumber: "A10" },
  { seatNumber: "B20" },
  { seatNumber: "C08" },
  { seatNumber: "D11" },
  { seatNumber: "E05" },
];

type StatItem = {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  href?: string;
  action?: () => void;
};

type ActionTileItem = {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  hasNew?: boolean;
};

function AdminDashboardContent() {
  const [showActiveStudentsDialog, setShowActiveStudentsDialog] = React.useState(false);
  const [showAvailableSeatsDialog, setShowAvailableSeatsDialog] = React.useState(false);

  const stats: StatItem[] = [
    { title: "Total Students", value: 125, icon: Users, description: "+5 last month", href: "/students/list" },
    { title: "Occupied Seats", value: placeholderActiveStudents.length, icon: Briefcase, description: "Click to view", action: () => setShowActiveStudentsDialog(true) },
    { title: "Available Seats", value: placeholderAvailableSeats.length, icon: Armchair, description: "Click to view", action: () => setShowAvailableSeatsDialog(true) },
    { title: "Revenue", value: "₹15,670", icon: IndianRupee, description: "This month (est.)", href: "/admin/fees/payments-history" },
  ];

  const adminActionTiles: ActionTileItem[] = [
    { title: "Manage Students", icon: Users, description: "View, edit student details.", href: "/students/list" },
    { title: "Register Student", icon: UserPlus, description: "Add new students to system.", href: "/students/register" },
    { title: "Attendance Overview", icon: CalendarDays, description: "Check student attendance logs.", href: "/attendance/calendar" },
    { title: "Send Alert", icon: SendIcon, description: "Broadcast to all members.", href: "/admin/alerts/send" },
    { title: "View Feedback", icon: Inbox, description: "Review member suggestions.", href: "/admin/feedback", hasNew: true },
    { title: "Seat Availability", icon: Eye, description: "View current seat status.", href: "/seats/availability" },
  ];


  return (
    <>
      <PageTitle title="Admin Dashboard" description="Overview of Taxshila Companion activities." />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const statCardElement = (
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              description={stat.description}
            />
          );

          const wrapperClasses = "block no-underline aspect-square focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg";

          if (stat.href) {
            return (
              <Link href={stat.href} key={stat.title} className={wrapperClasses}>
                {statCardElement}
              </Link>
            );
          } else if (stat.action) {
            const dialogOpenState = (stat.title === "Occupied Seats" && showActiveStudentsDialog) || (stat.title === "Available Seats" && showAvailableSeatsDialog);
            const setDialogOpenState = stat.title === "Occupied Seats" ? setShowActiveStudentsDialog : stat.title === "Available Seats" ? setShowAvailableSeatsDialog : undefined;
            
            return (
              <Dialog key={stat.title} open={dialogOpenState} onOpenChange={setDialogOpenState}>
                <DialogTrigger asChild>
                  <div className={cn(wrapperClasses, "cursor-pointer")} onClick={stat.action}>
                    {statCardElement}
                  </div>
                </DialogTrigger>
                {stat.title === "Occupied Seats" && (
                  <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5" /> Active Students in Library</DialogTitle>
                      <DialogDescription>
                        List of students currently checked in. Overstayed students are highlighted.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Seat</TableHead>
                            <TableHead className="flex items-center"><Clock className="mr-1 h-4 w-4"/>Time In Library</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {placeholderActiveStudents.map((student) => (
                            <TableRow key={student.id} className={student.hasOverstayed ? "bg-destructive/10" : ""}>
                              <TableCell>{student.id}</TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell>{student.seatNumber}</TableCell>
                              <TableCell>{student.timeIn}</TableCell>
                              <TableCell>
                                {student.hasOverstayed && (
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          {placeholderActiveStudents.length === 0 && (
                             <TableRow>
                               <TableCell colSpan={5} className="text-center text-muted-foreground">
                                 No students currently active in the library.
                               </TableCell>
                             </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                )}
                 {stat.title === "Available Seats" && (
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center"><Armchair className="mr-2 h-5 w-5" /> Available Seats</DialogTitle>
                      <DialogDescription>
                        List of currently available seat numbers.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Seat Number</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {placeholderAvailableSeats.map((seat) => (
                            <TableRow key={seat.seatNumber}>
                              <TableCell className="font-medium">{seat.seatNumber}</TableCell>
                            </TableRow>
                          ))}
                          {placeholderAvailableSeats.length === 0 && (
                             <TableRow>
                               <TableCell className="text-center text-muted-foreground">
                                 No seats currently available.
                               </TableCell>
                             </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            );
          } else {
            return <div key={stat.title} className={wrapperClasses}>{statCardElement}</div>;
          }
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
    }
  }, [user, isLoading, router]);

  if (isLoading || (user && user.role === 'member')) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (user && user.role === 'admin') {
    return <AdminDashboardContent />;
  }

  return (
     <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
  );
}
