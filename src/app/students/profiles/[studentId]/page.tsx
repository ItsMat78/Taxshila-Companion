
"use client";

import * as React from 'react';
import Image from 'next/image'; 
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CreditCard, CalendarDays, Receipt, Loader2, UserCircle, Briefcase, History as HistoryIcon, LogIn, LogOut, Clock, FileText, Download, Mail, Phone, Edit } from 'lucide-react'; // Added Edit
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar"; 
import { getStudentById, getAttendanceForDate } from '@/services/student-service'; 
import type { Student, PaymentRecord, AttendanceRecord } from '@/types/student';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DEFAULT_PROFILE_PLACEHOLDER = "https://placehold.co/100x100.png";
const ID_CARD_PLACEHOLDER = "https://placehold.co/300x200.png?text=ID+Card";

// Mobile Card Item for Payment History
const PaymentHistoryCardItem = ({ payment }: { payment: PaymentRecord }) => (
  <div className="p-3 border rounded-md bg-muted/30 shadow-sm">
    <div className="flex justify-between items-start mb-1">
      <div className="font-medium text-sm">{payment.amount}</div>
      <Badge variant="outline" className="text-xs capitalize">{payment.method}</Badge>
    </div>
    <div className="text-xs text-muted-foreground space-y-1">
      <p>Date: {payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'dd-MMM-yy') : 'N/A'}</p>
      <p>Transaction ID: {payment.transactionId}</p>
    </div>
    <div className="mt-2">
      <Button variant="outline" size="sm" disabled className="w-full">
        <Download className="mr-1 h-3 w-3" /> Invoice
      </Button>
    </div>
  </div>
);


export default function StudentDetailPage() {
  const paramsHook = useParams();
  const studentId = paramsHook.studentId as string;
  const { toast } = useToast();

  const [student, setStudent] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());
  const [dailyAttendanceRecords, setDailyAttendanceRecords] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDailyAttendance, setIsLoadingDailyAttendance] = React.useState(false);

  React.useEffect(() => {
    if (studentId) {
      const fetchStudentData = async () => {
        setIsLoading(true);
        try {
          const fetchedStudent = await getStudentById(studentId);
          setStudent(fetchedStudent || null);
        } catch (error) {
          console.error("Failed to fetch student:", error);
          toast({ title: "Error", description: "Could not load student details.", variant: "destructive" });
          setStudent(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchStudentData();
    }
  }, [studentId, toast]);

  React.useEffect(() => {
    if (studentId && selectedCalendarDate) {
      const fetchDailyData = async () => {
        setIsLoadingDailyAttendance(true);
        setDailyAttendanceRecords([]); 
        try {
          const records = await getAttendanceForDate(studentId, format(selectedCalendarDate, 'yyyy-MM-dd'));
          setDailyAttendanceRecords(records.sort((a,b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime()));
        } catch (error) {
          console.error("Failed to fetch daily attendance records:", error);
          toast({ title: "Error", description: "Could not load attendance for selected date.", variant: "destructive" });
          setDailyAttendanceRecords([]);
        } finally {
          setIsLoadingDailyAttendance(false);
        }
      };
      fetchDailyData();
    }
  }, [studentId, selectedCalendarDate, toast]);


  const getFeeStatusBadge = (studentData: Student) => {
    if (studentData.activityStatus === 'Left') {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">N/A (Left)</Badge>;
    }
    switch (studentData.feeStatus) {
      case 'Overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'Due':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Due</Badge>;
      case 'Paid':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Paid</Badge>;
      default:
        return <Badge variant="outline">{studentData.feeStatus}</Badge>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  }

  if (isLoading && !student) { 
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading student details...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <>
        <PageTitle title="Student Not Found" description={`No student found with ID: ${studentId}`} >
          <Link href="/students/list" passHref legacyBehavior>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Student List
            </Button>
          </Link>
        </PageTitle>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              The student you are looking for does not exist or could not be loaded.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageTitle title={`Student Profile: ${student.name}`} description={`Details for student ID: ${studentId}`} >
        <div className="flex items-center space-x-2">
          <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Student
            </Button>
          </Link>
          <Link href="/students/list" passHref legacyBehavior>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Student List
            </Button>
          </Link>
        </div>
      </PageTitle>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="shadow-md xl:col-span-1">
          <CardHeader className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-24 w-24 border-2 border-primary shadow-md">
              <AvatarImage src={student.profilePictureUrl || DEFAULT_PROFILE_PLACEHOLDER} alt={student.name} data-ai-hint="profile person"/>
              <AvatarFallback className="text-3xl">{getInitials(student.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-xl">{student.name}</CardTitle>
              <CardDescription>Student ID: {student.studentId}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 text-sm">
            <div className="flex items-center">
              <Mail className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium break-words">{student.email || 'N/A'}</p>
              </div>
            </div>
             <div className="flex items-center">
              <Phone className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium break-words">{student.phone}</p>
              </div>
            </div>
            <p><strong>Shift:</strong> <span className="capitalize">{student.shift}</span></p>
            <p><strong>Seat Number:</strong> {student.seatNumber || 'N/A'}</p>
            <p><strong>Registered:</strong> {student.registrationDate ? format(parseISO(student.registrationDate), 'PP') : 'N/A'}</p>
            <div className="flex items-center">
              <strong>Activity:</strong>
              <Badge
                  variant={student.activityStatus === "Active" ? "default" : "secondary"}
                  className={cn("ml-2", student.activityStatus === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")}
              >
                  {student.activityStatus}
              </Badge>
            </div>
            {student.idCardFileName && (
                <div className="pt-2">
                    <p className="text-sm font-medium">ID Card:</p>
                    <div className="mt-1 p-2 border rounded-md bg-muted/50">
                        <Image src={ID_CARD_PLACEHOLDER} alt="ID Card Preview" width={150} height={100} className="rounded-md max-w-full object-contain" data-ai-hint="document id card" />
                        <p className="text-xs text-muted-foreground pt-1">{student.idCardFileName} (Preview)</p>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Fee Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p><strong>Status:</strong> {getFeeStatusBadge(student)}</p>
            <p><strong>Amount Due:</strong> {student.activityStatus === 'Left' ? 'N/A' : (student.amountDue || "₹0")}</p>
            <p><strong>Last Paid On:</strong> {student.activityStatus === 'Left' ? 'N/A' : (student.lastPaymentDate && isValid(parseISO(student.lastPaymentDate)) ? format(parseISO(student.lastPaymentDate), 'PP') : 'N/A')}</p>
            <p><strong>Next Due Date:</strong> {student.activityStatus === 'Left' ? 'N/A' : (student.nextDueDate && isValid(parseISO(student.nextDueDate)) ? format(parseISO(student.nextDueDate), 'PP') : 'N/A')}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <HistoryIcon className="mr-2 h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>Record of payments.</CardDescription>
          </CardHeader>
          <CardContent>
            {(student.paymentHistory && student.paymentHistory.length > 0) ? (
              <>
                {/* Mobile Card View for Payment History */}
                <div className="md:hidden space-y-3 max-h-60 overflow-y-auto">
                  {student.paymentHistory.slice().reverse().map((payment: PaymentRecord) => (
                    <PaymentHistoryCardItem key={payment.paymentId} payment={payment} />
                  ))}
                </div>

                {/* Desktop Table View for Payment History */}
                <div className="hidden md:block max-h-60 w-full overflow-y-auto overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">Amount</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">Method</TableHead>
                        <TableHead className="text-xs whitespace-nowrap">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.paymentHistory.slice().reverse().map((payment: PaymentRecord) => (
                        <TableRow key={payment.paymentId}>
                          <TableCell className="text-xs whitespace-nowrap">{payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'dd-MMM-yy') : 'N/A'}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{payment.amount}</TableCell>
                          <TableCell className="text-xs capitalize whitespace-nowrap">{payment.method}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            <Button variant="outline" size="sm" disabled>
                              <Download className="mr-1 h-3 w-3" /> Invoice
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-4">No payment history found.</p>
            )}
          </CardContent>
        </Card>
      </div>
      

      <Card className="mt-6 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="mr-2 h-5 w-5" />
            Attendance Overview
          </CardTitle>
          <CardDescription>
            Monthly attendance for {student.name}. Select a date to view details.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-stretch gap-6">
          <div className="w-full flex justify-center">
            <Calendar
              mode="single"
              selected={selectedCalendarDate}
              onSelect={setSelectedCalendarDate}
              className="rounded-md border shadow-inner min-w-[280px] sm:min-w-[320px] max-w-md"
              modifiers={{ today: new Date() }}
              modifiersStyles={{ today: { color: 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } }}
            />
          </div>
          <div className="w-full">
            <h4 className="text-md font-semibold mb-2">
              Details for {selectedCalendarDate ? format(selectedCalendarDate, 'PPP') : 'selected date'}:
            </h4>
            {isLoadingDailyAttendance ? (
              <div className="flex items-center justify-center text-muted-foreground py-4">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading details...
              </div>
            ) : dailyAttendanceRecords.length === 0 ? (
              <p className="text-muted-foreground py-4">No attendance records found for this day.</p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto">
                {dailyAttendanceRecords.map(record => (
                  <li key={record.recordId} className="p-3 border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                         <LogIn className="mr-2 h-4 w-4 text-green-600" />
                         <span className="font-medium">Checked In:</span>
                      </div>
                      <span className="text-sm">
                        {record.checkInTime && isValid(parseISO(record.checkInTime)) ? format(parseISO(record.checkInTime), 'p') : 'N/A'}
                      </span>
                    </div>
                    {record.checkOutTime ? (
                       <div className="flex items-center justify-between mt-1">
                         <div className="flex items-center">
                            <LogOut className="mr-2 h-4 w-4 text-red-600" />
                            <span className="font-medium">Checked Out:</span>
                         </div>
                         <span className="text-sm">
                           {isValid(parseISO(record.checkOutTime)) ? format(parseISO(record.checkOutTime), 'p') : 'N/A'}
                          </span>
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
          </div>
        </CardContent>
      </Card>
    </>
  );
}
