
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
  CardFooter,
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
import { Input } from '@/components/ui/input';
import { Eye, Edit, Loader2, Users, UserX, UserCheck, Search as SearchIcon, Phone, Mail, MapPin, CalendarDays, CalendarX2 } from 'lucide-react';
import { getAllStudents, getAllAttendanceRecords } from '@/services/student-service';
import type { Student as StudentData } from '@/types/student';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, isValid } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


type StudentWithAttendance = StudentData & {
    lastAttendanceDate?: string;
};

// Component for individual student card on mobile
const StudentCardItem = ({ student, isLeftTable, getStatusBadge }: { student: StudentWithAttendance; isLeftTable?: boolean; getStatusBadge: (s: StudentData) => JSX.Element }) => {
  return (
    <Card className="w-full shadow-md">
       <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={student.studentId} className="border-b-0">
          <AccordionTrigger className="p-4 hover:no-underline">
            <div className="flex items-start justify-between gap-2 w-full">
              <div className="flex-grow min-w-0 text-left">
                <h4 className="text-md font-semibold break-words">{student.name}</h4>
                <p className="text-xs text-muted-foreground break-words">ID: {student.studentId}</p>
              </div>
              <div className="flex-shrink-0">{getStatusBadge(student)}</div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="px-4 pb-4">
              <div className="space-y-1.5 text-xs mb-3 border-t pt-3">
                 <p className="flex items-center"><Phone className="mr-2 h-3 w-3 text-muted-foreground flex-shrink-0" /><span className="font-medium">Phone:</span>&nbsp;<span className="break-all">{student.phone}</span></p>
                 <p className="flex items-center"><Mail className="mr-2 h-3 w-3 text-muted-foreground flex-shrink-0" /><span className="font-medium">Email:</span>&nbsp;<span className="break-all">{student.email || 'N/A'}</span></p>
                 <p className="flex items-start"><MapPin className="mr-2 h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" /><span className="font-medium">Address:</span>&nbsp;<span className="break-words">{student.address || 'N/A'}</span></p>
                 <p><span className="font-medium">Shift:</span> <span className="capitalize">{student.shift}</span></p>
                 <p><span className="font-medium">Seat:</span> {student.seatNumber || 'N/A'}</p>
                {isLeftTable && (
                    <>
                        <p className="flex items-center"><CalendarDays className="mr-2 h-3 w-3 text-muted-foreground" /><span className="font-medium">Last Attended:</span>&nbsp;{student.lastAttendanceDate && isValid(parseISO(student.lastAttendanceDate)) ? format(parseISO(student.lastAttendanceDate), 'PP') : 'Never'}</p>
                        <p className="flex items-center"><CalendarX2 className="mr-2 h-3 w-3 text-muted-foreground" /><span className="font-medium">Date Left:</span>&nbsp;{student.leftDate && isValid(parseISO(student.leftDate)) ? format(parseISO(student.leftDate), 'PP') : 'N/A'}</p>
                    </>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t">
                <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                  <Button variant="outline" size="sm" title="View Profile" className="px-2 sm:px-3">
                    <Eye className="h-4 w-4" /> <span className="hidden sm:inline ml-1">View</span>
                  </Button>
                </Link>
                {isLeftTable ? (
                  <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                    <Button variant="outline" size="sm" title="Re-activate Student" className="px-2 sm:px-3">
                      <UserCheck className="h-4 w-4" /> <span className="hidden sm:inline ml-1">Re-activate</span>
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                    <Button variant="outline" size="sm" title="Edit Student" className="px-2 sm:px-3">
                      <Edit className="h-4 w-4" /> <span className="hidden sm:inline ml-1">Edit</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};


export default function StudentListPage() {
  const [allStudents, setAllStudents] = React.useState<StudentWithAttendance[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    const fetchStudentsAndAttendance = async () => {
      try {
        setIsLoading(true);
        const [students, attendance] = await Promise.all([
            getAllStudents(),
            getAllAttendanceRecords()
        ]);
        
        const lastAttendedMap = new Map<string, string>();
        attendance.forEach(record => {
            const existing = lastAttendedMap.get(record.studentId);
            if (!existing || new Date(record.checkInTime) > new Date(existing)) {
                lastAttendedMap.set(record.studentId, record.checkInTime);
            }
        });
        
        const studentsWithAttendance = students.map(s => ({
            ...s,
            lastAttendanceDate: lastAttendedMap.get(s.studentId)
        }));

        setAllStudents(studentsWithAttendance);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentsAndAttendance();
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
      student.phone.includes(searchTerm)
    );
  }, [allStudents, searchTerm]);

  const activeStudents = filteredStudents.filter(student => student.activityStatus === 'Active').sort((a,b) => a.name.localeCompare(b.name));
  const leftStudents = filteredStudents.filter(student => student.activityStatus === 'Left').sort((a,b) => a.name.localeCompare(b.name));

  const getStatusBadgeForStudent = (student: StudentData) => {
    if (student.activityStatus === 'Left') {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 text-xs px-1.5 py-0.5">Left</Badge>;
    }
    switch (student.feeStatus) {
      case 'Overdue':
        return <Badge variant="destructive" className="text-xs px-1.5 py-0.5">Overdue</Badge>;
      case 'Due':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200 text-xs px-1.5 py-0.5">Due</Badge>;
      case 'Paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200 text-xs px-1.5 py-0.5">Paid</Badge>;
      default:
        return <Badge variant="outline" className="text-xs px-1.5 py-0.5">{student.feeStatus}</Badge>;
    }
  };

  const renderStudentList = (studentsToRender: StudentWithAttendance[], isLeftTable: boolean = false) => (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading students...</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-2">
            {studentsToRender.length > 0 ? (
              studentsToRender.map((student) => (
                <StudentCardItem key={student.studentId} student={student} isLeftTable={isLeftTable} getStatusBadge={getStatusBadgeForStudent} />
              ))
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                {searchTerm.trim() && allStudents.length > 0 ? "No students match your search." : (isLeftTable ? "No students have left." : "No active students found.")}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="whitespace-nowrap">Phone</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Seat</TableHead>
                  {isLeftTable && <TableHead>Last Attended</TableHead>}
                  {isLeftTable && <TableHead>Date Left</TableHead>}
                  {!isLeftTable && <TableHead>Fee Status</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsToRender.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="font-medium">
                      <Link href={`/students/profiles/${student.studentId}`} className="hover:underline text-primary">
                        {student.name}
                      </Link>
                    </TableCell>
                    <TableCell>{student.phone}</TableCell>
                    <TableCell className="capitalize">{student.shift}</TableCell>
                    <TableCell>{student.seatNumber || 'N/A'}</TableCell>
                    {isLeftTable ? (
                        <>
                            <TableCell>{student.lastAttendanceDate && isValid(parseISO(student.lastAttendanceDate)) ? format(parseISO(student.lastAttendanceDate), 'PP') : 'Never'}</TableCell>
                            <TableCell>{student.leftDate && isValid(parseISO(student.leftDate)) ? format(parseISO(student.leftDate), 'PP') : 'N/A'}</TableCell>
                        </>
                    ) : (
                       <TableCell>{getStatusBadgeForStudent(student)}</TableCell>
                    )}
                    <TableCell className="space-x-1 text-right whitespace-nowrap">
                      <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                        <Button variant="outline" size="sm" title="View Profile">
                          <Eye className="h-4 w-4" />
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
                    <TableCell colSpan={isLeftTable ? 7 : 6} className="py-4 text-center text-muted-foreground">
                        {searchTerm.trim() && allStudents.length > 0 ? "No students match your search." : (isLeftTable ? "No students have left." : "No active students found.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </>
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

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
                <Users className="mr-2 h-4 w-4" /> Active ({activeStudents.length})
            </TabsTrigger>
            <TabsTrigger value="left">
                <UserX className="mr-2 h-4 w-4" /> Left ({leftStudents.length})
            </TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
            {renderStudentList(activeStudents, false)}
        </TabsContent>
        <TabsContent value="left" className="mt-4">
            {renderStudentList(leftStudents, true)}
        </TabsContent>
      </Tabs>
    </>
  );
}
