
"use client";

import * as React from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Camera, QrCode, Receipt, IndianRupee, MessageSquare, Bell, ScrollText, Star, Loader2, XCircle, Home, BarChart3, PlayCircle, CheckCircle, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentByEmail, getAlertsForStudent, calculateMonthlyStudyHours, addCheckIn, addCheckOut, getActiveCheckIn, getAttendanceForDate } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import type { AttendanceRecord } from '@/types/student';
import { format, parseISO, differenceInMilliseconds } from 'date-fns';

type DashboardTileProps = {
  title: string;
  description?: string;
  statistic?: string | number | null;
  isLoadingStatistic?: boolean;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  className?: string;
  isPrimaryAction?: boolean;
  external?: boolean;
  hasNew?: boolean;
};

const DashboardTile: React.FC<DashboardTileProps> = ({
  title,
  description,
  statistic,
  isLoadingStatistic,
  icon: Icon,
  href,
  action,
  className = "",
  isPrimaryAction = false,
  external = false,
  hasNew = false
}) => {
  const content = (
    <Card className={cn(
      "shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col",
      isPrimaryAction ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted/50',
      className,
      {
        'border-destructive ring-2 ring-destructive/50': hasNew && !isPrimaryAction,
      }
    )}>
      <CardHeader className={cn(
        "relative",
        isPrimaryAction ? "p-3 sm:p-4 pb-1 sm:pb-2" : "p-2 sm:p-3 pb-0 sm:pb-1"
      )}>
        {hasNew && !isPrimaryAction && (
          <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-destructive ring-1 ring-white" />
        )}
        <div className={cn(
          "flex items-center gap-2",
           isPrimaryAction ? "" : "flex-col text-center"
        )}>
          <Icon className={cn(
            isPrimaryAction ? "h-5 w-5 sm:h-6 sm:w-6" : "h-5 w-5 sm:h-6 sm:w-6 mb-1"
          )} />
          <ShadcnCardTitle className={cn(
            "break-words",
            isPrimaryAction ? 'text-lg sm:text-xl font-bold' : 'text-sm sm:text-base font-semibold',
          )}>
            {title}
          </ShadcnCardTitle>
        </div>
      </CardHeader>
      <CardContent className={cn(
        "flex-grow flex flex-col items-center justify-center",
        isPrimaryAction ? "p-3 sm:p-4 pt-1 sm:pt-2" : "p-2 sm:p-3 pt-0 sm:pt-1"
      )}>
        {isLoadingStatistic ? (
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary my-2" />
        ) : statistic !== null && statistic !== undefined ? (
          <>
            <div className={cn(
              "text-xl sm:text-2xl font-bold break-words",
               isPrimaryAction ? 'text-primary-foreground' : 'text-foreground'
            )}>
              {statistic}
            </div>
            {description && <p className={cn(
              "text-xs mt-1 break-words",
              isPrimaryAction ? 'text-primary-foreground/80' : 'text-muted-foreground text-center',
            )}>{description}</p>}
          </>
        ) : (
          description && <p className={cn(
            "break-words",
            isPrimaryAction ? 'text-sm text-primary-foreground/80' : 'text-xs text-muted-foreground text-center',
          )}>{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const linkClasses = "block h-full no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg";

  if (href) {
    return (
      <Link
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={cn(linkClasses, className)}
      >
        {content}
      </Link>
    );
  }

  if (action) {
    return <button onClick={action} className={cn("block w-full h-full text-left", linkClasses, className)}>{content}</button>;
  }

  return <div className={className}>{content}</div>;
};


export default function MemberDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [studentId, setStudentId] = React.useState<string | null>(null);
  const [studentFirstName, setStudentFirstName] = React.useState<string | null>(null);
  const [hasUnreadAlerts, setHasUnreadAlerts] = React.useState(false);
  const [isLoadingStudentData, setIsLoadingStudentData] = React.useState(true);

  const [monthlyStudyHours, setMonthlyStudyHours] = React.useState<number | null>(null);
  const [isLoadingStudyHours, setIsLoadingStudyHours] = React.useState(true);

  const [activeCheckIn, setActiveCheckIn] = React.useState<AttendanceRecord | null>(null);
  const [hoursStudiedToday, setHoursStudiedToday] = React.useState<number | null>(null);
  const [isLoadingCurrentSession, setIsLoadingCurrentSession] = React.useState(true);

  const fetchCurrentSessionData = React.useCallback(async (currentStudentId: string) => {
    setIsLoadingCurrentSession(true);
    setActiveCheckIn(null);
    setHoursStudiedToday(null);
    try {
      const [activeCheckInData, todayAttendanceData] = await Promise.all([
        getActiveCheckIn(currentStudentId),
        getAttendanceForDate(currentStudentId, format(new Date(), 'yyyy-MM-dd'))
      ]);

      setActiveCheckIn(activeCheckInData || null);

      let totalMillisecondsToday = 0;
      const now = new Date();
      todayAttendanceData.forEach(record => {
        if (record.checkOutTime) {
          totalMillisecondsToday += differenceInMilliseconds(parseISO(record.checkOutTime), parseISO(record.checkInTime));
        } else if (activeCheckInData && record.recordId === activeCheckInData.recordId) {
          totalMillisecondsToday += differenceInMilliseconds(now, parseISO(record.checkInTime));
        }
      });
      setHoursStudiedToday(totalMillisecondsToday / (1000 * 60 * 60));

    } catch (error) {
      console.error("Error fetching current session data:", error);
      toast({ title: "Error", description: "Could not load current session details.", variant: "destructive" });
      setActiveCheckIn(null);
      setHoursStudiedToday(null);
    } finally {
      setIsLoadingCurrentSession(false);
    }
  }, [toast]);


  React.useEffect(() => {
    if (user?.email) {
      setIsLoadingStudentData(true);
      setIsLoadingStudyHours(true);
      setIsLoadingCurrentSession(true);
      setStudentFirstName(null);
      setStudentId(null);
      setMonthlyStudyHours(null);
      setHasUnreadAlerts(false);
      setActiveCheckIn(null);
      setHoursStudiedToday(null);

      getStudentByEmail(user.email)
        .then(studentDetails => {
          if (studentDetails) {
            setStudentId(studentDetails.studentId);
            setStudentFirstName(studentDetails.name ? studentDetails.name.split(' ')[0] : null);

            const alertPromise = getAlertsForStudent(studentDetails.studentId);
            const studyHoursPromise = calculateMonthlyStudyHours(studentDetails.studentId);
            // Initial fetch of current session data
            fetchCurrentSessionData(studentDetails.studentId);

            return Promise.all([alertPromise, studyHoursPromise]);
          }
          setIsLoadingStudentData(false);
          setIsLoadingStudyHours(false);
          setIsLoadingCurrentSession(false);
          return Promise.reject("Student not found to fetch further data");
        })
        .then(([alerts, hours]) => {
          setHasUnreadAlerts(alerts.some(alert => !alert.isRead));
          setMonthlyStudyHours(hours);
        })
        .catch(error => {
          if (error !== "Student not found to fetch further data") {
            console.error("Error fetching student data, alerts or study hours for dashboard:", error);
          }
        })
        .finally(() => {
          setIsLoadingStudentData(false);
          setIsLoadingStudyHours(false);
        });
    } else {
      setIsLoadingStudentData(false);
      setIsLoadingStudyHours(false);
      setIsLoadingCurrentSession(false);
      setStudentFirstName(null);
      setStudentId(null);
      setMonthlyStudyHours(null);
      setHasUnreadAlerts(false);
      setActiveCheckIn(null);
      setHoursStudiedToday(null);
    }
  }, [user, toast, fetchCurrentSessionData]);


  React.useEffect(() => {
    const getCameraPermission = async () => {
      if (isScannerOpen) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
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

  const handleOpenScanner = () => {
    if (!studentId) {
        toast({title: "Error", description: "Cannot mark attendance. Student details not loaded.", variant: "destructive"});
        return;
    }
    setIsScannerOpen(true);
    setHasCameraPermission(null);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
  };

  const simulateQrScan = async () => {
    if (!studentId) {
      toast({ title: "Error", description: "Student ID not found. Cannot record attendance.", variant: "destructive" });
      return;
    }
    setIsProcessingQr(true);
    try {
      const currentActiveCheckIn = await getActiveCheckIn(studentId);
      if (currentActiveCheckIn) {
        await addCheckOut(currentActiveCheckIn.recordId);
        toast({ title: "Checked Out!", description: `Successfully checked out at ${new Date().toLocaleTimeString()}.` });
      } else {
        await addCheckIn(studentId);
        toast({ title: "Checked In!", description: `Successfully checked in at ${new Date().toLocaleTimeString()}.` });
      }

      setIsLoadingStudyHours(true);
      calculateMonthlyStudyHours(studentId)
          .then(setMonthlyStudyHours)
          .catch(() => {
              toast({title:"Error", description: "Could not update monthly study hours.", variant: "destructive"});
              setMonthlyStudyHours(null);
          })
          .finally(() => setIsLoadingStudyHours(false));

      fetchCurrentSessionData(studentId);

    } catch (error) {
      toast({ title: "Scan Error", description: "Failed to process attendance. Please try again.", variant: "destructive" });
    } finally {
      setIsProcessingQr(false);
      setIsScannerOpen(false);
    }
  };

  let activityStatisticDisplay: string | null = null;
  let activityDescription: string = "Track your study hours.";

  if (!isLoadingStudentData && studentId && !isLoadingStudyHours) {
    if (monthlyStudyHours !== null && monthlyStudyHours > 0) {
      activityStatisticDisplay = `${monthlyStudyHours} hours`;
      activityDescription = "studied this month";
    } else if (monthlyStudyHours === 0) {
      activityStatisticDisplay = "0 hours";
      activityDescription = "No hours recorded this month.";
    }
     else {
       activityStatisticDisplay = null;
      activityDescription = "Could not load study hours.";
    }
  } else if (isLoadingStudyHours || isLoadingStudentData) {
     activityStatisticDisplay = null;
     activityDescription = "Loading hours...";
  }


  const coreActionTiles: DashboardTileProps[] = [
    {
      title: "View Alerts",
      description: "Catch up on announcements.",
      icon: Bell,
      href: "/member/alerts",
      hasNew: isLoadingStudentData ? false : hasUnreadAlerts
    },
    {
      title: "Activity Summary",
      statistic: activityStatisticDisplay,
      description: activityDescription,
      isLoadingStatistic: isLoadingStudentData || isLoadingStudyHours,
      icon: BarChart3,
      href: "/member/attendance"
    },
    { title: "Pay Fees", description: "Settle your outstanding dues.", icon: IndianRupee, href: "/member/pay" },
    { title: "Submit Feedback", description: "Share suggestions or issues.", icon: MessageSquare, href: "/member/feedback" },
  ];

  const otherResourcesTiles: DashboardTileProps[] = [
    { title: "Library Rules", description: "Familiarize yourself with guidelines.", icon: ScrollText, href: "/member/rules" },
    { title: "Rate Us", description: "Love our space? Let others know!", icon: Star, href: "https://www.google.com/maps/search/?api=1&query=Taxshila+Study+Hall+Pune", external: true },
  ];

  const defaultWelcomeName = user?.email?.split('@')[0] || 'Member';
  const pageTitleText = isLoadingStudentData && !studentFirstName
    ? `Welcome, ${defaultWelcomeName}!`
    : (studentFirstName ? `Welcome, ${studentFirstName}!` : `Welcome, ${defaultWelcomeName}!`);

  return (
    <>
      <PageTitle title={pageTitleText} description="Your Taxshila Companion dashboard." />

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogTrigger asChild>
          <div className="mb-2 cursor-pointer">
            <DashboardTile
              title="Mark Attendance"
              description="Scan the QR code at the library to check-in/out."
              icon={QrCode}
              action={handleOpenScanner}
              isPrimaryAction={true}
            />
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <ShadcnDialogTitle className="flex items-center"><Camera className="mr-2"/>Scan QR Code</ShadcnDialogTitle>
            <DialogDescription>
              Point your camera at the QR code provided at the library desk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {hasCameraPermission === false && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <ShadcnAlertTitle>Camera Access Denied</ShadcnAlertTitle>
                <AlertDescription>
                  Camera access is required. Please enable it in your browser settings and try again.
                </AlertDescription>
              </Alert>
            )}

            <div className="w-full aspect-square bg-muted rounded-md overflow-hidden flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            </div>

            {hasCameraPermission === null && !videoRef.current?.srcObject && (
                 <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting camera...
                </div>
            )}
          </div>

          {hasCameraPermission && (
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button onClick={simulateQrScan} className="w-full sm:flex-1" disabled={isProcessingQr}>
                  {isProcessingQr && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isProcessingQr ? "Processing..." : "Simulate Scan"}
                </Button>
                <Button variant="outline" onClick={handleCloseScanner} className="w-full sm:w-auto" disabled={isProcessingQr}>
                  Cancel
                </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {!isLoadingStudentData && studentId && (
        <div className="mt-1 mb-6 text-xs text-center text-muted-foreground">
          {isLoadingCurrentSession ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              <span>Loading session...</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-1">
              {activeCheckIn ? (
                <div className="flex items-center">
                  <PlayCircle className="mr-1 h-3 w-3 text-green-600" />
                  <span>Checked In (since {format(parseISO(activeCheckIn.checkInTime), 'p')})</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="mr-1 h-3 w-3 text-gray-500" />
                  <span>Not Currently Checked In</span>
                </div>
              )}
              {hoursStudiedToday !== null && hoursStudiedToday > 0 && (
                <div className="flex items-center">
                  <Hourglass className="mr-1 h-3 w-3 text-blue-500" />
                  <span>Today: {hoursStudiedToday.toFixed(1)} hrs</span>
                </div>
              )}
              {hoursStudiedToday === 0 && !activeCheckIn && (
                 <div className="flex items-center">
                  <Hourglass className="mr-1 h-3 w-3 text-blue-500" />
                  <span>No study today.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {coreActionTiles.map((tile) => (
          <DashboardTile key={tile.title} {...tile} />
        ))}
      </div>

      <div className="my-8 border-t border-border"></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {otherResourcesTiles.map((tile) => (
          <DashboardTile key={tile.title} {...tile} />
        ))}
      </div>
    </>
  );
}
