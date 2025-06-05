
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input'; // Added Input
import { ArrowRight, Edit, Loader2, Users, UserX, UserCheck, Search as SearchIcon } from 'lucide-react'; // Added SearchIcon
import { getAllStudents } from '@/services/student-service';
import type { Student as StudentData } from '@/types/student';

export default function StudentListPage() {
  const [allStudents, setAllStudents] = React.useState<StudentData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const fetchedStudents = await getAllStudents();
        setAllStudents(fetchedStudents);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return allStudents;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return allStudents.filter(student =>
      student.name.toLowerCase().includes(lowercasedFilter) ||
      student.studentId.toLowerCase().includes(lowercasedFilter) ||
      (student.email && student.email.toLowerCase().includes(lowercasedFilter)) ||
      student.phone.includes(searchTerm) // Phone search can be direct
    );
  }, [allStudents, searchTerm]);

  const activeStudents = filteredStudents.filter(student => student.activityStatus === 'Active');
  const leftStudents = filteredStudents.filter(student => student.activityStatus === 'Left');

  const getStatusBadge = (student: StudentData) => {
    if (student.activityStatus === 'Left') {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200">Left</Badge>;
    }
    switch (student.feeStatus) {
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'Due':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200">Due</Badge>;
      case 'Paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200">Paid</Badge>;
      default:
        return <Badge variant="outline">{student.feeStatus}</Badge>;
    }
  };

  const renderStudentTable = (studentsToRender: StudentData[], tableTitle: string, tableDescription: string, icon: React.ReactNode, emptyMessage: string, isLeftTable: boolean = false) => (
    <Card className="mt-6 shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          {icon}
          <span className="ml-2">{tableTitle}</span>
        </CardTitle>
        <CardDescription>{tableDescription}</CardDescription>
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
                <TableHead className="whitespace-nowrap">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="whitespace-nowrap">Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Seat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsToRender.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/students/profiles/${student.studentId}`} className="hover:underline text-primary">
                      {student.name}
                    </Link>
                  </TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>{student.email || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{student.shift}</TableCell>
                  <TableCell>{student.seatNumber || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(student)}</TableCell>
                  <TableCell className="space-x-1 text-right whitespace-nowrap">
                    <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                      <Button variant="outline" size="sm" title="View Profile">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    {isLeftTable ? (
                       <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                        <Button variant="outline" size="sm" title="Re-activate Student">
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                        <Button variant="outline" size="sm" title="Edit Student">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {studentsToRender.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-4 text-center text-muted-foreground">
                    {searchTerm.trim() && allStudents.length > 0 ? "No students match your search." : emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <PageTitle title="Student Management" description="View and manage all registered students.">
        <div className="relative ml-auto flex-1 md:grow-0 w-full sm:w-auto">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg bg-background pl-8 md:w-full lg:w-[336px]"
            />
          </div>
      </PageTitle>

      {renderStudentTable(
        activeStudents,
        "Active Students",
        "A list of all students currently active in the system.",
        <Users className="h-5 w-5" />,
        "No active students found."
      )}

      {renderStudentTable(
        leftStudents,
        "Students Who Have Left",
        "A list of students who are no longer active. Click re-activate icon to manage their details and re-assign a seat.",
        <UserX className="h-5 w-5" />,
        "No students have left the study hall.",
        true // isLeftTable
      )}
    </>
  );
}
