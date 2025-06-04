
"use client";

import * as React from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/page-title';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight } from 'lucide-react';

// Placeholder type for student data - ensure this matches the registration form structure
type StudentData = {
  studentId: string;
  name: string;
  email: string;
  phone?: string;
  shift: "morning" | "evening" | "fullday";
  seatNumber?: string; // Added seatNumber
};

// Placeholder data for existing students - this would come from an API or state management in a real app
const placeholderStudents: StudentData[] = [
  { studentId: "TS001", name: "Aarav Sharma", email: "aarav.sharma@example.com", phone: "9876543210", shift: "morning", seatNumber: "A101" },
  { studentId: "TS002", name: "Priya Patel", email: "priya.patel@example.com", phone: "9876543211", shift: "evening", seatNumber: "B203" },
  { studentId: "TS003", name: "Rohan Mehta", email: "rohan.mehta@example.com", phone: "9876543212", shift: "fullday", seatNumber: "C007" },
];

export default function StudentListPage() {
  const [students, setStudents] = React.useState<StudentData[]>(placeholderStudents);

  // In a real app, you'd fetch students or manage them via a global state/context.
  // For now, we use placeholder data. If registration adds to a shared list, this page would update.

  return (
    <>
      <PageTitle title="Student List" description="View and manage registered students." />
      <Card>
        <CardHeader>
          <CardTitle>Registered Students</CardTitle>
          <CardDescription>A list of all students currently in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Seat Number</TableHead> {/* New Column */}
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/students/profiles/${student.studentId}`} className="hover:underline text-primary">
                      {student.name}
                    </Link>
                  </TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell className="capitalize">{student.shift}</TableCell>
                  <TableCell>{student.seatNumber || 'N/A'}</TableCell> {/* Display Seat Number */}
                  <TableCell>
                    <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                      <Button variant="outline" size="sm">
                        View <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {students.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No students registered yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
