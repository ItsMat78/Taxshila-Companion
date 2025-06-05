
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
import { Camera, QrCode, Receipt, IndianRupee, MessageSquare, Bell, ScrollText, Star, Loader2, XCircle, Home, BarChart3, PlayCircle, CheckCircle, Hourglass, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentByEmail, getAlertsForStudent, calculateMonthlyStudyHours, addCheckIn, addCheckOut, getActiveCheckIn, getAttendanceForDate } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import type { Student, AttendanceRecord, FeeStatus } from '@/types/student';
import { format, parseISO, differenceInMilliseconds, isValid } from 'date-fns';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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
            isPrimaryAction ? "h-5 w-5 sm:h-6 sm:w-6" : "h-5 w-5 sm:h-6 sm:w-6 mb-1"
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
        {isLoadingStatistic ? (
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

  const [studentFeeStatus, setStudentFeeStatus] = React.useState<FeeStatus | null>(null);
  const [studentNextDueDate, setStudentNextDueDate] = React.useState<string | null>(null);

  const fetchAllDashboardData = React.useCallback(async () => {
    if (user?.email) {
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
        const studentDetails = await getStudentByEmail(user.email);
        if (studentDetails) {
          studentDetailsFetchedSuccessfully = true;
          setStudentId(studentDetails.studentId);
          setStudentFirstName(studentDetails.name ? studentDetails.name.split(' ')[0] : null);
          setStudentFeeStatus(studentDetails.feeStatus);
          setStudentNextDueDate(studentDetails.nextDueDate || null);

          // Fetch dependent data in parallel
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
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error", description: "Could not load all dashboard information.", variant: "destructive" });
      } finally {
        setIsLoadingStudentData(false);
        setIsLoadingStudyHours(false);
        setIsLoadingCurrentSession(false);
        if (!studentDetailsFetchedSuccessfully) {
            // Reset all states if student fetch failed
            setStudentFirstName(null); setStudentId(null); setMonthlyStudyHours(null);
            setHasUnreadAlerts(false); setActiveCheckInRecord(null); setHoursStudiedToday(null);
            setStudentFeeStatus(null); setStudentNextDueDate(null);
        }
      }
    } else {
      // No user logged in, reset all states and loading flags
      setIsLoadingStudentData(false); setIsLoadingStudyHours(false); setIsLoadingCurrentSession(false);
      setStudentFirstName(null); setStudentId(null); setMonthlyStudyHours(null);
      setHasUnreadAlerts(false); setActiveCheckInRecord(null); setHoursStudiedToday(null);
      setStudentFeeStatus(null); setStudentNextDueDate(null);
    }
  }, [user, toast]);


  React.useEffect(() => {
    fetchAllDashboardData();
  }, [fetchAllDashboardData]);

  React.useEffect(() => {
    if (isScannerOpen && studentId) { // Use studentId (state variable)
       const formatsToSupport = [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.EAN_13,
      ];
      const scanner = new Html5QrcodeScanner(
        DASHBOARD_QR_SCANNER_ELEMENT_ID,
        { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [],
            formatsToSupport: formatsToSupport
        },
        false // verbose
      );
      html5QrcodeScannerRef.current = scanner;

      const onScanSuccess = async (decodedText: string, decodedResult: any) => {
        if (isProcessingQr) return;
        setIsProcessingQr(true);
        scanner.pause(true);

        if (decodedText === LIBRARY_QR_CODE_PAYLOAD) {
          try {
            // Re-fetch active check-in status just before action to ensure it's current
            if (studentId) { // Use studentId (state variable)
                const currentActiveCheckIn = await getActiveCheckIn(studentId); 
                if (currentActiveCheckIn) {
                  await addCheckOut(currentActiveCheckIn.recordId);
                  toast({ title: "Checked Out!", description: `Successfully checked out at ${new Date().toLocaleTimeString()}.` });
                } else {
                  await addCheckIn(studentId); // Use studentId (state variable)
                  toast({ title: "Checked In!", description: `Successfully checked in at ${new Date().toLocaleTimeString()}.` });
                }
                await fetchAllDashboardData(); // Refresh all dashboard data
            } else {
                toast({ title: "Error", description: "Student ID not available for scan processing.", variant: "destructive"});
            }
          } catch (error) {
            toast({ title: "Scan Error", description: "Failed to process attendance. Please try again.", variant: "destructive" });
          }
        } else {
          toast({ title: "Invalid QR Code", description: "Please scan the official library QR code.", variant: "destructive" });
          setTimeout(() => scanner.resume(), 1000);
        }
        setIsProcessingQr(false);
        setIsScannerOpen(false); // Close scanner dialog
      };
      
      const onScanFailure = (error: any) => { /* console.warn(`QR error = ${error}`); */ };
      
      try {
        scanner.render(onScanSuccess, onScanFailure);
        setHasCameraPermission(true);
      } catch (err) {
            console.error("Error rendering scanner:", err);
            setHasCameraPermission(false);
            toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not initialize camera for QR scanning.'});
            setIsScannerOpen(false);
      }
    } else if (!isScannerOpen && html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(err => console.error("Error clearing scanner:", err));
        html5QrcodeScannerRef.current = null;
        setHasCameraPermission(null);
    }

    return () => {
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(err => console.error("Cleanup: Error clearing scanner:", err));
        html5QrcodeScannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScannerOpen, studentId, toast, fetchAllDashboardData]); // Corrected to studentId


  const handleOpenScanner = () => {
    if (!studentId) {
        toast({title: "Error", description: "Cannot mark attendance. Student details not loaded.", variant: "destructive"});
        return;
    }
    setIsScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
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
      href: "https://www.google.com/maps/search/?api=1&query=Taxshila+Study+Hall+Pune", 
      external: true,
    },
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
              title={isLoadingCurrentSession ? "Loading..." : (activeCheckInRecord ? "Scan to Check Out" : "Scan to Check In")}
              description="Scan the library QR code for attendance."
              icon={ScanLine}
              action={handleOpenScanner}
              isPrimaryAction={true}
              disabled={!studentId || isLoadingCurrentSession}
            />
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <ShadcnDialogTitle className="flex items-center"><Camera className="mr-2"/>Scan Library QR Code</ShadcnDialogTitle>
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
            
            <div id={DASHBOARD_QR_SCANNER_ELEMENT_ID} className="w-full aspect-square bg-muted rounded-md overflow-hidden" />

            {hasCameraPermission === null && (
                 <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing camera...
                </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button variant="outline" onClick={handleCloseScanner} className="w-full" disabled={isProcessingQr}>
                Cancel
              </Button>
          </div>
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
              {activeCheckInRecord ? (
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
                  <span>Today: {hoursStudiedToday.toFixed(1)} hrs</span>
                </div>
              )}
              {hoursStudiedToday === 0 && !activeCheckInRecord && (
                 <div className="flex items-center">
                  <Hourglass className="mr-1 h-3 w-3 text-blue-500" />
                  <span>No study today.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
