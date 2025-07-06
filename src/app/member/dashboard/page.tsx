
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Camera, QrCode, Receipt, IndianRupee, MessageSquare, Bell, ScrollText, Star, Loader2, XCircle, Home, BarChart3, PlayCircle, CheckCircle, Hourglass, ScanLine, LogOut, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentByEmail, getAlertsForStudent, calculateMonthlyStudyHours, addCheckIn, addCheckOut, getActiveCheckIn, getAttendanceForDate, getStudentByCustomId } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import type { Student, AttendanceRecord, FeeStatus } from '@/types/student';
import { format, parseISO, differenceInMilliseconds, isValid } from 'date-fns';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeScanType } from 'html5-qrcode';

const DASHBOARD_QR_SCANNER_ELEMENT_ID = "qr-reader-dashboard";
const LIBRARY_QR_CODE_PAYLOAD = "TAXSHILA_LIBRARY_CHECKIN_QR_V1";

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
  isUrgent?: boolean;
  disabled?: boolean;
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
  hasNew = false,
  isUrgent = false,
  disabled = false,
}) => {
  const content = (
    <Card className={cn(
      "shadow-lg h-full flex flex-col",
      isPrimaryAction ? 'bg-primary text-primary-foreground' : '',
      disabled ? 'opacity-60 cursor-not-allowed bg-muted/50' : (isPrimaryAction ? 'hover:bg-primary/90' : 'hover:bg-muted/50 hover:shadow-xl transition-shadow'),
      {
        'border-destructive ring-1 ring-destructive/30': (isUrgent) && !isPrimaryAction,
      },
      className
    )}>
      <CardHeader className={cn(
        "relative",
        isPrimaryAction ? "p-3 sm:p-4 pb-1 sm:pb-2" : "p-2 sm:p-3 pb-0 sm:pb-1"
      )}>
        {(hasNew || isUrgent) && !isPrimaryAction && (
          <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-destructive ring-1 ring-white" />
        )}
        <div className={cn(
          "flex items-center gap-2",
           isPrimaryAction ? "" : "flex-col text-center"
        )}>
          <Icon className={cn(
            isPrimaryAction ? "h-5 w-5 sm:h-6 sm:w-6" : "h-5 w-5 sm:h-6 sm:w-6 mb-1",
            isPrimaryAction && isLoadingStatistic && "animate-spin"
          )}
           />
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
        {isLoadingStatistic && !isPrimaryAction ? (
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary my-2" />
        ) : statistic !== null && statistic !== undefined ? (
          <>
            <div className={cn(
              "font-bold break-words",
               isPrimaryAction ? 'text-xl sm:text-2xl text-primary-foreground' : 'text-lg sm:text-xl text-foreground',
              isUrgent && !isPrimaryAction && 'text-destructive'
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
            "break-words text-center",
            isPrimaryAction ? 'text-sm text-primary-foreground/80' : 'text-xs text-muted-foreground',
          )}>{description}</p>
        )}
      </CardContent>
    </Card>
  );

  const linkClasses = "block h-full no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg";

  if (href && !disabled) {
    return (
      <Link
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={cn(linkClasses, className)}
        onClick={(e) => { if (disabled) e.preventDefault(); }}
      >
        {content}
      </Link>
    );
  }

  if (action && !disabled) {
    return <button onClick={action} className={cn("block w-full h-full text-left", linkClasses, className)} disabled={disabled}>{content}</button>;
  }

  return <div className={cn(className, disabled ? 'cursor-not-allowed' : '')}>{content}</div>;
};


export default function MemberDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const html5QrcodeScannerRef = React.useRef<Html5QrcodeScanner | null>(null);


  const [studentId, setStudentId] = React.useState<string | null>(null);
  const [studentFirstName, setStudentFirstName] = React.useState<string | null>(null);
  const [hasUnreadAlerts, setHasUnreadAlerts] = React.useState(false);
  const [isLoadingStudentData, setIsLoadingStudentData] = React.useState(true);

  const [monthlyStudyHours, setMonthlyStudyHours] = React.useState<number | null>(null);
  const [isLoadingStudyHours, setIsLoadingStudyHours] = React.useState(true);

  const [activeCheckInRecord, setActiveCheckInRecord] = React.useState<AttendanceRecord | null>(null);
  const [hoursStudiedToday, setHoursStudiedToday] = React.useState<number | null>(null);
  const [isLoadingCurrentSession, setIsLoadingCurrentSession] = React.useState(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = React.useState(false);


  const [studentFeeStatus, setStudentFeeStatus] = React.useState<FeeStatus | null>(null);
  const [studentNextDueDate, setStudentNextDueDate] = React.useState<string | null>(null);
  const [isOverdueDialogOpen, setIsOverdueDialogOpen] = React.useState(false);
  const [elapsedTime, setElapsedTime] = React.useState<string | null>(null);

  React.useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (activeCheckInRecord?.checkInTime && isValid(parseISO(activeCheckInRecord.checkInTime))) {
      const checkInTime = parseISO(activeCheckInRecord.checkInTime);

      intervalId = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - checkInTime.getTime();

        if (diff < 0) return;

        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }, 1000);
    } else {
      setElapsedTime(null);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeCheckInRecord]);


  const fetchAllDashboardData = React.useCallback(async () => {
    if (user?.studentId || user?.email) {
        setIsLoadingStudentData(true);
        setIsLoadingStudyHours(true);
        setIsLoadingCurrentSession(true);

        setStudentFirstName(null);
        setStudentId(null);
        setMonthlyStudyHours(null);
        setHasUnreadAlerts(false);
        setActiveCheckInRecord(null);
        setHoursStudiedToday(null);
        setStudentFeeStatus(null);
        setStudentNextDueDate(null);

      let studentDetailsFetchedSuccessfully = false;
      try {
        let studentDetails = null;
        if (user.studentId) {
          studentDetails = await getStudentByCustomId(user.studentId);
        } else if (user.email) {
          studentDetails = await getStudentByEmail(user.email);
        }

        if (studentDetails) {
          studentDetailsFetchedSuccessfully = true;
          setStudentId(studentDetails.studentId);
          setStudentFirstName(studentDetails.name ? studentDetails.name.split(' ')[0] : null);
          setStudentFeeStatus(studentDetails.feeStatus);
          setStudentNextDueDate(studentDetails.nextDueDate || null);

          const [
            alerts,
            hours,
            activeCheckInData,
            todayAttendanceData
          ] = await Promise.all([
            getAlertsForStudent(studentDetails.studentId),
            calculateMonthlyStudyHours(studentDetails.studentId),
            getActiveCheckIn(studentDetails.studentId),
            getAttendanceForDate(studentDetails.studentId, format(new Date(), 'yyyy-MM-dd'))
          ]);

          setHasUnreadAlerts(alerts.some(alert => !alert.isRead));
          setMonthlyStudyHours(hours);

          setActiveCheckInRecord(activeCheckInData || null);
          let totalMillisecondsToday = 0;
          const now = new Date();
          todayAttendanceData.forEach(record => {
            if (record.checkOutTime && record.checkInTime && isValid(parseISO(record.checkOutTime)) && isValid(parseISO(record.checkInTime))) {
              totalMillisecondsToday += differenceInMilliseconds(parseISO(record.checkOutTime), parseISO(record.checkInTime));
            } else if (activeCheckInData && record.recordId === activeCheckInData.recordId && record.checkInTime && isValid(parseISO(record.checkInTime))) {
              totalMillisecondsToday += differenceInMilliseconds(now, parseISO(record.checkInTime));
            }
          });
          setHoursStudiedToday(totalMillisecondsToday / (1000 * 60 * 60));

        } else {
            toast({ title: "Error", description: "Could not find your student record.", variant: "destructive" });
        }
      } catch (error: any) {
        console.error("Detailed error fetching dashboard data:", error);
        toast({ title: "Error", description: error.message || "Could not load all dashboard information.", variant: "destructive" });
      } finally {
        setIsLoadingStudentData(false);
        setIsLoadingStudyHours(false);
        setIsLoadingCurrentSession(false);
        if (!studentDetailsFetchedSuccessfully) {
            setStudentFirstName(null); setStudentId(null); setMonthlyStudyHours(null);
            setHasUnreadAlerts(false); setActiveCheckInRecord(null); setHoursStudiedToday(null);
            setStudentFeeStatus(null); setStudentNextDueDate(null);
        }
      }
    } else {
      setIsLoadingStudentData(false); setIsLoadingStudyHours(false); setIsLoadingCurrentSession(false);
      setStudentFirstName(null); setStudentId(null); setMonthlyStudyHours(null);
      setHasUnreadAlerts(false); setActiveCheckInRecord(null); setHoursStudiedToday(null);
      setStudentFeeStatus(null); setStudentNextDueDate(null);
    }
  }, [user, toast]);


  React.useEffect(() => {
    fetchAllDashboardData();

    // Set up interval to refresh data every 5 minutes (300000 milliseconds)
    const intervalId = setInterval(fetchAllDashboardData, 300000);

    // Clear the interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchAllDashboardData]);

  const handleCloseScanner = React.useCallback(async () => {
    if (html5QrcodeScannerRef.current && typeof html5QrcodeScannerRef.current.clear === 'function') {
        if (html5QrcodeScannerRef.current.getState() !== 0 /* Html5QrcodeScannerState.NOT_STARTED */) {
            try {
                await html5QrcodeScannerRef.current.clear();
            } catch (clearError) {
                console.warn("Error clearing scanner on close:", clearError);
            } finally {
                html5QrcodeScannerRef.current = null;
            }
        }
    }
    setIsScannerOpen(false);
  }, []);


  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isScannerOpen && studentId) {
      timeoutId = setTimeout(async () => {
        const scannerElement = document.getElementById(DASHBOARD_QR_SCANNER_ELEMENT_ID);
        if (!scannerElement) {
          console.warn("Dashboard QR scanner element not found after delay. Dialog might not be fully rendered yet.");
          toast({variant: 'destructive', title: "Scanner Error", description: "Could not initialize QR scanner display. Please try again."});
          await handleCloseScanner();
          return;
        }

        if (html5QrcodeScannerRef.current) {
          if (typeof html5QrcodeScannerRef.current.clear === 'function') {
             try {
                if (html5QrcodeScannerRef.current.getState() !== 0) {
                    await html5QrcodeScannerRef.current.clear();
                }
             } catch(e) { console.warn("Pre-clear failed:", e)}
             finally { html5QrcodeScannerRef.current = null; }
          }
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
              facingMode: "environment" }
            ,
            verbose: false, // Added to prevent header message errors
        };

        const scanner = new Html5QrcodeScanner(DASHBOARD_QR_SCANNER_ELEMENT_ID, config, true);
        html5QrcodeScannerRef.current = scanner;

        const onScanSuccess = async (decodedText: string, decodedResult: any) => {
          if (isProcessingQr) return;
          setIsProcessingQr(true);

          if (html5QrcodeScannerRef.current && html5QrcodeScannerRef.current.getState() === 2 /* PAUSED */) {
              // Already paused, no need to pause again, just proceed.
          } else if (html5QrcodeScannerRef.current) {
              try { await html5QrcodeScannerRef.current.pause(true); }
              catch(e) { console.warn("Scanner pause error", e); }
          }

          if (decodedText === LIBRARY_QR_CODE_PAYLOAD) {
            try {
              if (studentId) {
                  await addCheckIn(studentId);
                  toast({ title: "Checked In!", description: `Successfully checked in at ${new Date().toLocaleTimeString()}.` });
                  await fetchAllDashboardData();
              } else {
                  toast({ title: "Error", description: "Student ID not available for scan processing.", variant: "destructive"});
              }
            } catch (error: any) {
              console.error("Detailed error during scan processing (Dashboard):", error);
              toast({ title: "Scan Error", description: error.message || "Failed to process attendance. Please try again.", variant: "destructive" });
            }
          } else {
            toast({ title: "Invalid QR Code", description: "Please scan the official library QR code.", variant: "destructive" });
            setTimeout(async () => {
              if (html5QrcodeScannerRef.current ) {
                try {
                  if (html5QrcodeScannerRef.current.getState() === 2 /* PAUSED */) {
                     html5QrcodeScannerRef.current.resume();
                  }
                } catch(e) { console.warn("Scanner resume error", e); }
              }
            }, 1000);
          }

          if (html5QrcodeScannerRef.current && typeof html5QrcodeScannerRef.current.clear === 'function') {
            try {
                if (html5QrcodeScannerRef.current.getState() !== 0) await html5QrcodeScannerRef.current.clear();
            } catch (clearError) {
                console.warn("Error clearing scanner on success:", clearError);
            } finally {
                html5QrcodeScannerRef.current = null;
            }
          }
          setIsProcessingQr(false);
          setIsScannerOpen(false);
        };

        const onScanFailure = async (errorPayload: any) => {
          let errorMessage = typeof errorPayload === 'string' ? errorPayload : (errorPayload?.message || JSON.stringify(errorPayload));
          const errorMsgLower = errorMessage.toLowerCase();

          if (!errorMsgLower.includes("no qr code found")) {
            if (
                errorMsgLower.includes("permission denied") ||
                errorMsgLower.includes("notallowederror") ||
                errorMsgLower.includes("notfounderror") ||
                errorMsgLower.includes("aborterror")
            ) {
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera or Scanner Error',
                    description: 'Could not start QR scanner. Ensure camera permissions are enabled and no other app is using the camera. Try again.',
                });
                await handleCloseScanner();
            } else {
              console.warn("Dashboard QR Scan Failure (other, non-critical):", errorMessage, errorPayload);
            }
          }
        };

        try {
          scanner.render(onScanSuccess, onScanFailure);
          setHasCameraPermission(true);
        } catch (err: any) {
              console.error("Error rendering scanner (Dashboard - render call failed):", err);
              setHasCameraPermission(false);
              toast({ variant: 'destructive', title: 'Camera Initialization Error', description: err.message || 'Could not initialize camera for QR scanning.'});
              await handleCloseScanner();
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (html5QrcodeScannerRef.current && typeof html5QrcodeScannerRef.current.clear === 'function') {
            if (html5QrcodeScannerRef.current.getState() !== 0) {
                html5QrcodeScannerRef.current.clear()
                  .catch((err) => console.warn("Cleanup: Error clearing scanner (Dashboard):", err))
                  .finally(() => { html5QrcodeScannerRef.current = null; });
            } else {
                 html5QrcodeScannerRef.current = null;
            }
        }
      };
    }
  }, [isScannerOpen, studentId, toast, fetchAllDashboardData, handleCloseScanner, isProcessingQr]);


  const handleOpenScanner = React.useCallback(() => {
    if (studentFeeStatus === 'Overdue') {
      setIsOverdueDialogOpen(true);
      return;
    }
    if (!studentId) {
        toast({title: "Error", description: "Cannot mark attendance. Student details not loaded.", variant: "destructive"});
        return;
    }
    if (activeCheckInRecord) {
        toast({title: "Already Checked In", description: "You are already checked in. Use the 'Check Out' button.", variant: "default"});
        return;
    }
    setHasCameraPermission(null);
    setIsProcessingQr(false);
    setIsScannerOpen(true);
  }, [studentId, activeCheckInRecord, toast, studentFeeStatus]);


  const handleDashboardCheckOut = async () => {
    if (!studentId || !activeCheckInRecord) {
      toast({ title: "Error", description: "Cannot check out. Active session not found or student ID missing.", variant: "destructive" });
      return;
    }
    setIsProcessingCheckout(true);
    try {
      await addCheckOut(activeCheckInRecord.recordId);
      toast({
        title: "Checked Out!",
        description: `Successfully checked out at ${new Date().toLocaleTimeString()}.`,
      });
      await fetchAllDashboardData();
    } catch (error: any) {
      console.error("Error during dashboard check-out:", error);
      toast({ title: "Check-out Error", description: error.message || "Failed to process check-out. Please try again.", variant: "destructive" });
    } finally {
      setIsProcessingCheckout(false);
    }
  };


  let activityStatisticDisplay: string | null = null;
  let activityDescription: string = "Track your study hours.";

  if (isLoadingStudentData || isLoadingStudyHours) {
    activityStatisticDisplay = null;
    activityDescription = "Loading hours...";
  } else if (studentId) {
    if (monthlyStudyHours === null) {
      activityStatisticDisplay = "0 hours";
      activityDescription = "No activity recorded yet.";
    } else if (monthlyStudyHours === 0) {
      activityStatisticDisplay = "0 hours";
      activityDescription = "No hours recorded this month.";
    } else {
      activityStatisticDisplay = `${monthlyStudyHours} hours`;
      activityDescription = "studied this month";
    }
  } else if (!isLoadingStudentData && !studentId) {
    activityStatisticDisplay = "N/A";
    activityDescription = "Student record not linked.";
  }


  const generateCoreActionTiles = (): DashboardTileProps[] => {
    let payFeesTileDesc = "Settle your outstanding dues.";
    let payFeesTileStatistic: string | null = null;
    let payFeesTileIsUrgent = false;

    if (isLoadingStudentData) {
      payFeesTileDesc = "Loading fee status...";
    } else if (studentId) {
      if (studentFeeStatus === "Due" || studentFeeStatus === "Overdue") {
        payFeesTileIsUrgent = true;
        payFeesTileDesc = `Status: ${studentFeeStatus}. Next payment due: ${studentNextDueDate && isValid(parseISO(studentNextDueDate)) ? format(parseISO(studentNextDueDate), 'PP') : 'N/A'}.`;
      } else if (studentFeeStatus === "Paid") {
        payFeesTileDesc = `Fees paid up to: ${studentNextDueDate && isValid(parseISO(studentNextDueDate)) ? format(parseISO(studentNextDueDate), 'PP') : 'N/A'}.`;
      } else if (studentFeeStatus) {
         payFeesTileDesc = `Fee status: ${studentFeeStatus}.`;
      }
    }


    return [
      {
        title: "View Alerts",
        description: "Catch up on announcements.",
        icon: Bell,
        href: "/member/alerts",
        hasNew: isLoadingStudentData ? false : hasUnreadAlerts,
        disabled: !studentId,
      },
      {
        title: "Activity Summary",
        statistic: activityStatisticDisplay,
        description: activityDescription,
        isLoadingStatistic: isLoadingStudentData || isLoadingStudyHours,
        icon: BarChart3,
        href: "/member/attendance",
        disabled: !studentId,
      },
      {
        title: "Pay Fees",
        description: payFeesTileDesc,
        statistic: payFeesTileStatistic,
        isLoadingStatistic: isLoadingStudentData,
        icon: IndianRupee,
        href: "/member/pay",
        isUrgent: payFeesTileIsUrgent,
        disabled: !studentId,
      },
      {
        title: "Submit Feedback",
        description: "Share suggestions or issues.",
        icon: MessageSquare,
        href: "/member/feedback",
        disabled: !studentId,
      },
    ];
  };

  const coreActionTiles = generateCoreActionTiles();


  const otherResourcesTiles: DashboardTileProps[] = [
    {
      title: "Library Rules",
      description: "Familiarize yourself with guidelines.",
      icon: ScrollText,
      href: "/member/rules",
    },
    {
      title: "Rate Us",
      description: "Love our space? Let others know!",
      icon: Star,
      href: "https://g.page/r/CS-yYFo4JxNXEBM/review", // Corrected Rate Us link
      external: true,
    },
  ];

  const defaultWelcomeName = user?.email?.split('@')[0] || 'Member';
  const pageTitleText = isLoadingStudentData && !studentFirstName
    ? `Welcome, ${defaultWelcomeName}!`
    : (studentFirstName ? `Welcome, ${studentFirstName}!` : `Welcome, ${defaultWelcomeName}!`);

  const primaryAttendanceAction = activeCheckInRecord ? handleDashboardCheckOut : handleOpenScanner;
  let primaryAttendanceTitle: string;
  let primaryAttendanceIcon: React.ElementType;

  if (isLoadingCurrentSession) {
    primaryAttendanceTitle = "Loading...";
    primaryAttendanceIcon = Loader2;
  } else if (activeCheckInRecord) {
    primaryAttendanceTitle = "Tap to Check Out";
    primaryAttendanceIcon = LogOut;
  } else {
    primaryAttendanceTitle = "Scan to Check In";
    primaryAttendanceIcon = ScanLine;
  }

  const primaryAttendanceDisabled = !studentId || isLoadingCurrentSession || (activeCheckInRecord && isProcessingCheckout) || (!activeCheckInRecord && isScannerOpen);


  return (
    <>
      <PageTitle title={pageTitleText} description="Your Taxshila Companion dashboard." />

      {activeCheckInRecord && elapsedTime && (
        <Card className="my-4 text-center shadow-lg bg-background">
          <CardHeader className="pb-2">
            <ShadcnCardTitle className="text-muted-foreground font-medium text-sm tracking-widest uppercase">
              Current Session Time
            </ShadcnCardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-5xl sm:text-7xl font-bold font-mono tracking-tighter text-primary">
              {elapsedTime}
            </div>
          </CardContent>
        </Card>
      )}

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

       <div className="mt-1 mb-4 text-xs text-center text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-1">
            {isLoadingCurrentSession ? (
              <div className="flex items-center justify-center">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                <span>Loading session...</span>
              </div>
            ) : activeCheckInRecord ? (
              <div className="flex items-center">
                <PlayCircle className="mr-1 h-3 w-3 text-green-600" />
                <span>Checked In (since {activeCheckInRecord.checkInTime && isValid(parseISO(activeCheckInRecord.checkInTime)) ? format(parseISO(activeCheckInRecord.checkInTime), 'p') : 'N/A'})</span>
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
        <span>
          Today: {Math.floor(hoursStudiedToday)} hr{" "}
          {Math.round((hoursStudiedToday % 1) * 60)} min
        </span>
      </div>
    )}

            {hoursStudiedToday === 0 && !activeCheckInRecord && !isLoadingCurrentSession && (
                <div className="flex items-center">
                <Hourglass className="mr-1 h-3 w-3 text-blue-500" />
                <span>No study today.</span>
              </div>
            )}
          </div>
        </div>


      <div className="mb-6">
        <DashboardTile
          title={primaryAttendanceTitle}
          description={activeCheckInRecord ? "You are currently checked in." : "Scan the library QR code for attendance."}
          icon={primaryAttendanceIcon}
          action={primaryAttendanceAction}
          isPrimaryAction={!primaryAttendanceDisabled}
          isLoadingStatistic={isLoadingCurrentSession && primaryAttendanceIcon === Loader2}
          disabled={primaryAttendanceDisabled}
          className={cn(
            (activeCheckInRecord && !isProcessingCheckout && !isLoadingCurrentSession && !primaryAttendanceDisabled)
              ? 'bg-green-600 hover:bg-green-700'
              : ''
          )}
        />
      </div>

       <Dialog open={isScannerOpen} onOpenChange={(open) => { if(!open) handleCloseScanner(); else if (!activeCheckInRecord) handleOpenScanner();}}>
         <DialogContent className="w-[90vw] max-w-xs sm:max-w-sm md:max-w-md p-4 flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <ShadcnDialogTitle className="flex items-center"><Camera className="mr-2"/>Scan Library QR Code</ShadcnDialogTitle>
              <DialogDescription>
                Point your camera at the QR code provided at the library desk to check-in.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-grow flex flex-col gap-3 mt-3 min-h-0">
              {hasCameraPermission === false && (
                <Alert variant="destructive" className="flex-shrink-0">
                  <XCircle className="h-4 w-4" />
                  <ShadcnAlertTitle>Camera Access Denied</ShadcnAlertTitle>
                  <AlertDescription>
                    Camera access is required. Please enable it in your browser settings and try again.
                  </AlertDescription>
                </Alert>
              )}

              <div
                id={DASHBOARD_QR_SCANNER_ELEMENT_ID}
                className="w-full aspect-square bg-muted rounded-md border"
              />

              {(hasCameraPermission === null && !isProcessingQr) && (
                  <div className="flex items-center justify-center text-muted-foreground text-sm py-2 flex-shrink-0">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Initializing camera...
                  </div>
              )}
              {isProcessingQr && (
                  <div className="flex items-center justify-center text-muted-foreground text-sm py-2 flex-shrink-0">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing QR code...
                  </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-4 flex-shrink-0">
                <Button variant="outline" onClick={handleCloseScanner} className="w-full" disabled={isProcessingQr}>
                  Cancel
                </Button>
            </div>
          </DialogContent>
      </Dialog>

      {!studentId && !isLoadingStudentData && (
         <p className="text-xs text-destructive text-center mb-4">Could not load your student record. Some features may be unavailable.</p>
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

    

    

