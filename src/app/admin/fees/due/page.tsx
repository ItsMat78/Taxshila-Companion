
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarClock, CheckCircle2, Loader2, User, IndianRupee, Edit, UserCheck, Eye, UserX } from 'lucide-react';
import { getAllStudents, getAllAttendanceRecords } from '@/services/student-service';
import type { Student } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

interface StudentWithLastAttended extends Student {
  lastAttended?: string; // ISO string
}

const FeeDueCardItem = ({ student }: { student: StudentWithLastAttended }) => {
  const feeStatusBadge = (
    <Badge
      variant={student.feeStatus === "Overdue" ? "destructive" : "default"}
      className={cn("capitalize text-xs px-1.5 py-0.5", student.feeStatus === "Due" ? "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200" : "")}
    >
      {student.feeStatus === "Overdue" && <CalendarClock className="mr-1 h-3 w-3" />}
      {student.feeStatus}
    </Badge>
  );

  return (
    <Card className={cn("w-full shadow-md", student.feeStatus === "Overdue" ? "bg-destructive/5 border-destructive/30" : "")}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-md break-words">{student.name}</CardTitle>
          {feeStatusBadge}
        </div>
        <CardDescription className="text-xs break-words">ID: {student.studentId}</CardDescription>
      </CardHeader>
      <CardContent className="text-xs space-y-1 pb-3">
        <p><span className="font-medium">Amount Due:</span> {student.amountDue || 'N/A'}</p>
        <p><span className="font-medium">Last Payment:</span> {student.lastPaymentDate && isValid(parseISO(student.lastPaymentDate)) ? format(parseISO(student.lastPaymentDate), 'MMM d, yyyy') : 'N/A'}</p>
        <p><span className="font-medium">Next Due Date:</span> {student.nextDueDate && isValid(parseISO(student.nextDueDate)) ? format(parseISO(student.nextDueDate), 'MMM d, yyyy') : 'N/A'}</p>
        <p className="flex items-center"><UserCheck className="mr-1 h-3 w-3 text-muted-foreground"/><span className="font-medium">Last Attended:</span>&nbsp;{student.lastAttended && isValid(parseISO(student.lastAttended)) ? format(parseISO(student.lastAttended), 'MMM d, yyyy') : 'Never'}</p>
      </CardContent>
      <CardFooter className="py-3 border-t flex justify-end gap-2">
         <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
            <Button variant="outline" size="sm" className="flex-1">
                <Eye className="mr-2 h-3 w-3" /> View
            </Button>
        </Link>
        <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
            <Button variant="outline" size="sm" className="flex-1">
                <Edit className="mr-2 h-3 w-3" /> Manage
            </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default function FeesDuePage() {
  const { toast } = useToast();
  const [feesDueStudents, setFeesDueStudents] = React.useState<StudentWithLastAttended[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchFeesDue = async () => {
      setIsLoading(true);
      try {
        const [allStudents, allAttendance] = await Promise.all([
          getAllStudents(),
          getAllAttendanceRecords(),
        ]);

        const lastAttendedMap = new Map<string, string>();
        allAttendance.forEach(record => {
          const existing = lastAttendedMap.get(record.studentId);
          if (!existing || new Date(record.checkInTime) > new Date(existing)) {
            lastAttendedMap.set(record.studentId, record.checkInTime);
          }
        });

        const dueStudents = allStudents
          .filter(student =>
            student.activityStatus === "Active" &&
            (student.feeStatus === "Due" || student.feeStatus === "Overdue")
          )
          .map(student => ({
            ...student,
            lastAttended: lastAttendedMap.get(student.studentId)
          }));

        dueStudents.sort((a, b) => {
          const statusOrder = (status: Student['feeStatus']) => status === "Overdue" ? 0 : 1;
          if (statusOrder(a.feeStatus) !== statusOrder(b.feeStatus)) {
            return statusOrder(a.feeStatus) - statusOrder(b.feeStatus);
          }
          try {
            const dateA = a.nextDueDate && isValid(parseISO(a.nextDueDate)) ? parseISO(a.nextDueDate) : new Date(0);
            const dateB = b.nextDueDate && isValid(parseISO(b.nextDueDate)) ? parseISO(b.nextDueDate) : new Date(0);
            return dateA.getTime() - dateB.getTime();
          } catch (e) {
            return 0;
          }
        });

        setFeesDueStudents(dueStudents);
      } catch (error) {
        console.error("Failed to fetch fees due:", error);
        toast({ title: "Error", description: "Could not load fees due list.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeesDue();
  }, [toast]);

  return (
    <>
      <PageTitle title="Student Fees Due" description="Manage and track students with outstanding fee payments." />

      <Link href="/admin/students/potential-left" className="block no-underline">
        <Card className="mb-6 shadow-md border-orange-500/20 bg-orange-500/5 hover:shadow-lg hover:border-orange-500/40 transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <UserX className="mr-2 h-5 w-5" />
              Potentially Left Students
            </CardTitle>
            <CardDescription className="text-orange-600">
              Click here to view active students who have not attended in the last 5 days and manage them.
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>

      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
            Fees Due List ({feesDueStudents.length})
          </CardTitle>
          <CardDescription>Students are ordered by overdue status, then by due date.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading student fee data...</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {feesDueStudents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                     <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-500" />
                    No outstanding fees at the moment.
                  </div>
                ) : (
                  feesDueStudents.map((student) => (
                    <FeeDueCardItem key={student.studentId} student={student} />
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Last Payment</TableHead>
                      <TableHead>Next Due Date</TableHead>
                      <TableHead>Last Attended</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feesDueStudents.map((student) => (
                      <TableRow key={student.studentId} className={student.feeStatus === "Overdue" ? "bg-destructive/10 hover:bg-destructive/15" : "hover:bg-muted/30"}>
                        <TableCell>{student.studentId}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {student.lastPaymentDate && isValid(parseISO(student.lastPaymentDate))
                            ? format(parseISO(student.lastPaymentDate), 'MMM d, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {student.nextDueDate && isValid(parseISO(student.nextDueDate))
                            ? format(parseISO(student.nextDueDate), 'MMM d, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                           {student.lastAttended && isValid(parseISO(student.lastAttended))
                            ? format(parseISO(student.lastAttended), 'MMM d, yyyy')
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={student.feeStatus === "Overdue" ? "destructive" : "default"}
                            className={cn("capitalize", student.feeStatus === "Due" ? "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200" : "")}
                          >
                            {student.feeStatus === "Overdue" && <CalendarClock className="mr-1 h-3 w-3" />}
                            {student.feeStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                            <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                                <Button variant="outline" size="sm">
                                    <Eye className="mr-1 h-3 w-3" /> View
                                </Button>
                            </Link>
                            <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                                <Button variant="outline" size="sm">
                                    <Edit className="mr-1 h-3 w-3" /> Manage
                                </Button>
                            </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {feesDueStudents.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-500" />
                          No outstanding fees at the moment.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
