
"use client";

import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CreditCard, CalendarDays, Receipt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StudentDetailPageProps {
  params: {
    studentId: string;
  };
}

// Placeholder student data structure including fee details
const placeholderStudentDetails = {
  "TS001": { name: "Aarav Sharma", email: "aarav.sharma@example.com", phone: "9876543210", shift: "morning", seatNumber: "A101", feeStatus: "Paid", amountDue: "₹0", lastPaidOn: "2024-06-01", nextDueDate: "2024-07-01" },
  "TS002": { name: "Priya Patel", email: "priya.patel@example.com", phone: "9876543211", shift: "evening", seatNumber: "B203", feeStatus: "Due", amountDue: "₹700", lastPaidOn: "2024-05-05", nextDueDate: "2024-06-05" },
  "TS003": { name: "Rohan Mehta", email: "rohan.mehta@example.com", phone: "9876543212", shift: "fullday", seatNumber: "C007", feeStatus: "Overdue", amountDue: "₹1200", lastPaidOn: "2024-04-15", nextDueDate: "2024-05-15" },
};

type StudentKey = keyof typeof placeholderStudentDetails;


export default function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { studentId } = params;
  const student = placeholderStudentDetails[studentId as StudentKey] || {
    name: "N/A", email: "N/A", phone: "N/A", shift: "N/A", seatNumber: "N/A",
    feeStatus: "N/A", amountDue: "N/A", lastPaidOn: "N/A", nextDueDate: "N/A"
  };


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
            <p><strong>Email:</strong> {student.email}</p>
            <p><strong>Phone:</strong> {student.phone}</p>
            <p><strong>Shift:</strong> <span className="capitalize">{student.shift}</span></p>
            <p><strong>Seat Number:</strong> {student.seatNumber}</p>
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
            <p><strong>Status:</strong> <Badge variant={student.feeStatus === "Paid" ? "default" : student.feeStatus === "Due" ? "secondary" : "destructive"} className="bg-green-100 text-green-700 data-[variant=destructive]:bg-red-100 data-[variant=destructive]:text-red-700 data-[variant=secondary]:bg-yellow-100 data-[variant=secondary]:text-yellow-700 px-2 py-1 text-xs"> {student.feeStatus} </Badge> </p>
            <p><strong>Amount Due:</strong> {student.amountDue}</p>
            <p><strong>Last Paid On:</strong> {student.lastPaidOn}</p>
            <p><strong>Next Due Date:</strong> {student.nextDueDate}</p>
             <Button variant="outline" size="sm" className="mt-2">
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
