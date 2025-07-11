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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Loader2, UserPlus, UserMinus, Eye, Edit } from 'lucide-react';
import { getAllStudents, getAllAttendanceRecords } from '@/services/student-service';
import type { Student as StudentData } from '@/types/student';
import { format, parseISO, isValid, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';

type StudentWithAttendance = StudentData & {
    lastAttendanceDate?: string;
};

type ViewPeriod = 'currentMonth' | 'previousMonth';

export default function StudentMovementPage() {
  const [allStudents, setAllStudents] = React.useState<StudentData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [viewPeriod, setViewPeriod] = React.useState<ViewPeriod>('currentMonth');

  React.useEffect(() => {
    const fetchStudents = async () => {
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
    fetchStudents();
  }, []);

  const { newRegistrations, studentsWhoLeft, periodLabel } = React.useMemo(() => {
    const now = new Date();
    const periodStart = startOfMonth(viewPeriod === 'currentMonth' ? now : subMonths(now, 1));
    const periodEnd = endOfMonth(viewPeriod === 'currentMonth' ? now : subMonths(now, 1));

    const newRegs = allStudents.filter(student => 
        student.registrationDate && isValid(parseISO(student.registrationDate)) && 
        isWithinInterval(parseISO(student.registrationDate), { start: periodStart, end: periodEnd })
    );

    const whoLeft = allStudents.filter(student => 
        student.leftDate && isValid(parseISO(student.leftDate)) &&
        isWithinInterval(parseISO(student.leftDate), { start: periodStart, end: periodEnd })
    );

    return {
        newRegistrations: newRegs,
        studentsWhoLeft: whoLeft,
        periodLabel: format(periodStart, 'MMMM yyyy')
    };
  }, [allStudents, viewPeriod]);


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
                        <TableCell className="font-medium">{student.name}</TableCell>
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


  return (
    <>
      <PageTitle title="Student Movement Report" description="Track new registrations and students who have left.">
        <ToggleGroup 
            type="single" 
            defaultValue="currentMonth"
            value={viewPeriod}
            onValueChange={(value) => {
                if (value) setViewPeriod(value as ViewPeriod);
            }}
            aria-label="Select period"
        >
            <ToggleGroupItem value="currentMonth" aria-label="Current Month">Current Month</ToggleGroupItem>
            <ToggleGroupItem value="previousMonth" aria-label="Previous Month">Previous Month</ToggleGroupItem>
        </ToggleGroup>
      </PageTitle>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
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
            ) : renderStudentTable(newRegistrations, 'new')}
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
            ) : renderStudentTable(studentsWhoLeft, 'left')}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
