
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { List, UserCog } from 'lucide-react'; // Changed icon for admin view

// Placeholder type for student data
type StudentData = {
  studentId: string;
  name: string;
  email: string;
  shift: "morning" | "evening" | "fullday";
  seatNumber?: string;
};

// Placeholder data for existing students
const placeholderStudents: StudentData[] = [
  { studentId: "TS001", name: "Aarav Sharma", email: "aarav.sharma@example.com", shift: "morning", seatNumber: "A101" },
  { studentId: "TS002", name: "Priya Patel", email: "priya.patel@example.com", shift: "evening", seatNumber: "B203" },
  { studentId: "TS003", name: "Rohan Mehta", email: "rohan.mehta@example.com", shift: "fullday", seatNumber: "C007" },
];


export default function AdminAttendanceOverviewPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [selectedStudent, setSelectedStudent] = React.useState<StudentData | null>(null);

  const handleStudentSelect = (student: StudentData) => {
    setSelectedStudent(student);
    setDate(new Date()); 
  };

  return (
    <>
      <PageTitle 
        title="Student Attendance Overview"
        description="Select a student to view their attendance calendar." 
      />
      
      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5" />Registered Students</CardTitle>
          <CardDescription>Click on a student to view their attendance calendar. This view is for administrators.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placeholderStudents.map((student) => (
                <TableRow key={student.studentId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleStudentSelect(student)}>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell className="capitalize">{student.shift}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleStudentSelect(student); }}>
                      View Calendar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {placeholderStudents.length === 0 && (
            <p className="py-4 text-center text-muted-foreground">No students registered yet.</p>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCog className="mr-2 h-5 w-5" />
              {selectedStudent.name}'s Attendance
            </CardTitle>
            <CardDescription>Monthly overview for {selectedStudent.name}. Select a date to view details.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow-inner"
              modifiers={{ today: new Date() }}
              modifiersStyles={{ today: { color: 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } }}
            />
          </CardContent>
        </Card>
      )}
      {selectedStudent && date && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle>Details for {selectedStudent.name} on {date.toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No specific attendance records for {selectedStudent.name} on this day (placeholder).
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
