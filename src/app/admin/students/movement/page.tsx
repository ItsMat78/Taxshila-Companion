
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
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, UserMinus, Eye, Edit } from 'lucide-react';
import { getAllStudents, getAllAttendanceRecords } from '@/services/student-service';
import type { Student as StudentData } from '@/types/student';
import { format, parseISO, isValid, isWithinInterval, startOfMonth, endOfMonth, subMonths, parse, compareDesc } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';

type StudentWithAttendance = StudentData & {
    lastAttendanceDate?: string;
};

// Component for individual student card (for mobile view)
const StudentMovementCardItem = ({ student, type }: { student: StudentWithAttendance; type: 'new' | 'left' }) => {
  return (
    <Card className="w-full shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={student.profilePictureUrl} alt={student.name} data-ai-hint="profile person"/>
              <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <CardTitle className="text-md break-words">{student.name}</CardTitle>
                <CardDescription className="text-xs break-words">ID: {student.studentId}</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-xs pb-3">
        <p><span className="font-medium">Date {type === 'new' ? 'Registered' : 'Left'}:</span> {type === 'new' ? (student.registrationDate && isValid(parseISO(student.registrationDate)) ? format(parseISO(student.registrationDate), 'PP') : 'N/A') : (student.leftDate && isValid(parseISO(student.leftDate)) ? format(parseISO(student.leftDate), 'PP') : 'N/A')}</p>
        <p><span className="font-medium">Shift:</span> <span className="capitalize">{student.shift}</span></p>
        <p><span className="font-medium">Seat:</span> {student.seatNumber || 'N/A'}</p>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 py-2 border-t">
        <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
          <Button variant="outline" size="sm" title="View Profile">
            <Eye className="h-4 w-4" /> <span className="hidden sm:inline ml-1">View</span>
          </Button>
        </Link>
        <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
          <Button variant="outline" size="sm" title="Edit Student">
            <Edit className="h-4 w-4" /> <span className="hidden sm:inline ml-1">Edit</span>
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};


export default function StudentMovementPage() {
  const [allStudents, setAllStudents] = React.useState<StudentData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedMonth, setSelectedMonth] = React.useState<string>(format(new Date(), 'yyyy-MM'));

  // Generate month options for the dropdown
  const monthOptions = React.useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const month = subMonths(now, i);
      options.push({
        value: format(month, 'yyyy-MM'),
        label: format(month, 'MMMM yyyy'),
      });
    }
    return options;
  }, []);

  React.useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const students = await getAllStudents();
        setAllStudents(students);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const { newRegistrations, studentsWhoLeft, periodLabel } = React.useMemo(() => {
    const periodStart = parse(selectedMonth, 'yyyy-MM', new Date());
    const periodEnd = endOfMonth(periodStart);

    const newRegs = allStudents
      .filter(student => 
        student.registrationDate && isValid(parseISO(student.registrationDate)) && 
        isWithinInterval(parseISO(student.registrationDate), { start: periodStart, end: periodEnd })
      )
      .sort((a, b) => compareDesc(parseISO(a.registrationDate!), parseISO(b.registrationDate!)));

    const whoLeft = allStudents
      .filter(student => 
        student.leftDate && isValid(parseISO(student.leftDate)) &&
        isWithinInterval(parseISO(student.leftDate), { start: periodStart, end: periodEnd })
      )
      .sort((a, b) => compareDesc(parseISO(a.leftDate!), parseISO(b.leftDate!)));

    return {
        newRegistrations: newRegs,
        studentsWhoLeft: whoLeft,
        periodLabel: format(periodStart, 'MMMM yyyy')
    };
  }, [allStudents, selectedMonth]);


  const renderStudentTable = (students: StudentWithAttendance[], type: 'new' | 'left') => (
    <div className="overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>{type === 'new' ? 'Registration Date' : 'Date Left'}</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {students.map((student) => (
                    <TableRow key={student.studentId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border">
                                  <AvatarImage src={student.profilePictureUrl || undefined} alt={student.name} data-ai-hint="profile person"/>
                                  <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  {student.name}
                                  <span className="block text-xs text-muted-foreground">{student.studentId}</span>
                              </div>
                          </div>
                        </TableCell>
                        <TableCell>
                            {type === 'new' ? 
                                (student.registrationDate && isValid(parseISO(student.registrationDate)) ? format(parseISO(student.registrationDate), 'PP') : 'N/A') :
                                (student.leftDate && isValid(parseISO(student.leftDate)) ? format(parseISO(student.leftDate), 'PP') : 'N/A')
                            }
                        </TableCell>
                        <TableCell className="capitalize">{student.shift}</TableCell>
                        <TableCell>{student.seatNumber || 'N/A'}</TableCell>
                        <TableCell className="space-x-1 text-right whitespace-nowrap">
                            <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                                <Button variant="outline" size="sm" title="View Profile">
                                    <Eye className="h-4 w-4" />
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
                        <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                            No students {type === 'new' ? 'registered' : 'left'} in this period.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );

  const renderStudentCards = (students: StudentWithAttendance[], type: 'new' | 'left') => (
    <div className="space-y-3">
        {students.length > 0 ? students.map(student => (
            <StudentMovementCardItem key={student.studentId} student={student} type={type} />
        )) : (
            <p className="py-4 text-center text-muted-foreground">
                No students {type === 'new' ? 'registered' : 'left'} in this period.
            </p>
        )}
    </div>
  );


  return (
    <>
      <PageTitle title="Student Movement Report" description="Track new registrations and students who have left.">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select a month" />
            </SelectTrigger>
            <SelectContent>
                {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
      </PageTitle>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5 text-green-500" />
              New Registrations ({newRegistrations.length})
            </CardTitle>
            <CardDescription>Students who joined in {periodLabel}.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="hidden md:block">{renderStudentTable(newRegistrations, 'new')}</div>
                    <div className="md:hidden">{renderStudentCards(newRegistrations, 'new')}</div>
                </>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserMinus className="mr-2 h-5 w-5 text-red-500" />
              Students Who Left ({studentsWhoLeft.length})
            </CardTitle>
            <CardDescription>Students marked as 'Left' in {periodLabel}.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="hidden md:block">{renderStudentTable(studentsWhoLeft, 'left')}</div>
                    <div className="md:hidden">{renderStudentCards(studentsWhoLeft, 'left')}</div>
                </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    