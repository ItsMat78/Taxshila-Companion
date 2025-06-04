
"use client";
import * as React from 'react';
import Link from 'next/link'; // Added Link import
import { PageTitle } from '@/components/shared/page-title';
import { StatCard } from '@/components/shared/stat-card';
import { Users, Briefcase, Armchair, Clock, UserCheck, DollarSign } from 'lucide-react'; 
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

// Placeholder data for active students
const placeholderActiveStudents = [
  { id: "TS001", name: "Aarav Sharma", timeIn: "2 hours 30 minutes" },
  { id: "TS002", name: "Priya Patel", timeIn: "1 hour 15 minutes" },
  { id: "TS004", name: "Vikram Singh", timeIn: "4 hours 5 minutes" },
  { id: "TS005", name: "Neha Reddy", timeIn: "0 hours 45 minutes" },
];

// Placeholder data for available seats
const placeholderAvailableSeats = [
  { seatNumber: "A102" },
  { seatNumber: "B204" },
  { seatNumber: "C008" },
  { seatNumber: "D110" },
  { seatNumber: "E055" },
];

// Define a type for stat items for clarity
type StatItem = {
  title: string;
  value: string | number;
  icon: React.ElementType; // LucideIcon type
  description: string;
  href?: string; // Optional: for navigation
  action?: () => void; // Optional: for dialogs
};


export default function AdminDashboardPage() {
  const [showActiveStudentsDialog, setShowActiveStudentsDialog] = React.useState(false);
  const [showAvailableSeatsDialog, setShowAvailableSeatsDialog] = React.useState(false);

  const stats: StatItem[] = [
    { title: "Total Students", value: 125, icon: Users, description: "+5 since last month", href: "/students/list" },
    { title: "Occupied Seats", value: 80, icon: Briefcase, description: "Currently in use", action: () => setShowActiveStudentsDialog(true) },
    { title: "Available Seats", value: 20, icon: Armchair, description: "Ready for booking", action: () => setShowAvailableSeatsDialog(true) },
    { title: "Total Revenue", value: "₹5,670", icon: DollarSign, description: "This month (placeholder)", href: "/admin/fees/due" },
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
                  <div className="cursor-pointer" onClick={stat.action}>
                    {statCardElement}
                  </div>
                </DialogTrigger>
                {stat.title === "Occupied Seats" && (
                  <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5" /> Active Students in Library</DialogTitle>
                      <DialogDescription>
                        List of students currently checked in and their time spent.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="flex items-center"><Clock className="mr-1 h-4 w-4"/>Time In Library</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {placeholderActiveStudents.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>{student.id}</TableCell>
                              <TableCell className="font-medium">{student.name}</TableCell>
                              <TableCell>{student.timeIn}</TableCell>
                            </TableRow>
                          ))}
                          {placeholderActiveStudents.length === 0 && (
                             <TableRow>
                               <TableCell colSpan={3} className="text-center text-muted-foreground">
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
            return <div key={stat.title}>{statCardElement}</div>; // Fallback for static cards if any
          }
        })}
      </div>
    </>
  );
}
