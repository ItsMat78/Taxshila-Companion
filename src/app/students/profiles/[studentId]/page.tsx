
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CreditCard, CalendarDays, Receipt, Loader2, UserCircle, Briefcase, History as HistoryIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStudentById } from '@/services/student-service';
import type { Student, PaymentRecord } from '@/types/student';
import { format, parseISO, isValid } from 'date-fns';

const DEFAULT_PROFILE_PLACEHOLDER = "https://placehold.co/100x100.png";

export default function StudentDetailPage() {
  const paramsHook = useParams();
  const studentId = paramsHook.studentId as string;

  const [student, setStudent] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (studentId) {
      const fetchStudentData = async () => {
        setIsLoading(true);
        try {
          const fetchedStudent = await getStudentById(studentId);
          setStudent(fetchedStudent || null);
        } catch (error) {
          console.error("Failed to fetch student:", error);
          setStudent(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchStudentData();
    }
  }, [studentId]);

  const getFeeStatusBadge = (studentData: Student) => {
    if (studentData.activityStatus === 'Left') {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">N/A (Left)</Badge>;
    }
    switch (studentData.feeStatus) {
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'Due':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Due</Badge>;
      case 'Paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Paid</Badge>;
      default:
        return <Badge variant="outline">{studentData.feeStatus}</Badge>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading student details...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <>
        <PageTitle title="Student Not Found" description={`No student found with ID: ${studentId}`} >
          <Link href="/students/list" passHref legacyBehavior>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Student List
            </Button>
          </Link>
        </PageTitle>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              The student you are looking for does not exist or could not be loaded.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageTitle title={`Student Profile: ${student.name}`} description={`Details for student ID: ${studentId}`} >
        <div className="flex items-center space-x-2">
          <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
            <Button variant="outline">
              <UserCircle className="mr-2 h-4 w-4" />
              Edit Student
            </Button>
          </Link>
          <Link href="/students/list" passHref legacyBehavior>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Student List
            </Button>
          </Link>
        </div>
      </PageTitle>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-start gap-4">
            <Avatar className="h-20 w-20 border">
              <AvatarImage src={student.profilePictureUrl || DEFAULT_PROFILE_PLACEHOLDER} alt={student.name} data-ai-hint="profile person" />
              <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="flex items-center text-xl">
                {student.name}
              </CardTitle>
              <CardDescription>Student ID: {student.studentId}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p><strong>Email:</strong> {student.email || 'N/A'}</p>
            <p><strong>Phone:</strong> {student.phone}</p>
            <p><strong>Shift:</strong> <span className="capitalize">{student.shift}</span></p>
            <p><strong>Seat Number:</strong> {student.seatNumber || 'N/A'}</p>
            <p><strong>Registration Date:</strong> {student.registrationDate ? format(parseISO(student.registrationDate), 'PP') : 'N/A'}</p>
            <div className="flex items-center">
              <strong>Activity Status:</strong>
              <Badge
                  variant={student.activityStatus === "Active" ? "default" : "secondary"}
                  className={student.activityStatus === "Active" ? "ml-2 bg-green-100 text-green-700" : "ml-2 bg-gray-100 text-gray-700"}
              >
                  {student.activityStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Fee Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>Status:</strong> {getFeeStatusBadge(student)}</p>
            <p><strong>Amount Due:</strong> {student.activityStatus === 'Left' ? 'N/A' : (student.amountDue || "₹0")}</p>
            <p><strong>Last Paid On:</strong> {student.activityStatus === 'Left' ? 'N/A' : (student.lastPaymentDate && isValid(parseISO(student.lastPaymentDate)) ? format(parseISO(student.lastPaymentDate), 'PP') : 'N/A')}</p>
            <p><strong>Next Due Date:</strong> {student.activityStatus === 'Left' ? 'N/A' : (student.nextDueDate && isValid(parseISO(student.nextDueDate)) ? format(parseISO(student.nextDueDate), 'PP') : 'N/A')}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <HistoryIcon className="mr-2 h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Record of payments made by {student.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {(student.paymentHistory && student.paymentHistory.length > 0) ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Transaction ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.paymentHistory.slice().reverse().map((payment: PaymentRecord) => ( // Displaying recent first
                  <TableRow key={payment.paymentId}>
                    <TableCell>{payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'PP') : 'N/A'}</TableCell>
                    <TableCell>{payment.amount}</TableCell>
                    <TableCell className="capitalize">{payment.method}</TableCell>
                    <TableCell>{payment.transactionId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">No payment history found for this student.</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="mr-2 h-5 w-5" />
            Attendance Overview
          </CardTitle>
          <CardDescription>Student's attendance calendar and summary will be displayed here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Full attendance calendar and statistics for this student are coming soon.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
