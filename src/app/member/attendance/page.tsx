
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Loader2, XCircle, BarChart3, Clock, LogIn, LogOut, ScanLine, CheckCircle, TrendingUp, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getActiveCheckIn, addCheckIn, addCheckOut, getAttendanceForDate, calculateMonthlyStudyHours, getStudentByCustomId } from '@/services/student-service';
import type { Student, AttendanceRecord } from '@/types/student';
import { format, parseISO, isValid, differenceInMilliseconds, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getMonth, getYear } from 'date-fns';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeScanType } from 'html5-qrcode';
import { BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Bar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const studyChartConfig = {
  hours: {
    label: "Hours",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;


const QR_SCANNER_ELEMENT_ID_ATTENDANCE = "qr-reader-attendance-page";
const LIBRARY_QR_CODE_PAYLOAD = "TAXSHILA_LIBRARY_CHECKIN_QR_V1";

export default function MemberAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const html5QrcodeScannerRef = React.useRef<Html5QrcodeScanner | null>(null);

  const [currentStudent, setCurrentStudent] = React.useState<Student | null>(null);
  const [attendanceForDay, setAttendanceForDay] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [monthlyStudyHours, setMonthlyStudyHours] = React.useState<number | null>(null);
  const [isLoadingStudyHours, setIsLoadingStudyHours] = React.useState(true);
  const [activeCheckInRecord, setActiveCheckInRecord] = React.useState<AttendanceRecord | null>(null);
  const [isLoadingActiveCheckIn, setIsLoadingActiveCheckIn] = React.useState(true);
  const [monthlyStudyData, setMonthlyStudyData] = React.useState<{ date: string; hours: number }[]>([]);
  const [isLoadingMonthlyStudyData, setIsLoadingMonthlyStudyData] = React.useState(true);
  const [isOverdueDialogOpen, setIsOverdueDialogOpen] = React.useState(false);

    const [viewedMonth, setViewedMonth] = React.useState(new Date()); // new state variable

    const handlePrevMonth = () => {
        setViewedMonth((prev) => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setViewedMonth((prev) => addMonths(prev, 1));
    };


  const fetchStudentDataAndActiveCheckIn = React.useCallback(async () => {
    if (user?.studentId || user?.email) {
      setIsLoadingStudyHours(true);
      setIsLoadingActiveCheckIn(true);
      try {
        let student = null;
        if (user.studentId) {
          student = await getStudentByCustomId(user.studentId);
        } else if (user.email) {
          student = await getStudentByEmail(user.email);
        }

        if (student) {
          setCurrentStudent(student);
          const [hours, activeCheckIn] = await Promise.all([
            calculateMonthlyStudyHours(student.studentId),
            getActiveCheckIn(student.studentId)
          ]);
          setMonthlyStudyHours(hours);
          setActiveCheckInRecord(activeCheckIn || null);
        } else {
          toast({
            title: "Student Record Not Found",
            description: "Could not find a student record associated with your email.",
            variant: "destructive",
          });
          setCurrentStudent(null);
          setMonthlyStudyHours(0);
          setActiveCheckInRecord(null);
        }
      } catch (error: any) {
        console.error("Error fetching student data/active check-in (Attendance Page):", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch student details or session status.",
          variant: "destructive",
        });
        setCurrentStudent(null);
        setMonthlyStudyHours(0);
        setActiveCheckInRecord(null);
      } finally {
        setIsLoadingStudyHours(false);
        setIsLoadingActiveCheckIn(false);
      }
    } else {
      setIsLoadingStudyHours(false);
      setIsLoadingActiveCheckIn(false);
      setCurrentStudent(null);
      setActiveCheckInRecord(null);
    }
  }, [user, toast]);

  React.useEffect(() => {
    fetchStudentDataAndActiveCheckIn();
  }, [fetchStudentDataAndActiveCheckIn]);

    const getDailyStudyDataForMonth = React.useCallback(async (studentId: string, month: Date) => {
        setIsLoadingMonthlyStudyData(true);
        try {
            const startDate = startOfMonth(month);
            const endDate = endOfMonth(month);
            const allDays = eachDayOfInterval({ start: startDate, end: endDate });
            const studyData: { date: string; hours: number }[] = [];

            for (const day of allDays) {
                const dateString = format(day, 'yyyy-MM-dd');
                const records = await getAttendanceForDate(studentId, dateString);
                let totalMilliseconds = 0;
                records.forEach(record => {
                    if (record.checkInTime && record.checkOutTime && isValid(parseISO(record.checkInTime)) && isValid(parseISO(record.checkOutTime))) {
                        totalMilliseconds += differenceInMilliseconds(parseISO(record.checkOutTime), parseISO(record.checkInTime));
                    } else if (record.checkInTime && !record.checkOutTime && isValid(parseISO(record.checkInTime))) {
                        const checkInTime = parseISO(record.checkInTime);
                        const endTime = new Date(checkInTime);
                        endTime.setHours(21, 30, 0, 0);

                        const now = new Date();
                        const calculationEndTime = endTime > now ? now : endTime;

                        totalMilliseconds += differenceInMilliseconds(calculationEndTime, checkInTime);
                    }
                });
                const totalHours = totalMilliseconds / (1000 * 60 * 60);
                studyData.push({ date: dateString, hours: totalHours });
            }
            setMonthlyStudyData(studyData);
        } catch (error) {
            console.error("Error fetching daily study data:", error);
        } finally {
            setIsLoadingMonthlyStudyData(false);
        }
    }, []);

  React.useEffect(() => {
    if (currentStudent?.studentId) {
      getDailyStudyDataForMonth(currentStudent.studentId, viewedMonth);
    }
  }, [currentStudent, viewedMonth, getDailyStudyDataForMonth]);

  const calculateDailyStudyTime = (records: AttendanceRecord[]) => {
    let totalMilliseconds = 0;
    records.forEach(record => {
      if (record.checkInTime && record.checkOutTime && isValid(parseISO(record.checkInTime)) && isValid(parseISO(record.checkOutTime))) {
        totalMilliseconds += differenceInMilliseconds(parseISO(record.checkOutTime), parseISO(record.checkInTime));
      } else if (record.checkInTime && !record.checkOutTime && isValid(parseISO(record.checkInTime))) {
        const checkInTime = parseISO(record.checkInTime);
        const endTime = new Date(checkInTime); // Create a new date based on check-in time
        endTime.setHours(21, 30, 0, 0); // Set time to 9:30 PM

        const now = new Date();
        const calculationEndTime = endTime > now ? now : endTime; // Use now or 9:30 PM, whichever is earlier

        totalMilliseconds += differenceInMilliseconds(calculationEndTime, checkInTime);
      }
    });

    const totalHours = totalMilliseconds / (1000 * 60 * 60);
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    return { hours, minutes };
  };

  const fetchAttendanceForSelectedDate = React.useCallback(async () => {
    if (currentStudent?.studentId && date) {
      setIsLoadingDetails(true);
      try {
        const records = await getAttendanceForDate(currentStudent.studentId, format(date, 'yyyy-MM-dd'));
        setAttendanceForDay(records);
      } catch (error: any) {
        console.error("Error fetching attendance for date (Attendance Page):", error);
        toast({
          title: "Error Fetching Attendance",
          description: error.message || "Could not load attendance for the selected date.",
          variant: "destructive",
        });
        setAttendanceForDay([]);
      } finally {
        setIsLoadingDetails(false);
      }
    } else {
      setAttendanceForDay([]);
    }
  }, [currentStudent, date, toast]);

  React.useEffect(() => {
    fetchAttendanceForSelectedDate();
  }, [fetchAttendanceForSelectedDate]);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isScannerOpen && currentStudent?.studentId && !activeCheckInRecord) {
      timeoutId = setTimeout(() => {
        const scannerElement = document.getElementById(QR_SCANNER_ELEMENT_ID_ATTENDANCE);
        if (!scannerElement) {
          console.warn("Attendance page QR scanner element not found after delay.");
          toast({variant: 'destructive', title: "Scanner Error", description: "Could not initialize QR scanner display. Please try again."});
          setIsScannerOpen(false);
          return;
        }

        if (html5QrcodeScannerRef.current) {
          html5QrcodeScannerRef.current.clear()
            .catch(clearError => console.error("Error clearing previous scanner instance (Attendance Page):", clearError))
            .finally(() => html5QrcodeScannerRef.current = null);
        }
        
        const formatsToSupport = [ Html5QrcodeSupportedFormats.QR_CODE ];
        const config = {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const edgePercentage = 0.7;
              const edgeLength = Math.min(viewfinderWidth, viewfinderHeight) * edgePercentage;
              return { width: edgeLength, height: edgeLength };
          },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          formatsToSupport: formatsToSupport,
          rememberLastUsedCamera: true,
          videoConstraints: { 
            facingMode: "environment" 
          },
          verbose: false
        };

        const scanner = new Html5QrcodeScanner( QR_SCANNER_ELEMENT_ID_ATTENDANCE, config );
        html5QrcodeScannerRef.current = scanner;

        const onScanSuccess = async (decodedText: string, decodedResult: any) => {
          if (isProcessingQr) return;
          setIsProcessingQr(true);
          if (html5QrcodeScannerRef.current) {
              try { await html5QrcodeScannerRef.current.pause(true); } 
              catch(e){ console.warn("Scanner pause error", e)}
          }
          
          if (decodedText === LIBRARY_QR_CODE_PAYLOAD) {
            try {
              if (!currentStudent?.studentId) throw new Error("Student ID not found.");
              await addCheckIn(currentStudent.studentId);
              toast({
                title: "Checked In!",
                description: `Successfully checked in at ${new Date().toLocaleTimeString()}.`,
              });
              await fetchStudentDataAndActiveCheckIn();
              await fetchAttendanceForSelectedDate();
            } catch (error: any) {
              console.error("Detailed error during check-in processing (Attendance Page):", error);
              toast({ title: "Check-in Error", description: error.message || "Failed to process check-in. Please try again.", variant: "destructive" });
            }
          } else {
            toast({
              title: "Invalid QR Code", description: "Please scan the official library QR code.", variant: "destructive" });
             setTimeout(() => {
               if (html5QrcodeScannerRef.current ) {
                  try {
                    if (html5QrcodeScannerRef.current.getState() === 2 /* PAUSED */) { 
                       html5QrcodeScannerRef.current.resume();
                    }
                  } catch(e) { console.warn("Scanner resume error", e)}
              }
            }, 1000);
          }
          setIsProcessingQr(false);
          setIsScannerOpen(false);
        };

        const onScanFailure = (errorPayload: any) => {
          let errorMessage = typeof errorPayload === 'string' ? errorPayload : (errorPayload?.message || JSON.stringify(errorPayload));
          const errorMsgLower = errorMessage.toLowerCase();

          if (errorMsgLower.includes("permission denied") ||
              errorMsgLower.includes("notallowederror") ||
              errorMsgLower.includes("notfounderror") ||
              errorMsgLower.includes("aborterror")) {
            if (!errorMsgLower.includes("no qr code")) {
              setHasCameraPermission(false);
              toast({
                variant: 'destructive',
                title: 'Camera Access Denied or Not Found',
                description: 'Please enable camera permissions and ensure a camera is connected.',
              });
              setIsScannerOpen(false);
            }
          } else if (!errorMsgLower.includes("no qr code")) {
            // console.warn("QR Scan Failure (Attendance Page, non-critical):", errorMessage, errorPayload);
          }
        };
        
        try {
          scanner.render(onScanSuccess, onScanFailure);
          setHasCameraPermission(true); 
        } catch (renderError: any) {
          console.error("Error rendering scanner (Attendance Page):", renderError);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Scanner Initialization Error',
            description: renderError.message || 'Could not start the QR scanner. Ensure camera permissions are enabled and try again.',
          });
          setIsScannerOpen(false);
        }
      }, 100); 

    } else if (!isScannerOpen && html5QrcodeScannerRef.current) {
      if (html5QrcodeScannerRef.current && typeof html5QrcodeScannerRef.current.clear === 'function') {
        html5QrcodeScannerRef.current.clear()
          .catch(err => console.error("Error clearing scanner (Attendance Page on close):", err))
          .finally(() => html5QrcodeScannerRef.current = null);
      } else {
        html5QrcodeScannerRef.current = null;
      }
    }

    return () => {
      clearTimeout(timeoutId);
      if (html5QrcodeScannerRef.current && typeof html5QrcodeScannerRef.current.clear === 'function') {
        html5QrcodeScannerRef.current.clear()
          .catch((err) => console.error("Cleanup: Error clearing scanner (Attendance Page):", err))
          .finally(() => html5QrcodeScannerRef.current = null);
      } else {
        html5QrcodeScannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScannerOpen, currentStudent, activeCheckInRecord, toast, fetchStudentDataAndActiveCheckIn, fetchAttendanceForSelectedDate]);


  const handleScanCheckInButtonClick = () => {
    if (currentStudent?.feeStatus === 'Overdue') {
      setIsOverdueDialogOpen(true);
      return;
    }
    setHasCameraPermission(null);
    setIsScannerOpen(true);
  };

  const handleCancelScan = () => {
    setIsScannerOpen(false);
  };

  const handleCheckOut = async () => {
    if (!currentStudent?.studentId || !activeCheckInRecord) {
      toast({ title: "Error", description: "Cannot check out. Active session not found.", variant: "destructive" });
      return;
    }
    setIsProcessingQr(true);
    try {
      await addCheckOut(activeCheckInRecord.recordId);
      toast({
        title: "Checked Out!",
        description: `Successfully checked out at ${new Date().toLocaleTimeString()}.`,
      });
      await fetchStudentDataAndActiveCheckIn();
      await fetchAttendanceForSelectedDate();
    } catch (error: any) {
      console.error("Error during check-out (Attendance Page):", error);
      toast({ title: "Check-out Error", description: error.message || "Failed to process check-out. Please try again.", variant: "destructive" });
    } finally {
      setIsProcessingQr(false);
    }
  };


  return (
    <>
      <PageTitle
        title="My Attendance"
        description="Mark your presence, view your calendar, and track your study hours"
      />

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
              {isLoadingActiveCheckIn ? "Loading session status..." :
                (activeCheckInRecord
                  ? `You are currently checked in since ${format(parseISO(activeCheckInRecord.checkInTime), 'p')}.`
                  : "Scan the QR code at the library desk to check-in.")
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActiveCheckIn ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : activeCheckInRecord ? (
              <Button onClick={handleCheckOut} className="w-full" disabled={isProcessingQr || !currentStudent}>
                {isProcessingQr && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check Out
              </Button>
            ) : isScannerOpen ? (
              <div className="space-y-4">
                 {hasCameraPermission === false && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Camera access is required. Please enable it in your browser settings.
                    </AlertDescription>
                  </Alert>
                )}
                <div id={QR_SCANNER_ELEMENT_ID_ATTENDANCE} className="w-full aspect-square bg-muted rounded-md overflow-hidden border" />
                {(hasCameraPermission === null && !isProcessingQr) && (
                     <div className="flex items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initializing camera...
                    </div>
                )}
                {isProcessingQr && <p className="text-sm text-muted-foreground text-center">Processing QR code...</p>}
                <Button variant="outline" onClick={handleCancelScan} className="w-full" disabled={isProcessingQr}>
                  Cancel Scan
                </Button>
              </div>
            ) : (
              <Button onClick={handleScanCheckInButtonClick} className="w-full" disabled={!currentStudent || isScannerOpen}>
                <ScanLine className="mr-2 h-4 w-4" /> Scan QR to Check-In
              </Button>
            )}
            {!currentStudent && !user && (
                 <p className="text-xs text-muted-foreground mt-2 text-center">Loading user details...</p>
            )}
             {!currentStudent && user && !isLoadingActiveCheckIn && (
                 <p className="text-xs text-destructive mt-2 text-center">Could not link your email to a student record. Please contact admin.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Clock className="mr-2 h-5 w-5" />
              Activity Summary
            </CardTitle>
            <CardDescription>Your study performance this month.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStudyHours ? (
                <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="text-4xl font-bold">
                    {monthlyStudyHours !== null ? monthlyStudyHours : 'N/A'}
                    <span className="text-lg font-normal text-muted-foreground"> hours</span>
                </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
                Total hours studied this month.
            </p>
          </CardContent>
        </Card>
      </div>
                 <Card className="mt-6 shadow-lg w-full">
                <CardHeader>
                    <div className="flex items-center justify-between w-full">
                        <CardTitle className="flex items-center text-base sm:text-lg">
                            <TrendingUp className="mr-2 h-5 w-5" />
                            Monthly Study Time
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span>{format(viewedMonth, 'MMMM yyyy')}</span>
                            <Button variant="outline" size="icon" onClick={handleNextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <CardDescription>Hours studied per day this month</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingMonthlyStudyData ? (
                        <div className="flex items-center justify-center h-[300px]">
                            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                            <p className="ml-2 text-muted-foreground">Loading monthly study data...</p>
                        </div>
                    ) : (
                        monthlyStudyData.length > 0 ? (
                            <ChartContainer config={studyChartConfig} className="min-h-[300px] w-full">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={monthlyStudyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tickFormatter={(date) => format(parseISO(date), 'dd')} tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis
                                            tickFormatter={(value) => `${Math.round(value)}hr`}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            width={50}
                                        />
                                        <ChartTooltip
                                            cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                                            content={
                                                <ChartTooltipContent
                                                    labelFormatter={(label) => format(parseISO(label), "PPP")}
                                                    formatter={(value) => {
                                                        const hours = Math.floor(value as number);
                                                        const minutes = Math.round(((value as number) % 1) * 60);
                                                        return `${hours} hr ${minutes} min`;
                                                    }}
                                                />
                                            }
                                        />
                                        <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        ) : (
                            <p className="text-center text-muted-foreground py-10">No study history data available to display for the graph.</p>
                        )
                    )}
                </CardContent>
            </Card>
      

      <Card className="mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-base sm:text-lg">
          <BarChart3 className="mr-2 h-5 w-5" />
          Monthly Overview
        </CardTitle>
        <CardDescription>Select a date to view details or navigate through months.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border shadow-inner"
            modifiers={{ today: new Date() }}
            modifiersStyles={{ today: { color: 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } }}
            disabled={!currentStudent}
          />
        </CardContent>
      </Card>

      {date && currentStudent && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Details for {format(date, 'PPP')}</CardTitle>
          </CardHeader>
          <CardContent>
             {/* Display Daily Study Time */}
            {isLoadingDetails ? (
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading details...
              </div>
            ) : (
              <>
                {/* Calculate and Display Study Time */}
                {(() => {
                  const { hours, minutes } = calculateDailyStudyTime(attendanceForDay);
                  return (
                    <div className="mb-4 text-lg font-semibold" style={{ color: '#30475E' }}>
                      Total study time: {hours} hr {minutes} min
                    </div>
                  );
                })()}

                {attendanceForDay.length === 0 && (
                  <p className="text-muted-foreground">No attendance records found for this day.</p>
                )}
                {attendanceForDay.length > 0 && (
                  <ul className="space-y-3">
                    {attendanceForDay.map(record => (
                      <li key={record.recordId} className="p-3 border rounded-md bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <LogIn className="mr-2 h-4 w-4 text-green-600" />
                            <span className="font-medium">Checked In:</span>
                          </div>
                          <span className="text-sm">{record.checkInTime && isValid(parseISO(record.checkInTime)) ? format(parseISO(record.checkInTime), 'p') : 'N/A'}</span>
                        </div>
                        {record.checkOutTime && isValid(parseISO(record.checkOutTime)) ? (
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
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
