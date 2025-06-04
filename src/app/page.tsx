
"use client";
import * as React from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/page-title';
import { StatCard } from '@/components/shared/stat-card';
import { Users, Briefcase, Armchair, IndianRupee, AlertTriangle, UserCheck, Clock, Loader2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

// Placeholder data for active students - now includes shift and overstayed status
const placeholderActiveStudents = [
  { id: "TS001", name: "Aarav Sharma", timeIn: "2 hours 30 minutes", shift: "morning", hasOverstayed: false },
  { id: "TS002", name: "Priya Patel", timeIn: "7 hours 15 minutes", shift: "morning", hasOverstayed: true },
  { id: "TS004", name: "Vikram Singh", timeIn: "4 hours 5 minutes", shift: "evening", hasOverstayed: false },
  { id: "TS005", name: "Neha Reddy", timeIn: "0 hours 45 minutes", shift: "fullday", hasOverstayed: false },
  { id: "TS008", name: "Kavita Singh", timeIn: "8 hours 0 minutes", shift: "morning", hasOverstayed: true },
];

// Placeholder data for available seats
const placeholderAvailableSeats = [
  { seatNumber: "A102" },
  { seatNumber: "B204" },
  { seatNumber: "C008" },
  { seatNumber: "D110" },
  { seatNumber: "E055" },
];

type StatItem = {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  href?: string;
  action?: () => void;
};

function AdminDashboardContent() {
  const [showActiveStudentsDialog, setShowActiveStudentsDialog] = React.useState(false);
  const [showAvailableSeatsDialog, setShowAvailableSeatsDialog] = React.useState(false);

  const stats: StatItem[] = [
    { title: "Total Students", value: 125, icon: Users, description: "+5 since last month", href: "/students/list" },
    { title: "Occupied Seats", value: placeholderActiveStudents.length, icon: Briefcase, description: "Currently in use. Click to view.", action: () => setShowActiveStudentsDialog(true) },
    { title: "Available Seats", value: placeholderAvailableSeats.length, icon: Armchair, description: "Ready for booking. Click to view.", action: () => setShowAvailableSeatsDialog(true) },
    { title: "Total Revenue", value: "₹5,670", icon: IndianRupee, description: "This month (placeholder)", href: "/admin/fees/due" },
  ];

  return (
    <>
      <PageTitle title="Admin Dashboard" description="Overview of Taxshila Companion activities." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const statCardElement = (
            <StatCard
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              description={stat.description}
            />
          );

          if (stat.href) {
            return (
              <Link href={stat.href} key={stat.title} passHref legacyBehavior>
                <a className="block no-underline cursor-pointer hover:shadow-md transition-shadow duration-150 ease-in-out rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {statCardElement}
                </a>
              </Link>
            );
          } else if (stat.action) {
            const dialogOpenState = (stat.title === "Occupied Seats" && showActiveStudentsDialog) || (stat.title === "Available Seats" && showAvailableSeatsDialog);
            const setDialogOpenState = stat.title === "Occupied Seats" ? setShowActiveStudentsDialog : stat.title === "Available Seats" ? setShowAvailableSeatsDialog : undefined;
            
            return (
              <Dialog key={stat.title} open={dialogOpenState} onOpenChange={setDialogOpenState}>
                <DialogTrigger asChild>
                  <div className="cursor-pointer hover:shadow-md transition-shadow duration-150 ease-in-out rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={stat.action}>
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
                            <TableHead className="flex items-center"><Clock className="mr-1 h-4 w-4"/>Time In Library</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {placeholderActiveStudents.map((student) => (
                            <TableRow key={student.id} className={student.hasOverstayed ? "bg-destructive/10" : ""}>
                              <TableCell>{student.id}</TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
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
                               <TableCell colSpan={4} className="text-center text-muted-foreground">
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
            return <div key={stat.title}>{statCardElement}</div>;
          }
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

  // This case should ideally be handled by AppLayout redirecting to /login if !user
  return (
     <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
  );
}
