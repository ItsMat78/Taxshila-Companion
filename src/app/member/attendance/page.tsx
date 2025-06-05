
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Loader2, XCircle, BarChart3, Clock, LogIn, LogOut, ScanLine, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getActiveCheckIn, addCheckIn, addCheckOut, getAttendanceForDate, calculateMonthlyStudyHours } from '@/services/student-service';
import type { AttendanceRecord } from '@/types/student';
import { format, parseISO, isValid } from 'date-fns';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const QR_SCANNER_ELEMENT_ID = "qr-reader-attendance";
const LIBRARY_QR_CODE_PAYLOAD = "TAXSHILA_LIBRARY_CHECKIN_QR_V1";

export default function MemberAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const html5QrcodeScannerRef = React.useRef<Html5QrcodeScanner | null>(null);

  const [currentStudentId, setCurrentStudentId] = React.useState<string | null>(null);
  const [attendanceForDay, setAttendanceForDay] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [monthlyStudyHours, setMonthlyStudyHours] = React.useState<number | null>(null);
  const [isLoadingStudyHours, setIsLoadingStudyHours] = React.useState(true);
  const [activeCheckInRecord, setActiveCheckInRecord] = React.useState<AttendanceRecord | null>(null);
  const [isLoadingActiveCheckIn, setIsLoadingActiveCheckIn] = React.useState(true);

  const fetchStudentDataAndActiveCheckIn = React.useCallback(async () => {
    if (user?.email) {
      setIsLoadingStudyHours(true);
      setIsLoadingActiveCheckIn(true);
      try {
        const student = await getStudentByEmail(user.email);
        if (student) {
          setCurrentStudentId(student.studentId);
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
          setCurrentStudentId(null);
          setMonthlyStudyHours(0);
          setActiveCheckInRecord(null);
        }
      } catch (error: any) {
        console.error("Error fetching student data/active check-in:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch student details or session status.",
          variant: "destructive",
        });
        setCurrentStudentId(null);
        setMonthlyStudyHours(0);
        setActiveCheckInRecord(null);
      } finally {
        setIsLoadingStudyHours(false);
        setIsLoadingActiveCheckIn(false);
      }
    } else {
      setIsLoadingStudyHours(false);
      setIsLoadingActiveCheckIn(false);
      setCurrentStudentId(null);
      setActiveCheckInRecord(null);
    }
  }, [user, toast]);

  React.useEffect(() => {
    fetchStudentDataAndActiveCheckIn();
  }, [fetchStudentDataAndActiveCheckIn]);

  const fetchAttendanceForSelectedDate = React.useCallback(async () => {
    if (currentStudentId && date) {
      setIsLoadingDetails(true);
      try {
        const records = await getAttendanceForDate(currentStudentId, format(date, 'yyyy-MM-dd'));
        setAttendanceForDay(records);
      } catch (error: any) {
        console.error("Error fetching attendance for date:", error);
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
  }, [currentStudentId, date, toast]);


  React.useEffect(() => {
    if (isScannerOpen && currentStudentId && !activeCheckInRecord) {
      const formatsToSupport = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.EAN_13,
      ];
      const scanner = new Html5QrcodeScanner(
        QR_SCANNER_ELEMENT_ID,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [],
          formatsToSupport: formatsToSupport
        },
        false
      );
      html5QrcodeScannerRef.current = scanner;

      const onScanSuccess = async (decodedText: string, decodedResult: any) => {
        if (isProcessingQr) return;
        setIsProcessingQr(true);
        if (html5QrcodeScannerRef.current) {
            html5QrcodeScannerRef.current.pause(true);
        }
        setHasCameraPermission(true);

        if (decodedText === LIBRARY_QR_CODE_PAYLOAD) {
          try {
            await addCheckIn(currentStudentId);
            toast({
              title: "Checked In!",
              description: `Successfully checked in at ${new Date().toLocaleTimeString()}.`,
            });
            await fetchStudentDataAndActiveCheckIn();
            await fetchAttendanceForSelectedDate();
          } catch (error: any) {
            console.error("Error during check-in processing:", error);
            toast({ title: "Check-in Error", description: error.message || "Failed to process check-in. Please try again.", variant: "destructive" });
          }
        } else {
          toast({ title: "Invalid QR Code", description: "Please scan the official library QR code.", variant: "destructive" });
          setTimeout(() => {
             if (html5QrcodeScannerRef.current && html5QrcodeScannerRef.current.getState() === 2 /* PAUSED */ ) {
                html5QrcodeScannerRef.current.resume();
            }
          }, 1000);
        }
        setIsProcessingQr(false);
        setIsScannerOpen(false);
      };

      const onScanFailure = (errorPayload: string | { message?: string }, errorObject?: any) => {
        let errorMessageText = "QR scan failed.";
        if (typeof errorPayload === 'string') {
            errorMessageText = errorPayload;
        } else if (errorPayload && typeof errorPayload.message === 'string') {
            errorMessageText = errorPayload.message;
        }

        if (errorMessageText.toLowerCase().includes("permission denied") ||
            errorMessageText.toLowerCase().includes("notallowederror") ||
            errorMessageText.toLowerCase().includes("notfounderror") ||
            (errorObject && typeof errorObject.message === 'string' && errorObject.message.toLowerCase().includes("permission denied"))) {
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied or Not Found',
            description: 'Please enable camera permissions and ensure a camera is connected.',
          });
        }
      };

      try {
        scanner.render(onScanSuccess, onScanFailure);
        setHasCameraPermission(true);
      } catch (error: any) {
        console.error("Error during scanner.render() call:", error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Scanner Initialization Error',
          description: error.message || 'Could not start the QR scanner. Please ensure camera permissions are enabled and try again.',
        });
        setIsScannerOpen(false);
      }

    } else if (!isScannerOpen && html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear()
        .catch(err => console.error("Error clearing scanner:", err));
        html5QrcodeScannerRef.current = null;
    }

    return () => {
        if (html5QrcodeScannerRef.current) {
            if (typeof html5QrcodeScannerRef.current.clear === 'function') {
                 html5QrcodeScannerRef.current.clear().catch(err => console.error("Cleanup: Error clearing scanner:", err));
            }
            html5QrcodeScannerRef.current = null;
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScannerOpen, currentStudentId, activeCheckInRecord, toast, fetchStudentDataAndActiveCheckIn, fetchAttendanceForSelectedDate]);


  React.useEffect(() => {
    fetchAttendanceForSelectedDate();
  }, [fetchAttendanceForSelectedDate]);


  const handleScanCheckInButtonClick = () => {
    setIsScannerOpen(true);
  };

  const handleCancelScan = () => {
    setIsScannerOpen(false);
  };

  const handleCheckOut = async () => {
    if (!currentStudentId || !activeCheckInRecord) {
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
      console.error("Error during check-out:", error);
      toast({ title: "Check-out Error", description: error.message || "Failed to process check-out. Please try again.", variant: "destructive" });
    } finally {
      setIsProcessingQr(false);
    }
  };


  return (
    <>
      <PageTitle
        title="My Attendance"
        description="Mark your presence, view your calendar, and track your study hours."
      />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
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
              <Button onClick={handleCheckOut} className="w-full" disabled={isProcessingQr || !currentStudentId}>
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
                <div id={QR_SCANNER_ELEMENT_ID} className="w-full aspect-square bg-muted rounded-md overflow-hidden" />
                {isProcessingQr && <p className="text-sm text-muted-foreground text-center">Processing QR code...</p>}
                <Button variant="outline" onClick={handleCancelScan} className="w-full" disabled={isProcessingQr}>
                  Cancel Scan
                </Button>
              </div>
            ) : (
              <Button onClick={handleScanCheckInButtonClick} className="w-full" disabled={!currentStudentId || isScannerOpen}>
                <ScanLine className="mr-2 h-4 w-4" /> Scan QR to Check-In
              </Button>
            )}
            {!currentStudentId && !user && (
                 <p className="text-xs text-muted-foreground mt-2 text-center">Loading user details...</p>
            )}
             {!currentStudentId && user && !isLoadingActiveCheckIn && (
                 <p className="text-xs text-destructive mt-2 text-center">Could not link your email to a student record. Please contact admin.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
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

      <Card className="mt-6 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
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
            disabled={!currentStudentId}
          />
        </CardContent>
      </Card>
      {date && currentStudentId && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle>Details for {format(date, 'PPP')}</CardTitle>
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
          </CardContent>
        </Card>
      )}
    </>
  );
}
