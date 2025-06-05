
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
  CardFooter,
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
import { List, UserCog, Loader2, LogIn, LogOut, Clock, User, Mail, BarChart3, Settings2, Eye } from 'lucide-react';
import { getAllStudents, getAttendanceForDate } from '@/services/student-service';
import type { Student, AttendanceRecord } from '@/types/student';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

// Mobile Card Item for Student List
const StudentAttendanceCardItem = ({ student, onSelectStudent, isSelected }: {
  student: Student;
  onSelectStudent: (student: Student) => void;
  isSelected: boolean;
}) => (
  <Card className={`w-full shadow-md cursor-pointer hover:bg-muted/50 ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`} onClick={() => onSelectStudent(student)}>
    <CardHeader className="pb-2">
      <CardTitle className="text-md break-words">{student.name}</CardTitle>
      <CardDescription className="text-xs break-words">ID: {student.studentId}</CardDescription>
    </CardHeader>
    <CardContent className="text-xs space-y-1 pb-3">
      <p className="flex items-center truncate"><Mail className="mr-2 h-3 w-3 text-muted-foreground" />{student.email || 'N/A'}</p>
      <p><span className="font-medium">Shift:</span> <span className="capitalize">{student.shift}</span></p>
    </CardContent>
    <CardFooter className="py-2 border-t">
      <Button
        variant={isSelected ? "default" : "outline"}
        size="sm"
        className="w-full"
        onClick={(e) => { e.stopPropagation(); onSelectStudent(student); }}
      >
        <Eye className="mr-2 h-4 w-4" /> View Calendar
      </Button>
    </CardFooter>
  </Card>
);


export default function AdminAttendanceOverviewPage() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(true);

  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);

  const [attendanceForDay, setAttendanceForDay] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);

  React.useEffect(() => {
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const students = await getAllStudents();
        setAllStudents(students.filter(s => s.activityStatus === "Active").sort((a,b) => a.name.localeCompare(b.name)));
      } catch (error) {
        toast({
          title: "Error Fetching Students",
          description: "Could not load the list of students.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [toast]);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setDate(new Date()); 
  };

  const fetchAttendanceForSelectedDate = React.useCallback(async () => {
    if (selectedStudent && date) {
      setIsLoadingDetails(true);
      try {
        const records = await getAttendanceForDate(selectedStudent.studentId, format(date, 'yyyy-MM-dd'));
        setAttendanceForDay(records);
      } catch (error) {
        toast({
          title: "Error Fetching Attendance",
          description: `Could not load attendance for ${selectedStudent.name} on the selected date.`,
          variant: "destructive",
        });
        setAttendanceForDay([]);
      } finally {
        setIsLoadingDetails(false);
      }
    } else {
      setAttendanceForDay([]);
    }
  }, [selectedStudent, date, toast]);

  React.useEffect(() => {
    fetchAttendanceForSelectedDate();
  }, [fetchAttendanceForSelectedDate]);

  return (
    <>
      <PageTitle
        title="Student Attendance Overview"
        description="Select a student to view their attendance calendar and daily records."
      />

      <Card className="mb-6 shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5" />Active Students ({allStudents.length})</CardTitle>
          <CardDescription>Click on a student to view their attendance calendar.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStudents ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading students...</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {allStudents.length === 0 ? (
                   <p className="py-4 text-center text-muted-foreground">No active students found.</p>
                ) : (
                  allStudents.map((student) => (
                    <StudentAttendanceCardItem 
                      key={student.studentId} 
                      student={student} 
                      onSelectStudent={handleStudentSelect}
                      isSelected={selectedStudent?.studentId === student.studentId}
                    />
                  ))
                )}
              </div>
              {/* Desktop Table View */}
              <div className="hidden md:block">
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
                    {allStudents.map((student) => (
                      <TableRow
                        key={student.studentId}
                        className={`cursor-pointer hover:bg-muted/50 ${selectedStudent?.studentId === student.studentId ? 'bg-primary/10' : ''}`}
                        onClick={() => handleStudentSelect(student)}
                      >
                        <TableCell>{student.studentId}</TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.email || 'N/A'}</TableCell>
                        <TableCell className="capitalize">{student.shift}</TableCell>
                        <TableCell>
                          <Button
                            variant={selectedStudent?.studentId === student.studentId ? "default" : "outline"}
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleStudentSelect(student); }}
                          >
                            View Calendar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!isLoadingStudents && allStudents.length === 0 && (
                   <p className="py-4 text-center text-muted-foreground">No active students found.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <Card className="shadow-lg w-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCog className="mr-2 h-5 w-5" />
              {selectedStudent.name}'s Attendance ({selectedStudent.studentId})
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
        <Card className="mt-6 shadow-lg w-full">
          <CardHeader>
            <CardTitle>Details for {selectedStudent.name} on {format(date, 'PPP')}</CardTitle>
          </CardHeader>
          <CardContent>
             {isLoadingDetails && (
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading details...
              </div>
            )}
            {!isLoadingDetails && attendanceForDay.length === 0 && (
              <p className="text-muted-foreground">No attendance records found for this day.</p>
            )}
            {!isLoadingDetails && attendanceForDay.length > 0 && (
              <ul className="space-y-3">
                {attendanceForDay.map(record => (
                  <li key={record.recordId} className="p-3 border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                         <LogIn className="mr-2 h-4 w-4 text-green-600" />
                         <span className="font-medium">Checked In:</span>
                      </div>
                      <span className="text-sm">{format(parseISO(record.checkInTime), 'p')}</span>
                    </div>
                    {record.checkOutTime ? (
                       <div className="flex items-center justify-between mt-1">
                         <div className="flex items-center">
                            <LogOut className="mr-2 h-4 w-4 text-red-600" />
                            <span className="font-medium">Checked Out:</span>
                         </div>
                         <span className="text-sm">{format(parseISO(record.checkOutTime), 'p')}</span>
                       </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                         <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                            <span className="font-medium">Status:</span>
                         </div>
                         <span className="text-sm text-yellow-600">Currently Checked In</span>
                       </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
      {!selectedStudent && !isLoadingStudents && (
        <Card className="shadow-lg w-full">
            <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Select a student from the list above to view their attendance calendar.</p>
            </CardContent>
        </Card>
      )}
    </>
  );
}
