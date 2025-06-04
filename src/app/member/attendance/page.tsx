
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
import { Camera, Loader2, XCircle, BarChart3, Clock, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getActiveCheckIn, addCheckIn, addCheckOut, getAttendanceForDate, calculateMonthlyStudyHours } from '@/services/student-service';
import type { AttendanceRecord } from '@/types/student';
import { format, parseISO } from 'date-fns';

export default function MemberAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [currentStudentId, setCurrentStudentId] = React.useState<string | null>(null);
  const [attendanceForDay, setAttendanceForDay] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [monthlyStudyHours, setMonthlyStudyHours] = React.useState<number | null>(null);
  const [isLoadingStudyHours, setIsLoadingStudyHours] = React.useState(true);

  React.useEffect(() => {
    if (user?.email) {
      const fetchStudentAndHours = async () => {
        setIsLoadingStudyHours(true);
        try {
          const student = await getStudentByEmail(user.email);
          if (student) {
            setCurrentStudentId(student.studentId);
            const hours = await calculateMonthlyStudyHours(student.studentId);
            setMonthlyStudyHours(hours);
          } else {
            toast({
              title: "Student Record Not Found",
              description: "Could not find a student record associated with your email.",
              variant: "destructive",
            });
            setCurrentStudentId(null);
            setMonthlyStudyHours(0);
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to fetch student details or study hours.",
            variant: "destructive",
          });
          setCurrentStudentId(null);
          setMonthlyStudyHours(0);
        } finally {
          setIsLoadingStudyHours(false);
        }
      };
      fetchStudentAndHours();
    } else {
      setIsLoadingStudyHours(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    const getCameraPermission = async () => {
      if (isScannerOpen) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.playsInline = true; 
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
          setIsScannerOpen(false); 
        }
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    getCameraPermission();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScannerOpen, toast]);

  const fetchAttendanceForSelectedDate = React.useCallback(async () => {
    if (currentStudentId && date) {
      setIsLoadingDetails(true);
      try {
        const records = await getAttendanceForDate(currentStudentId, format(date, 'yyyy-MM-dd'));
        setAttendanceForDay(records);
      } catch (error) {
        toast({
          title: "Error Fetching Attendance",
          description: "Could not load attendance for the selected date.",
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
    fetchAttendanceForSelectedDate();
  }, [fetchAttendanceForSelectedDate]);


  const handleScanButtonClick = () => {
    setIsScannerOpen(true);
    setHasCameraPermission(null); 
  };

  const handleCancelScan = () => {
    setIsScannerOpen(false);
  };

  const simulateQrScan = async () => {
    if (!currentStudentId) {
      toast({
        title: "Error",
        description: "Student ID not found. Cannot record attendance.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessingQr(true);
    try {
      const activeCheckIn = await getActiveCheckIn(currentStudentId);
      if (activeCheckIn) {
        await addCheckOut(activeCheckIn.recordId);
        toast({
          title: "Checked Out!",
          description: `Successfully checked out at ${new Date().toLocaleTimeString()}.`,
        });
      } else {
        await addCheckIn(currentStudentId);
        toast({
          title: "Checked In!",
          description: `Successfully checked in at ${new Date().toLocaleTimeString()}.`,
        });
      }
      await fetchAttendanceForSelectedDate(); 
      // Re-fetch monthly hours after check-in/out
      if(currentStudentId) {
        setIsLoadingStudyHours(true);
        const hours = await calculateMonthlyStudyHours(currentStudentId);
        setMonthlyStudyHours(hours);
        setIsLoadingStudyHours(false);
      }
    } catch (error) {
      toast({
        title: "Scan Error",
        description: "Failed to process attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingQr(false);
      setIsScannerOpen(false);
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
              <Camera className="mr-2 h-5 w-5" />
              Mark Attendance
            </CardTitle>
            <CardDescription>Scan the QR code at the library desk to check-in or check-out.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isScannerOpen ? (
              <Button onClick={handleScanButtonClick} className="w-full" disabled={!currentStudentId}>
                Scan QR for Check-in/Check-out
              </Button>
            ) : (
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
                
                <div className="w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                </div>
                
                {hasCameraPermission === null && !videoRef.current?.srcObject && (
                     <div className="flex items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Requesting camera...
                    </div>
                )}

                {hasCameraPermission && (
                     <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={simulateQrScan} className="w-full sm:flex-1" disabled={isProcessingQr}>
                          {isProcessingQr && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isProcessingQr ? "Processing..." : "Simulate Scan"}
                        </Button>
                        <Button variant="outline" onClick={handleCancelScan} className="w-full sm:w-auto" disabled={isProcessingQr}>
                          Cancel
                        </Button>
                    </div>
                )}
              </div>
            )}
            {!currentStudentId && !user && (
                 <p className="text-xs text-muted-foreground mt-2 text-center">Loading user details...</p>
            )}
             {!currentStudentId && user && (
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
    </>
  );
}

