
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from '@/components/ui/alert';
import { Camera, Loader2, XCircle, BarChart3, Clock, LogIn, LogOut, ScanLine, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getActiveCheckIn, addCheckIn, addCheckOut, getAttendanceForDate, getStudentByCustomId, calculateMonthlyStudyHours } from '@/services/student-service';
import type { Student, AttendanceRecord } from '@/types/student';
import { format, parseISO, isValid, differenceInMilliseconds, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeScanType } from 'html5-qrcode';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const QR_SCANNER_ELEMENT_ID_ATTENDANCE = "qr-reader-attendance-page";
const LIBRARY_QR_CODE_PAYLOAD = "TAXSHILA_LIBRARY_CHECKIN_QR_V1";

const chartConfig = {
  hours: {
    label: "Hours Studied",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

// This function will fetch data for the graph. It's inside the component to be self-contained.
async function getDailyStudyDataForMonth(studentId: string, month: Date): Promise<{ date: string; fullDate: string; hours: number }[]> {
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const studyData: { date: string; fullDate: string; hours: number }[] = [];

  for (const day of allDays) {
    const dateString = format(day, 'yyyy-MM-dd');
    try {
      const records = await getAttendanceForDate(studentId, dateString);
      let totalMilliseconds = 0;
      records.forEach(record => {
        if (record.checkInTime && record.checkOutTime && isValid(parseISO(record.checkInTime)) && isValid(parseISO(record.checkOutTime))) {
          totalMilliseconds += differenceInMilliseconds(parseISO(record.checkOutTime), parseISO(record.checkInTime));
        } else if (record.checkInTime && !record.checkOutTime && isValid(parseISO(record.checkInTime))) {
          const checkInTime = parseISO(record.checkInTime);
          const now = new Date();
          const sessionEndDate = new Date(checkInTime);
          sessionEndDate.setHours(21, 30, 0, 0); // Library closes at 9:30 PM
          const calculationEndTime = now > sessionEndDate ? sessionEndDate : now;
          totalMilliseconds += differenceInMilliseconds(calculationEndTime, checkInTime);
        }
      });
      const totalHours = totalMilliseconds / (1000 * 60 * 60);
      studyData.push({
        date: format(day, 'dd'),
        fullDate: dateString,
        hours: totalHours
      });
    } catch (error) {
       console.error(`Failed to fetch attendance for ${dateString}:`, error);
       studyData.push({ date: format(day, 'dd'), fullDate: dateString, hours: 0 }); // Push 0 hours on error
    }
  }
  return studyData;
};

export default function MemberAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const html5QrcodeScannerRef = React.useRef<Html5QrcodeScanner | null>(null);

  const [currentStudent, setCurrentStudent] = React.useState<Student | null>(null);
  const [attendanceForDay, setAttendanceForDay] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [monthlyStudyHours, setMonthlyStudyHours] = React.useState<number | null>(null);
  const [isLoadingStudyHours, setIsLoadingStudyHours] = React.useState(true);
  const [monthlyStudyData, setMonthlyStudyData] = React.useState<{ date: string; fullDate: string; hours: number }[]>([]);
  const [isLoadingMonthlyStudyData, setIsLoadingMonthlyStudyData] = React.useState(true);

  const [activeCheckInRecord, setActiveCheckInRecord] = React.useState<AttendanceRecord | null>(null);
  const [isLoadingActiveCheckIn, setIsLoadingActiveCheckIn] = React.useState(true);
  const [isOverdueDialogOpen, setIsOverdueDialogOpen] = React.useState(false);
  const [viewedMonth, setViewedMonth] = React.useState(new Date());

  const fetchStudentDataAndDependentData = React.useCallback(async () => {
    if (!user) {
        setIsLoadingActiveCheckIn(false);
        setIsLoadingStudyHours(false);
        return;
    };
    
    setIsLoadingActiveCheckIn(true);
    setIsLoadingStudyHours(true);
    try {
      let student = null;
      if (user.studentId) {
        student = await getStudentByCustomId(user.studentId);
      } else if (user.email) {
        student = await getStudentByEmail(user.email);
      }

      setCurrentStudent(student || null);
      if (student) {
        const [activeCheckIn, hours] = await Promise.all([
          getActiveCheckIn(student.studentId),
          calculateMonthlyStudyHours(student.studentId),
        ]);
        setActiveCheckInRecord(activeCheckIn || null);
        setMonthlyStudyHours(hours);
      } else {
        setActiveCheckInRecord(null);
        setMonthlyStudyHours(0);
      }
    } catch (error: any) {
      console.error("Error fetching student data/active check-in (Attendance Page):", error);
    } finally {
      setIsLoadingActiveCheckIn(false);
      setIsLoadingStudyHours(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchStudentDataAndDependentData();
  }, [fetchStudentDataAndDependentData]);

  const fetchGraphData = React.useCallback(async () => {
    if (currentStudent?.studentId) {
      setIsLoadingMonthlyStudyData(true);
      getDailyStudyDataForMonth(currentStudent.studentId, viewedMonth)
        .then(setMonthlyStudyData)
        .finally(() => setIsLoadingMonthlyStudyData(false));
    }
  }, [currentStudent, viewedMonth]);

  React.useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);
  
  const fetchAttendanceForSelectedDate = React.useCallback(async () => {
    if (currentStudent?.studentId && selectedCalendarDate) {
      setIsLoadingDetails(true);
      try {
        const records = await getAttendanceForDate(currentStudent.studentId, format(selectedCalendarDate, 'yyyy-MM-dd'));
        setAttendanceForDay(records);
      } catch (error: any) {
        console.error("Error fetching attendance for date (Attendance Page):", error);
        setAttendanceForDay([]);
      } finally {
        setIsLoadingDetails(false);
      }
    } else {
      setAttendanceForDay([]);
    }
  }, [currentStudent, selectedCalendarDate]);

  React.useEffect(() => {
    fetchAttendanceForSelectedDate();
  }, [fetchAttendanceForSelectedDate]);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isScannerOpen && currentStudent?.studentId && !activeCheckInRecord) {
      timeoutId = setTimeout(() => {
        const scannerElement = document.getElementById(QR_SCANNER_ELEMENT_ID_ATTENDANCE);
        if (!scannerElement) { setIsScannerOpen(false); return; }
        if (html5QrcodeScannerRef.current) {
          html5QrcodeScannerRef.current.clear().catch(err => {}).finally(() => html5QrcodeScannerRef.current = null);
        }
        
        const config = {
          fps: 10,
          qrbox: (w: number, h: number) => ({ width: Math.min(w,h) * 0.7, height: Math.min(w,h) * 0.7 }),
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          rememberLastUsedCamera: true,
          videoConstraints: { facingMode: "environment" },
          verbose: false
        };
        const scanner = new Html5QrcodeScanner(QR_SCANNER_ELEMENT_ID_ATTENDANCE, config);
        html5QrcodeScannerRef.current = scanner;

        const onScanSuccess = async (decodedText: string) => {
          if (isProcessingQr) return;
          setIsProcessingQr(true);
          try { await html5QrcodeScannerRef.current?.pause(true); } catch(e){}
          if (decodedText === LIBRARY_QR_CODE_PAYLOAD) {
            try {
              if (!currentStudent?.studentId) throw new Error("Student ID not found.");
              await addCheckIn(currentStudent.studentId);
              toast({ title: "Checked In!", description: `Successfully checked in at ${new Date().toLocaleTimeString()}.` });
              await fetchStudentDataAndDependentData();
              await fetchAttendanceForSelectedDate();
            } catch (error: any) {
              toast({ title: "Check-in Error", description: error.message || "Failed to process check-in.", variant: "destructive" });
            }
          } else {
            toast({ title: "Invalid QR Code", description: "Please scan the official library QR code.", variant: "destructive" });
            try { if (html5QrcodeScannerRef.current?.getState() === 2) html5QrcodeScannerRef.current.resume(); } catch(e){}
          }
          setIsProcessingQr(false);
          setIsScannerOpen(false);
        };
        const onScanFailure = (error: any) => {
          const msg = (typeof error === 'string' ? error : error?.message || '').toLowerCase();
          if (!msg.includes("no qr code") && (msg.includes("permission denied") || msg.includes("notallowederror"))) {
            setHasCameraPermission(false);
            setIsScannerOpen(false);
          }
        };
        try { scanner.render(onScanSuccess, onScanFailure); setHasCameraPermission(true); } catch (e) { setHasCameraPermission(false); setIsScannerOpen(false); }
      }, 100);
    } else if (!isScannerOpen && html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear().catch(err => {}).finally(() => html5QrcodeScannerRef.current = null);
    }
    return () => { clearTimeout(timeoutId); if (html5QrcodeScannerRef.current) html5QrcodeScannerRef.current.clear().catch(err => {}); };
  }, [isScannerOpen, currentStudent, activeCheckInRecord, fetchStudentDataAndDependentData, fetchAttendanceForSelectedDate, toast]);


  const handleScanCheckInButtonClick = () => {
    if (currentStudent?.feeStatus === 'Overdue') {
      setIsOverdueDialogOpen(true);
      return;
    }
    setHasCameraPermission(null);
    setIsScannerOpen(true);
  };

  const handleCancelScan = () => setIsScannerOpen(false);

  const handleCheckOut = async () => {
    if (!currentStudent?.studentId || !activeCheckInRecord) return;
    setIsProcessingQr(true);
    try {
      await addCheckOut(activeCheckInRecord.recordId);
      toast({ title: "Checked Out!", description: `Successfully checked out at ${new Date().toLocaleTimeString()}.` });
      await fetchStudentDataAndDependentData();
      await fetchAttendanceForSelectedDate();
    } catch (error: any) {
      toast({ title: "Check-out Error", description: error.message || "Failed to process check-out.", variant: "destructive" });
    } finally {
      setIsProcessingQr(false);
    }
  };

  const handlePrevMonth = () => setViewedMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setViewedMonth(prev => addMonths(prev, 1));

  const calculateDailyStudyTime = (records: AttendanceRecord[]) => {
    let totalMilliseconds = 0;
    records.forEach(record => {
      if (record.checkInTime && record.checkOutTime && isValid(parseISO(record.checkInTime)) && isValid(parseISO(record.checkOutTime))) {
        totalMilliseconds += differenceInMilliseconds(parseISO(record.checkOutTime), parseISO(record.checkInTime));
      } else if (record.checkInTime && !record.checkOutTime && isValid(parseISO(record.checkInTime))) {
        const checkInTime = parseISO(record.checkInTime);
        const now = new Date();
        const sessionEndDate = new Date(checkInTime);
        sessionEndDate.setHours(21, 30, 0, 0); // Library closes at 9:30 PM
        const calculationEndTime = now > sessionEndDate ? sessionEndDate : now;
        totalMilliseconds += differenceInMilliseconds(calculationEndTime, checkInTime);
      }
    });
    const totalHours = totalMilliseconds / (1000 * 60 * 60);
    return `${Math.floor(totalHours)} hr ${Math.round((totalHours % 1) * 60)} min`;
  };

  return (
    <>
      <PageTitle title="My Attendance" description="Mark your presence, view your calendar, and track your study hours" />

      <AlertDialog open={isOverdueDialogOpen} onOpenChange={setIsOverdueDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              Fee Payment Overdue
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your fee payment is overdue by more than 5 days. Please pay your outstanding fees at the desk immediately to continue using the services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsOverdueDialogOpen(false)}>Okay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-base sm:text-lg">
              {activeCheckInRecord ? <LogOut className="mr-2 h-5 w-5 text-red-500" /> : <ScanLine className="mr-2 h-5 w-5 text-green-500" />}
              Mark Attendance
            </CardTitle>
            <CardDescription>
              {isLoadingActiveCheckIn ? "Loading session status..." : (activeCheckInRecord ? `You are currently checked in since ${format(parseISO(activeCheckInRecord.checkInTime), 'p')}.` : "Scan the QR code at the library desk to check-in.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActiveCheckIn ? (
              <div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : activeCheckInRecord ? (
              <Button onClick={handleCheckOut} className="w-full" disabled={isProcessingQr || !currentStudent}>
                {isProcessingQr && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Check Out
              </Button>
            ) : isScannerOpen ? (
              <div className="space-y-4">
                 {hasCameraPermission === false && <Alert variant="destructive"><XCircle className="h-4 w-4" /><ShadcnAlertTitle>Camera Access Denied</ShadcnAlertTitle><AlertDescription>Camera access is required. Please enable it in your browser settings.</AlertDescription></Alert>}
                <div id={QR_SCANNER_ELEMENT_ID_ATTENDANCE} className="w-full aspect-square bg-muted rounded-md overflow-hidden border" />
                {(hasCameraPermission === null && !isProcessingQr) && <div className="flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Initializing camera...</div>}
                {isProcessingQr && <p className="text-sm text-muted-foreground text-center">Processing QR code...</p>}
                <Button variant="outline" onClick={handleCancelScan} className="w-full" disabled={isProcessingQr}>Cancel Scan</Button>
              </div>
            ) : (
              <Button onClick={handleScanCheckInButtonClick} className="w-full" disabled={!currentStudent || isScannerOpen}>
                <ScanLine className="mr-2 h-4 w-4" /> Scan QR to Check-In
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-base sm:text-lg"><Clock className="mr-2 h-5 w-5" />Activity Summary</CardTitle>
            <CardDescription>Your study performance for the current month.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStudyHours ? (
              <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="text-4xl font-bold">{monthlyStudyHours !== null ? monthlyStudyHours : 'N/A'}<span className="text-lg font-normal text-muted-foreground"> hours</span></div>
            )}
            <p className="text-sm text-muted-foreground mt-1">Total hours studied this month.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-lg w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex-grow">
              <CardTitle className="flex items-center text-base sm:text-lg"><TrendingUp className="mr-2 h-5 w-5" />Monthly Study Time</CardTitle>
              <CardDescription>Hours studied per day for {format(viewedMonth, 'MMMM yyyy')}.</CardDescription>
            </div>
            <div className="flex items-center space-x-1 self-start sm:self-center">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevMonth} disabled={isLoadingMonthlyStudyData}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium w-24 text-center">{format(viewedMonth, 'MMMM yyyy')}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextMonth} disabled={isLoadingMonthlyStudyData}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[250px] pb-2">
          {isLoadingMonthlyStudyData ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : monthlyStudyData.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStudyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} interval="auto" />
                  <YAxis tickFormatter={(value) => `${Math.round(value as number)}hr`} tickLine={false} tickMargin={10} axisLine={false} width={40} domain={[0, 'dataMax + 1']} />
                  <ChartTooltip cursor={false} content={
                    <ChartTooltipContent formatter={(value, name, item) => {
                      const fullDate = format(parseISO(item.payload.fullDate), 'PP');
                      const hours = Math.floor(value as number);
                      const minutes = Math.round(((value as number) % 1) * 60);
                      return (<div className="flex flex-col"><span className="font-bold">{fullDate}</span><span>{`${hours} hr ${minutes} min`}</span></div>);
                    }}/>
                  } />
                  <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full"><p className="text-center text-muted-foreground">No study data for this month.</p></div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-base sm:text-lg"><BarChart3 className="mr-2 h-5 w-5" />Daily Log</CardTitle>
          <CardDescription>Select a date to view your check-in and check-out times for that day.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-full md:w-auto flex justify-center">
            <Calendar mode="single" selected={selectedCalendarDate} onSelect={setSelectedCalendarDate} className="rounded-md border shadow-inner" disabled={!currentStudent} />
          </div>
          <div className="w-full md:flex-1">
            <h4 className="text-md font-semibold mb-2">Details for {selectedCalendarDate ? format(selectedCalendarDate, 'PPP') : 'selected date'}:</h4>
            {isLoadingDetails ? (
              <div className="flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading details...</div>
            ) : (
              <>
                <div className="mb-4 text-lg font-semibold text-primary">Total study time: {calculateDailyStudyTime(attendanceForDay)}</div>
                {attendanceForDay.length === 0 ? (
                  <p className="text-muted-foreground">No attendance records found for this day.</p>
                ) : (
                  <ul className="space-y-3">
                    {attendanceForDay.map(record => (
                      <li key={record.recordId} className="p-3 border rounded-md bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center"><LogIn className="mr-2 h-4 w-4 text-green-600" /><span className="font-medium">Checked In:</span></div>
                          <span className="text-sm">{record.checkInTime && isValid(parseISO(record.checkInTime)) ? format(parseISO(record.checkInTime), 'p') : 'N/A'}</span>
                        </div>
                        {record.checkOutTime && isValid(parseISO(record.checkOutTime)) ? (
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center"><LogOut className="mr-2 h-4 w-4 text-red-600" /><span className="font-medium">Checked Out:</span></div>
                            <span className="text-sm">{format(parseISO(record.checkOutTime), 'p')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center"><Clock className="mr-2 h-4 w-4 text-yellow-500" /><span className="font-medium">Status:</span></div>
                            <span className="text-sm text-yellow-600">Currently Checked In</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
