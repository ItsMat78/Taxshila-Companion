
"use client";

import * as React from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogTrigger,
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
import { Camera, QrCode, Receipt, IndianRupee, MessageSquare, Bell, ScrollText, Star, Loader2, XCircle, Home, BarChart3, PlayCircle, CheckCircle, Hourglass, ScanLine, LogOut, AlertCircle, X, Eye, RefreshCw, View, Wifi, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentByEmail, getAlertsForStudent, addCheckIn, addCheckOut, getActiveCheckIn, getAttendanceForDate, getStudentByCustomId, getWifiConfiguration } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import type { Student, AttendanceRecord, FeeStatus, Shift, WifiConfig } from '@/types/student';
import { format, parseISO, differenceInMilliseconds, isValid, differenceInMinutes, differenceInHours } from 'date-fns';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeScanType } from 'html5-qrcode';
import { setupPushNotifications } from '@/lib/notification-setup';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import NextImage from 'next/image';

const DASHBOARD_QR_SCANNER_ELEMENT_ID = "qr-reader-dashboard";
const LIBRARY_QR_CODE_PAYLOAD = "TAXSHILA_LIBRARY_CHECKIN_QR_V1";
const DEFAULT_PROFILE_PLACEHOLDER = "https://placehold.co/400x400.png";

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
  children?: React.ReactNode; // Added children prop
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
  children
}) => {
  const content = (
    <Card className={cn(
      "shadow-lg h-full flex flex-col",
      isPrimaryAction ? 'text-primary-foreground' : '',
      disabled ? 'opacity-60 cursor-not-allowed bg-muted/50' : (isPrimaryAction ? 'hover:opacity-90' : 'hover:bg-muted/50 hover:shadow-xl transition-shadow'),
      className
    )}>
      <CardHeader className={cn(
        "relative",
        isPrimaryAction ? "p-3 sm:p-4 pb-1 sm:pb-2" : "p-2 sm:p-3 pb-0 sm:pb-1"
      )}>
        {(hasNew || isUrgent) && (
          <span className={cn(
            "absolute top-1 right-1 block h-2.5 w-2.5 rounded-full ring-1 ring-white",
             isUrgent ? 'bg-destructive' : 'bg-primary'
          )} />
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
        ) : children ? (
          <div className="w-full">{children}</div>
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

function NotificationPrompt({ onDismiss }: { onDismiss: () => void }) {
  const { user } = useAuth();

  const handleEnableNotifications = async () => {
    if (user && user.firestoreId && user.role) {
      await setupPushNotifications(user.firestoreId, user.role);
    }
    onDismiss();
  };

  return (
    <Alert className="mb-6 border-primary/30 bg-primary/5 relative">
      <Bell className="h-4 w-4 text-primary" />
      <ShadcnAlertTitle className="font-semibold text-primary">Enable Notifications</ShadcnAlertTitle>
      <AlertDescription>
        Stay up-to-date with important alerts and announcements from the library.
      </AlertDescription>
      <div className="mt-3 flex gap-2">
        <Button onClick={handleEnableNotifications} size="sm">Enable Notifications</Button>
        <Button onClick={onDismiss} size="sm" variant="ghost" className="absolute top-2 right-2 h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}


const motivationalQuotes = [
  "Stay motivated.",
  "You got this.",
  "Never give up.",
  "Progress, not perfection.",
  "Find a way.",
  "Make it happen.",
  "Keep moving forward.",
  "You are strong.",
  "See it through.",
  "Trust the process.",
  "Dare to begin.",
  "Stay the course.",
  "Embrace the journey."
];


export default function MemberDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const html5QrcodeScannerRef = React.useRef<Html5QrcodeScanner | null>(null);

  const [wifiConfig, setWifiConfig] = React.useState<WifiConfig[]>([]);
  const [isLoadingWifi, setIsLoadingWifi] = React.useState(true);
  const [isWifiDialogOpen, setIsWifiDialogOpen] = React.useState(false);
  const [currentStudent, setCurrentStudent] = React.useState<Student | null>(null);
  const [studentId, setStudentId] = React.useState<string | null>(null);
  const [studentFirstName, setStudentFirstName] = React.useState<string | null>(null);
  const [hasUnreadAlerts, setHasUnreadAlerts] = React.useState(false);
  const [isLoadingStudentData, setIsLoadingStudentData] = React.useState(true);

  const [activeCheckInRecord, setActiveCheckInRecord] = React.useState<AttendanceRecord | null>(null);
  const [isLoadingCurrentSession, setIsLoadingCurrentSession] = React.useState(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = React.useState(false);

  const [motivationalQuote, setMotivationalQuote] = React.useState("Stay motivated.");
  const [studentFeeStatus, setStudentFeeStatus] = React.useState<FeeStatus | null>(null);
  const [studentNextDueDate, setStudentNextDueDate] = React.useState<string | null>(null);
  const [isOverdueDialogOpen, setIsOverdueDialogOpen] = React.useState(false);
  const [elapsedTime, setElapsedTime] = React.useState<string | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        setShowNotificationPrompt(true);
      } else {
        setShowNotificationPrompt(false);
      }
    }
  }, []);

  const handleDismissPrompt = () => {
    setShowNotificationPrompt(false);
  };


  const fetchAllDashboardData = React.useCallback(async (isManualRefresh = false) => {
    if (user?.studentId || user?.email) {
        if (isManualRefresh) setIsRefreshing(true);

        setIsLoadingStudentData(true);
        setIsLoadingCurrentSession(true);
        setIsLoadingWifi(true);

        setStudentFirstName(null);
        setStudentId(null);
        setHasUnreadAlerts(false);
        setActiveCheckInRecord(null);
        setStudentFeeStatus(null);
        setStudentNextDueDate(null);
        setCurrentStudent(null);
        setWifiConfig([]);

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
          setCurrentStudent(studentDetails);
          setStudentId(studentDetails.studentId);
          setStudentFirstName(studentDetails.name ? studentDetails.name.split(' ')[0] : null);
          setStudentFeeStatus(studentDetails.feeStatus);
          setStudentNextDueDate(studentDetails.nextDueDate || null);

          const [
            alerts,
            activeCheckInData,
            wifiData
          ] = await Promise.all([
            getAlertsForStudent(studentDetails.studentId),
            getActiveCheckIn(studentDetails.studentId),
            getWifiConfiguration(),
          ]);

          setHasUnreadAlerts(alerts.some(alert => !alert.isRead));
          setActiveCheckInRecord(activeCheckInData || null);
          setWifiConfig(wifiData);

        } else {
            toast({ title: "Error", description: "Could not find your student record.", variant: "destructive" });
        }
      } catch (error: any) {
        console.error("Detailed error fetching dashboard data:", error);
        toast({ title: "Error", description: error.message || "Could not load all dashboard information.", variant: "destructive" });
      } finally {
        setIsLoadingStudentData(false);
        setIsLoadingCurrentSession(false);
        setIsLoadingWifi(false);
        if (isManualRefresh) setIsRefreshing(false);
        if (!studentDetailsFetchedSuccessfully) {
            setStudentFirstName(null); setStudentId(null);
            setHasUnreadAlerts(false); setActiveCheckInRecord(null);
            setStudentFeeStatus(null); setStudentNextDueDate(null);
            setCurrentStudent(null); setWifiConfig([]);
        }
      }
    } else {
      setIsLoadingStudentData(false); setIsLoadingCurrentSession(false); setIsLoadingWifi(false);
      setStudentFirstName(null); setStudentId(null);
      setHasUnreadAlerts(false); setActiveCheckInRecord(null);
      setStudentFeeStatus(null); setStudentNextDueDate(null);
      setCurrentStudent(null); setWifiConfig([]);
    }
  }, [user, toast]);


  React.useEffect(() => {
    fetchAllDashboardData();
    const intervalId = setInterval(() => fetchAllDashboardData(true), 300000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, [user]); // Re-run only when user object changes

  // This effect updates the displayed time string
   React.useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    if (activeCheckInRecord?.checkInTime && isValid(parseISO(activeCheckInRecord.checkInTime))) {
      const updateElapsedTime = () => {
        const now = new Date();
        const checkInTime = parseISO(activeCheckInRecord.checkInTime);
        const hours = differenceInHours(now, checkInTime);
        const minutes = differenceInMinutes(now, checkInTime) % 60;
        setElapsedTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
      };
      
      updateElapsedTime();
      timerId = setInterval(updateElapsedTime, 30000); // Update every 30 seconds
    } else {
      setElapsedTime(null);
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [activeCheckInRecord, isRefreshing]); // Re-run when activeCheckInRecord or refresh state changes


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
        };

        const scanner = new Html5QrcodeScanner(DASHBOARD_QR_SCANNER_ELEMENT_ID, config, false);
        html5QrcodeScannerRef.current = scanner;

        const onScanSuccess = async (decodedText: string, decodedResult: any) => {
          if (isProcessingQr) return;
          setIsProcessingQr(true);

          if (html5QrcodeScannerRef.current && html5QrcodeScannerRef.current.getState() === 2 /* PAUSED */) {
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

  const getShiftColorClass = (shift: Shift | undefined) => {
    if (!shift) return 'bg-gray-100 text-gray-800 border-gray-300';
    switch (shift) {
      case 'morning': return 'bg-seat-morning text-seat-morning-foreground border-orange-300 dark:border-orange-700';
      case 'evening': return 'bg-seat-evening text-seat-evening-foreground border-purple-300 dark:border-purple-700';
      case 'fullday': return 'bg-seat-fullday text-seat-fullday-foreground border-yellow-300 dark:border-yellow-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Password copied to clipboard." });
    }, (err) => {
      toast({ title: "Copy Failed", description: "Could not copy password.", variant: "destructive" });
    });
  };

  const generateCoreActionTiles = (): DashboardTileProps[] => {
    let payFeesTileDesc = "Settle your outstanding dues.";
    let payFeesIsUrgent = false;
    let payFeesClass = "";
    
    if (isLoadingStudentData) {
      payFeesTileDesc = "Loading fee status...";
    } else if (studentId) {
      switch (studentFeeStatus) {
        case "Due":
          payFeesIsUrgent = true;
          payFeesTileDesc = `Status: Due. Next payment due: ${studentNextDueDate && isValid(parseISO(studentNextDueDate)) ? format(parseISO(studentNextDueDate), 'PP') : 'N/A'}.`;
          payFeesClass = "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700/50";
          break;
        case "Overdue":
          payFeesIsUrgent = true;
          payFeesTileDesc = `Status: Overdue. Payment is late.`;
          payFeesClass = "bg-destructive/20 text-destructive border-destructive/50";
          break;
        case "Paid":
          payFeesTileDesc = `Fees paid up to: ${studentNextDueDate && isValid(parseISO(studentNextDueDate)) ? format(parseISO(studentNextDueDate), 'PP') : 'N/A'}.`;
          break;
        default:
          payFeesTileDesc = `Fee status: ${studentFeeStatus || 'N/A'}.`;
          break;
      }
    }


    return [
      {
        title: "Alerts!",
        description: "Catch up on announcements.",
        icon: Bell,
        href: "/member/alerts",
        hasNew: !isLoadingStudentData && hasUnreadAlerts,
        isUrgent: !isLoadingStudentData && hasUnreadAlerts,
        disabled: !studentId,
        className: hasUnreadAlerts ? "bg-destructive/20 animate-breathing-stroke" : "",
      },
      {
        title: "Activity Summary",
        description: "View your attendance and study hours.",
        icon: BarChart3,
        href: "/member/attendance",
        disabled: !studentId,
      },
      {
        title: "My Payments",
        description: payFeesTileDesc,
        isLoadingStatistic: isLoadingStudentData,
        icon: IndianRupee,
        href: "/member/fees",
        isUrgent: payFeesIsUrgent,
        disabled: !studentId,
        className: payFeesClass,
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

  const defaultWelcomeName = user?.email?.split('@')[0] || 'Member';
  const pageTitleText = isLoadingStudentData && !studentFirstName
    ? `Welcome, ${defaultWelcomeName}!`
    : (studentFirstName ? `Welcome, ${studentFirstName}!` : `Welcome, ${defaultWelcomeName}!`);

  const primaryAttendanceAction = activeCheckInRecord ? undefined : handleOpenScanner;
  let primaryAttendanceTitle = "Scan to Check In";
  let primaryAttendanceIcon: React.ElementType = ScanLine;

  if (isLoadingCurrentSession) {
    primaryAttendanceTitle = "Loading...";
    primaryAttendanceIcon = Loader2;
  }

  const primaryAttendanceDisabled = !studentId || isLoadingCurrentSession || isScannerOpen;


  return (
    <>
      <div className="mb-6 flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link href="/member/profile" passHref legacyBehavior>
            <a className="cursor-pointer relative group flex-shrink-0">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-primary shadow-md">
                <AvatarImage src={currentStudent?.profilePictureUrl || user?.profilePictureUrl || undefined} alt={currentStudent?.name} data-ai-hint="profile person" />
                <AvatarFallback className="text-2xl">{getInitials(currentStudent?.name)}</AvatarFallback>
              </Avatar>
            </a>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-headline font-semibold tracking-tight md:text-2xl leading-tight">{pageTitleText}</h1>
            <p className="text-muted-foreground text-sm">{motivationalQuote}</p>
          </div>
        </div>
        {currentStudent && (
          <div className={cn("flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 text-md sm:text-lg rounded-lg border-2 font-bold flex-shrink-0", getShiftColorClass(currentStudent.shift))} title={`Seat ${currentStudent.seatNumber}`}>
            {currentStudent.seatNumber || 'N/A'}
          </div>
        )}
      </div>

      {showNotificationPrompt && <NotificationPrompt onDismiss={handleDismissPrompt} />}

      {activeCheckInRecord && (
        <Card className="my-6 shadow-lg rounded-lg overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <ShadcnCardDescription className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Current Session</ShadcnCardDescription>
              <div className="text-5xl sm:text-6xl font-bold font-mono tracking-tighter text-primary">
                {elapsedTime || "00:00"}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground space-y-2">
                <div className="flex items-center justify-end">
                    <PlayCircle className="mr-1.5 h-3 w-3 text-green-600" />
                    <span>Checked In: {activeCheckInRecord.checkInTime && isValid(parseISO(activeCheckInRecord.checkInTime)) ? format(parseISO(activeCheckInRecord.checkInTime), 'p') : 'N/A'}</span>
                </div>
                <Button variant="link" size="sm" onClick={() => fetchAllDashboardData(true)} className="h-auto p-0 text-xs" disabled={isRefreshing}>
                    {isRefreshing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3"/>}
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
            </div>
          </CardContent>
          <CardFooter className="p-0">
             <Button
                onClick={handleDashboardCheckOut}
                disabled={isProcessingCheckout}
                className={cn(
                  "w-full rounded-t-none h-12 text-base text-primary-foreground animate-gradient-sweep-green"
                )}
             >
                {isProcessingCheckout ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <LogOut className="mr-2 h-5 w-5" />
                )}
                Tap to Check Out
             </Button>
          </CardFooter>
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

       {!activeCheckInRecord && (
         <div className="mb-6">
            <DashboardTile
              title={primaryAttendanceTitle}
              description="Scan the library QR code for attendance."
              icon={primaryAttendanceIcon}
              action={primaryAttendanceAction}
              isPrimaryAction={!primaryAttendanceDisabled}
              isLoadingStatistic={isLoadingCurrentSession && primaryAttendanceIcon === Loader2}
              disabled={primaryAttendanceDisabled}
              className={cn(!primaryAttendanceDisabled && "animate-gradient-sweep")}
            />
        </div>
       )}


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

      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <DashboardTile
            title="Library Rules"
            description="Familiarize yourself with guidelines."
            icon={ScrollText}
            href="/member/rules"
        />
        <Dialog open={isWifiDialogOpen} onOpenChange={setIsWifiDialogOpen}>
          <DialogTrigger asChild>
            <button className="block w-full h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
                <DashboardTile
                  title="WiFi Details"
                  description="View network credentials."
                  icon={Wifi}
                  isLoadingStatistic={isLoadingWifi}
                />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <ShadcnDialogTitle>Library WiFi Details</ShadcnDialogTitle>
              <DialogDescription>
                Connect to the library's network using the credentials below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {isLoadingWifi ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin"/>
                </div>
              ) : wifiConfig.length > 0 ? (
                wifiConfig.map(wifi => (
                  <div key={wifi.id} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{wifi.ssid}</p>
                    {wifi.password && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono p-2 bg-muted rounded-md flex-1 break-all">{wifi.password}</p>
                          <Button variant="outline" size="sm" onClick={() => handleCopy(wifi.password!)}>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground">No WiFi networks are currently configured.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <DashboardTile
            title="Rate Us"
            description="Love our space? Let others know!"
            icon={Star}
            href="https://g.page/r/CS-yYFo4JxNXEBM/review"
            external={true}
        />
      </div>
    </>
  );
}


    

    