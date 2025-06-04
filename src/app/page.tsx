
"use client";
import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { StatCard } from '@/components/shared/stat-card';
import { Users, Briefcase, WifiOff, CheckSquare, Clock, UserCheck, DollarSign } from 'lucide-react'; 
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

export default function AdminDashboardPage() {
  const [showActiveStudentsDialog, setShowActiveStudentsDialog] = React.useState(false);

  const stats = [
    { title: "Total Students", value: 125, icon: Users, description: "+5 since last month", isClickable: false },
    { title: "Active Seats", value: 80, icon: Briefcase, description: "Currently occupied", isClickable: true, action: () => setShowActiveStudentsDialog(true) },
    { title: "Inactive Seats", value: 20, icon: WifiOff, description: "Needs attention", isClickable: false },
    { title: "Total Revenue", value: "₹5,670", icon: DollarSign, description: "This month (placeholder)", isClickable: false },
  ];

  return (
    <>
      <PageTitle title="Admin Dashboard" description="Overview of Taxshila Companion activities." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => 
          stat.isClickable ? (
            <Dialog key={stat.title} open={stat.title === "Active Seats" && showActiveStudentsDialog} onOpenChange={stat.title === "Active Seats" ? setShowActiveStudentsDialog : undefined}>
              <DialogTrigger asChild>
                <div className="cursor-pointer" onClick={stat.action}>
                  <StatCard
                    title={stat.title}
                    value={stat.value}
                    icon={stat.icon}
                    description={stat.description}
                  />
                </div>
              </DialogTrigger>
              {stat.title === "Active Seats" && (
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
            </Dialog>
          ) : (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              description={stat.description}
            />
          )
        )}
      </div>
    </>
  );
}
