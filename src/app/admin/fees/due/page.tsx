
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
import { AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';

// Placeholder data for students with fees due
const placeholderFeesDue = [
  { studentId: "TS001", name: "Aarav Sharma", amountDue: "₹700", lastPayment: "2024-05-01", nextDueDate: "2024-06-01", status: "Due" },
  { studentId: "TS003", name: "Rohan Mehta", amountDue: "₹1200", lastPayment: "2024-04-15", nextDueDate: "2024-05-15", status: "Overdue" },
  { studentId: "TS007", name: "Sanya Gupta", amountDue: "₹700", lastPayment: "2024-05-10", nextDueDate: "2024-06-10", status: "Due" },
  { studentId: "TS012", name: "Karan Verma", amountDue: "₹700", lastPayment: "2024-03-20", nextDueDate: "2024-04-20", status: "Overdue" },
];

export default function FeesDuePage() {
  return (
    <>
      <PageTitle title="Student Fees Due" description="Manage and track students with outstanding fee payments." />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
            Fees Due List
          </CardTitle>
          <CardDescription>Students are ordered by their due status and then by due date (placeholder logic).</CardDescription>
        </CardHeader>
        <CardContent>
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
              {placeholderFeesDue.map((student) => (
                <TableRow key={student.studentId} className={student.status === "Overdue" ? "bg-destructive/10" : ""}>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.amountDue}</TableCell>
                  <TableCell>{student.lastPayment}</TableCell>
                  <TableCell>{student.nextDueDate}</TableCell>
                  <TableCell>
                    <Badge variant={student.status === "Overdue" ? "destructive" : "default"} className="capitalize">
                      {student.status === "Overdue" && <CalendarClock className="mr-1 h-3 w-3" />}
                      {student.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {placeholderFeesDue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                     <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-500" />
                    No outstanding fees at the moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
