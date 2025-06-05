
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarClock, CheckCircle2, Loader2 } from 'lucide-react';
import { getAllStudents } from '@/services/student-service';
import type { Student } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';

export default function FeesDuePage() {
  const { toast } = useToast();
  const [feesDueStudents, setFeesDueStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchFeesDue = async () => {
      setIsLoading(true);
      try {
        const allStudents = await getAllStudents();
        const dueStudents = allStudents.filter(student =>
          student.activityStatus === "Active" &&
          (student.feeStatus === "Due" || student.feeStatus === "Overdue")
        );

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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
            Fees Due List
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Next Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feesDueStudents.map((student) => (
                  <TableRow key={student.studentId} className={student.feeStatus === "Overdue" ? "bg-destructive/10 hover:bg-destructive/15" : "hover:bg-muted/30"}>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.amountDue || 'N/A'}</TableCell>
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
                    <TableCell>
                      <Badge
                        variant={student.feeStatus === "Overdue" ? "destructive" : "default"}
                        className={`capitalize ${student.feeStatus === "Due" ? "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200" : ""}`}
                      >
                        {student.feeStatus === "Overdue" && <CalendarClock className="mr-1 h-3 w-3" />}
                        {student.feeStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {feesDueStudents.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                       <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-500" />
                      No outstanding fees at the moment.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
