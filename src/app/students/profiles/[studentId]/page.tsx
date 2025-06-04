
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CreditCard, CalendarDays, Receipt, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getStudentById } from '@/services/student-service';
import type { Student } from '@/types/student';

interface StudentDetailPageProps {
  params: {
    studentId: string;
  };
}

export default function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { studentId } = params;
  const [student, setStudent] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (studentId) {
      const fetchStudentData = async () => {
        setIsLoading(true);
        try {
          const fetchedStudent = await getStudentById(studentId);
          setStudent(fetchedStudent || null); // Set to null if undefined
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
        <Link href="/students/list" passHref legacyBehavior>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Student List
          </Button>
        </Link>
      </PageTitle>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>Name:</strong> {student.name}</p>
            <p><strong>Email:</strong> {student.email || 'N/A'}</p>
            <p><strong>Phone:</strong> {student.phone}</p>
            <p><strong>Shift:</strong> <span className="capitalize">{student.shift}</span></p>
            <p><strong>Seat Number:</strong> {student.seatNumber || 'N/A'}</p>
            <p><strong>Registration Date:</strong> {student.registrationDate}</p>
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
            <p><strong>Status:</strong> 
              <Badge 
                variant={student.feeStatus === "Paid" ? "default" : student.feeStatus === "Due" ? "secondary" : "destructive"} 
                className={
                  student.feeStatus === "Paid" ? "bg-green-100 text-green-700" : 
                  student.feeStatus === "Due" ? "bg-yellow-100 text-yellow-700" : 
                  student.feeStatus === "Overdue" ? "bg-red-100 text-red-700" : "" + " px-2 py-1 text-xs"
                }
              > 
                {student.feeStatus} 
              </Badge> 
            </p>
            <p><strong>Amount Due:</strong> {student.amountDue || "₹0"}</p>
            <p><strong>Last Paid On:</strong> {student.lastPaymentDate || 'N/A'}</p>
            <p><strong>Next Due Date:</strong> {student.nextDueDate || 'N/A'}</p>
             <Button variant="outline" size="sm" className="mt-2" disabled>
                <Receipt className="mr-2 h-4 w-4" /> View Payment History (Placeholder)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarDays className="mr-2 h-5 w-5" />
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
