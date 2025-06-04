
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
import { ArrowRight, Edit, Loader2 } from 'lucide-react'; // Added Edit icon and Loader2
import { getAllStudents } from '@/services/student-service';
import type { Student as StudentData } from '@/types/student'; // Renamed for consistency with existing component

export default function StudentListPage() {
  const [students, setStudents] = React.useState<StudentData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const fetchedStudents = await getAllStudents();
        setStudents(fetchedStudents);
      } catch (error) {
        console.error("Failed to fetch students:", error);
        // Optionally, set an error state and display an error message
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  return (
    <>
      <PageTitle title="Student List" description="View and manage registered students." />
      <Card>
        <CardHeader>
          <CardTitle>Registered Students</CardTitle>
          <CardDescription>A list of all students currently in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading students...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Seat Number</TableHead>
                  <TableHead>Actions</TableHead>
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
                    <TableCell>{student.email || 'N/A'}</TableCell>
                    <TableCell className="capitalize">{student.shift}</TableCell>
                    <TableCell>{student.seatNumber || 'N/A'}</TableCell>
                    <TableCell className="space-x-2">
                      <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                        <Button variant="outline" size="sm" title="View Profile">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                        <Button variant="outline" size="sm" title="Edit Student">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-4 text-center text-muted-foreground">
                      No students registered yet.
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
