
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
import { Camera, Loader2, XCircle, BarChart3, Clock, LogIn, LogOut, ScanLine, CheckCircle, TrendingUp, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getActiveCheckIn, addCheckIn, addCheckOut, getAttendanceForDate, calculateMonthlyStudyHours, getStudentByCustomId } from '@/services/student-service';
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
  const [monthlyStudyData, setMonthlyStudyData] = React.useState<{ date: string; hours: number }[]>([]);
  const [isLoadingStudyHours, setIsLoadingStudyHours] = React.useState(true);
  const [activeCheckInRecord, setActiveCheckInRecord] = React.useState<AttendanceRecord | null>(null);
  const [isLoadingActiveCheckIn, setIsLoadingActiveCheckIn] = React.useState(true);
  const [isOverdueDialogOpen, setIsOverdueDialogOpen] = React.useState(false);
  const [viewedMonth, setViewedMonth] = React.useState(new Date());


  const fetchStudentDataAndActiveCheckIn = React.useCallback(async () => {
    if (user?.studentId || user?.email) {
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
          const activeCheckIn = await getActiveCheckIn(student.studentId);
          setActiveCheckInRecord(activeCheckIn || null);
        } else {
          toast({
            title: "Student Record Not Found",
            description: "Could not find a student record associated with your email.",
            variant: "destructive",
          });
          setCurrentStudent(null);
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
        setActiveCheckInRecord(null);
      } finally {
        setIsLoadingActiveCheckIn(false);
      }
    } else {
      setIsLoadingActiveCheckIn(false);
      setCurrentStudent(null);
      setActiveCheckInRecord(null);
    }
  }, [user, toast]);

  const getDailyStudyDataForMonth = React.useCallback(async (studentId: string, month: Date) => {
    setIsLoadingStudyHours(true);
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
            studyData.push({ date: format(day, 'dd'), hours: totalHours });
        }
        setMonthlyStudyData(studyData);
    } catch (error) {
        console.error("Error fetching daily study data:", error);
    } finally {
        setIsLoadingStudyHours(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStudentDataAndActiveCheckIn();
  }, [fetchStudentDataAndActiveCheckIn]);

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
        const endTime = new Date(checkInTime); 
        endTime.setHours(21, 30, 0, 0); 

        const now = new Date();
        const calculationEndTime = endTime > now ? now : endTime;

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

  const handlePrevMonth = () => {
    setViewedMonth((prev) => subMonths(prev, 1));
  };
  const handleNextMonth = () => {
    setViewedMonth((prev) => addMonths(prev, 1));
  };

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

      <div className="grid gap-6 md:grid-cols-1">
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
      </div>

      <Card className="mt-6 shadow-lg">
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-grow">
                <CardTitle className="flex items-center text-base sm:text-lg">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Monthly Study Time
                </CardTitle>
                <CardDescription>Your daily study performance this month.</CardDescription>
              </div>
              <div className="flex items-center space-x-1 self-start sm:self-center">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevMonth} disabled={isLoadingStudyHours}>
                      <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-24 text-center">{format(viewedMonth, 'MMMM yyyy')}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextMonth} disabled={isLoadingStudyHours}>
                      <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
              {isLoadingStudyHours ? (
                  <div className="flex items-center justify-center h-[250px]">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : monthlyStudyData.length > 0 ? (
                  <div className="h-[250px]">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart accessibilityLayer data={monthlyStudyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid vertical={false} />
                              <XAxis
                                  dataKey="date"
                                  tickLine={false}
                                  tickMargin={10}
                                  axisLine={false}
                              />
                              <YAxis
                                tickFormatter={(value) => `${Math.round(value as number)}hr`}
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                width={40}
                              />
                              <ChartTooltip
                                  cursor={false}
                                  content={
                                    <ChartTooltipContent
                                      formatter={(value, name, item) => {
                                        const fullDate = format(new Date(viewedMonth.getFullYear(), viewedMonth.getMonth(), parseInt(item.payload.date)), 'PP');
                                        const hours = Math.floor(value as number);
                                        const minutes = Math.round(((value as number) % 1) * 60);
                                        return (
                                            <div className="flex flex-col">
                                                <span className="font-bold">{fullDate}</span>
                                                <span>{`${hours} hr ${minutes} min`}</span>
                                            </div>
                                        );
                                      }}
                                    />
                                  }
                              />
                              <Bar dataKey="hours" fill="var(--color-hours)" radius={4} />
                          </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
              ) : (
                  <p className="text-center text-muted-foreground py-10">No study data for this month.</p>
              )}
          </CardContent>
      </Card>


      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-base sm:text-lg">
            <Clock className="mr-2 h-5 w-5" />
            Daily Activity
          </CardTitle>
          <CardDescription>Select a date to view attendance details for that day.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-full md:w-auto flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow-inner"
              modifiers={{ today: new Date() }}
              modifiersStyles={{ today: { color: 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } }}
              disabled={!currentStudent}
            />
          </div>
          <div className="w-full md:flex-1">
            <h4 className="text-md font-semibold mb-2">Details for {date ? format(date, 'PPP') : 'selected date'}:</h4>
            {isLoadingDetails ? (
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading details...
              </div>
            ) : (
              <>
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
          </div>
        </CardContent>
      </Card>
    </>
  );
}
