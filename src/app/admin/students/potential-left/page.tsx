
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, UserX, UserCheck, Edit, Eye, CalendarClock } from 'lucide-react';
import { getAllStudents, getAllAttendanceRecords } from '@/services/student-service';
import type { Student } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';

interface PotentialLeftStudent extends Student {
  daysSinceLastAttended?: number | null;
}

const PotentialLeftCardItem = ({ student }: { student: PotentialLeftStudent }) => {
  return (
    <Card className="w-full shadow-md border-orange-500/20 bg-orange-500/5">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-md break-words">{student.name}</CardTitle>
          {student.daysSinceLastAttended !== undefined && student.daysSinceLastAttended !== null && (
            <div className="text-sm font-bold text-orange-600">{student.daysSinceLastAttended} days absent</div>
          )}
        </div>
        <CardDescription className="text-xs break-words">ID: {student.studentId}</CardDescription>
      </CardHeader>
      <CardContent className="text-xs space-y-1 pb-3">
        <p><span className="font-medium">Shift:</span> <span className="capitalize">{student.shift}</span></p>
        <p><span className="font-medium">Seat:</span> {student.seatNumber || 'N/A'}</p>
        <p><span className="font-medium">Last Attended:</span> {student.lastAttendanceDate && isValid(parseISO(student.lastAttendanceDate)) ? format(parseISO(student.lastAttendanceDate), 'PPP') : 'Never'}</p>
        <p><span className="font-medium">Next Due Date:</span> {student.nextDueDate && isValid(parseISO(student.nextDueDate)) ? format(parseISO(student.nextDueDate), 'PPP') : 'N/A'}</p>
      </CardContent>
      <CardFooter className="py-3 border-t flex justify-end gap-2">
         <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
          <Button variant="outline" size="sm" title="View Profile" className="px-2 sm:px-3">
            <Eye className="h-4 w-4" /> <span className="hidden sm:inline ml-1">View</span>
          </Button>
        </Link>
        <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
            <Button variant="outline" size="sm" title="Edit Student" className="px-2 sm:px-3">
              <Edit className="h-4 w-4" /> <span className="hidden sm:inline ml-1">Edit / Mark Left</span>
            </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default function PotentialLeftPage() {
  const { toast } = useToast();
  const [potentialLeftStudents, setPotentialLeftStudents] = React.useState<PotentialLeftStudent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const [allStudents, allAttendance] = await Promise.all([
          getAllStudents(),
          getAllAttendanceRecords(),
        ]);

        const lastAttendedMap = new Map<string, string>();
        allAttendance.forEach(record => {
          const existing = lastAttendedMap.get(record.studentId);
          if (!existing || new Date(record.checkInTime) > new Date(existing)) {
            lastAttendedMap.set(record.studentId, record.checkInTime);
          }
        });
        
        const today = new Date();

        const filteredStudents = allStudents
          .map((student): PotentialLeftStudent => {
            const lastAttendanceDate = lastAttendedMap.get(student.studentId);
            let daysSinceLastAttended: number | null = null;
            let referenceDate: string | undefined = lastAttendanceDate || student.registrationDate;

            if(referenceDate && isValid(parseISO(referenceDate))) {
                daysSinceLastAttended = differenceInDays(today, parseISO(referenceDate));
            }

            return {
              ...student,
              lastAttendanceDate: lastAttendanceDate,
              daysSinceLastAttended: daysSinceLastAttended
            };
          })
          .filter(student => {
            if (student.activityStatus !== "Active") {
              return false;
            }
            // Use the pre-calculated days
            return student.daysSinceLastAttended !== null && student.daysSinceLastAttended > 5;
          });

        filteredStudents.sort((a, b) => {
           const dateA = a.lastAttendanceDate ? parseISO(a.lastAttendanceDate).getTime() : 0;
           const dateB = b.lastAttendanceDate ? parseISO(b.lastAttendanceDate).getTime() : 0;
           return dateA - dateB; // Oldest attendance first
        });
        
        setPotentialLeftStudents(filteredStudents);
      } catch (error) {
        console.error("Failed to fetch students for potential left list:", error);
        toast({ title: "Error", description: "Could not load student list.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, [toast]);

  return (
    <>
      <PageTitle title="Potentially Left Students" description="Active students who have not attended in more than 5 days." />

      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserX className="mr-2 h-5 w-5 text-orange-500" />
            Inactive Student List ({potentialLeftStudents.length})
          </CardTitle>
          <CardDescription>Review this list to mark students as 'Left' and free up their seats if necessary.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Analyzing attendance data...</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {potentialLeftStudents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                     <UserCheck className="mx-auto mb-2 h-10 w-10 text-green-500" />
                    All active students have attended recently.
                  </div>
                ) : (
                  potentialLeftStudents.map((student) => (
                    <PotentialLeftCardItem key={student.studentId} student={student} />
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Last Attended</TableHead>
                      <TableHead>Days Absent</TableHead>
                      <TableHead>Next Due Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Seat</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {potentialLeftStudents.map((student) => (
                      <TableRow key={student.studentId}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {student.lastAttendanceDate && isValid(parseISO(student.lastAttendanceDate))
                            ? format(parseISO(student.lastAttendanceDate), 'PP')
                            : 'Never'}
                        </TableCell>
                         <TableCell className="font-semibold text-orange-600">
                          {student.daysSinceLastAttended ?? 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {student.nextDueDate && isValid(parseISO(student.nextDueDate)) ? format(parseISO(student.nextDueDate), 'PP') : 'N/A'}
                        </TableCell>
                         <TableCell className="capitalize">{student.shift}</TableCell>
                        <TableCell>{student.seatNumber || 'N/A'}</TableCell>
                        <TableCell className="text-right space-x-2">
                           <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                              <Button variant="outline" size="sm">
                                  <Eye className="mr-1 h-3 w-3" /> View
                              </Button>
                           </Link>
                           <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                              <Button variant="outline" size="sm">
                                  <Edit className="mr-1 h-3 w-3" /> Manage
                              </Button>
                           </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {potentialLeftStudents.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          <UserCheck className="mx-auto mb-2 h-10 w-10 text-green-500" />
                          All active students have attended recently.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
