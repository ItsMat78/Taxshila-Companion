
"use client";

import * as React from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/shared/error-boundary';
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
import { IndianRupee, MessageSquare, Bell, ScrollText, Star, Loader2, BarChart3, PlayCircle, ScanLine, LogOut, AlertCircle, X, RefreshCw, Wifi, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentByEmail, getAlertsForStudent, addCheckIn, addCheckOut, getAttendanceForDate, getStudentByCustomId, getWifiConfiguration, subscribeToActiveCheckIn } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import type { Student, AttendanceRecord, FeeStatus, Shift, WifiConfig } from '@/types/student';
import { format, parseISO, differenceInMilliseconds, isValid } from 'date-fns';
import { setupPushNotifications } from '@/lib/notification-setup';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { DashboardTile } from '@/components/member/DashboardTile';
import type { DashboardTileProps } from '@/components/member/DashboardTile';
import { CheckInTimer } from '@/components/member/CheckInTimer';
import { QrScannerOverlay } from '@/components/member/QrScannerOverlay';

const LIBRARY_QR_CODE_PAYLOAD = "TAXSHILA_LIBRARY_CHECKIN_QR_V1";
const DEFAULT_PROFILE_PLACEHOLDER = "/logo.png";


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
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);

  const [wifiConfig, setWifiConfig] = React.useState<WifiConfig[]>([]);
  const [isLoadingWifi, setIsLoadingWifi] = React.useState(false);
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

        setStudentFirstName(null);
        setStudentId(null);
        setHasUnreadAlerts(false);
        setActiveCheckInRecord(null);
        setStudentFeeStatus(null);
        setStudentNextDueDate(null);
        setCurrentStudent(null);

      let studentDetailsFetchedSuccessfully = false;
      try {
        let studentDetails = null;
        if (user.studentId) {
          studentDetails = await getStudentByCustomId(user.studentId);
        } else if (user.email) {
          studentDetails = await getStudentByEmail(user.email);
        }

        if (studentDetails) {
          if (studentDetails.activityStatus === 'Left') {
            toast({
              title: "Account Inactive",
              description: "Your account is no longer active. You have been logged out.",
              variant: "destructive",
            });
            logout();
            return;
          }

          studentDetailsFetchedSuccessfully = true;
          setCurrentStudent(studentDetails);
          setStudentId(studentDetails.studentId);
          setStudentFirstName(studentDetails.name ? studentDetails.name.split(' ')[0] : null);
          setStudentFeeStatus(studentDetails.feeStatus);
          setStudentNextDueDate(studentDetails.nextDueDate || null);

          // Phase 1 complete — render name, fee status, and tiles immediately.
          // Check-in status is handled by a separate onSnapshot listener (see useEffect below).
          setIsLoadingStudentData(false);

          const alerts = await getAlertsForStudent(studentDetails.studentId);
          setHasUnreadAlerts(alerts.some(alert => !alert.isRead));

        } else {
            toast({ title: "Error", description: "Could not find your student record.", variant: "destructive" });
        }
      } catch (error: unknown) {
        console.error("Detailed error fetching dashboard data:", error);
        toast({ title: "Error", description: (error instanceof Error ? error.message : String(error)) || "Could not load all dashboard information.", variant: "destructive" });
      } finally {
        setIsLoadingStudentData(false);
        if (isManualRefresh) setIsRefreshing(false);
        if (!studentDetailsFetchedSuccessfully) {
            setStudentFirstName(null); setStudentId(null);
            setHasUnreadAlerts(false);
            setStudentFeeStatus(null); setStudentNextDueDate(null);
            setCurrentStudent(null);
        }
      }
    } else {
      setIsLoadingStudentData(false); setIsLoadingCurrentSession(false);
      setStudentFirstName(null); setStudentId(null);
      setHasUnreadAlerts(false); setActiveCheckInRecord(null);
      setStudentFeeStatus(null); setStudentNextDueDate(null);
      setCurrentStudent(null);
    }
  }, [user, toast, logout]);
  
  const handleOpenWifiDialog = async () => {
    setIsWifiDialogOpen(true);
    setIsLoadingWifi(true);
    setWifiConfig([]);
    try {
        const wifiData = await getWifiConfiguration();
        setWifiConfig(wifiData);
    } catch (error) {
        console.error("Failed to fetch WiFi details on demand:", error);
        toast({ title: "Error", description: "Could not load WiFi details.", variant: "destructive" });
    } finally {
        setIsLoadingWifi(false);
    }
  };


  React.useEffect(() => {
    fetchAllDashboardData();
    const intervalId = setInterval(() => fetchAllDashboardData(true), 300000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, [user, fetchAllDashboardData]); // Re-run only when user object changes

  // Real-time listener for check-in status — updates instantly when the student
  // checks in or out from any device, replacing the previous polled approach.
  React.useEffect(() => {
    if (!studentId) return;
    setIsLoadingCurrentSession(true);
    const unsubscribe = subscribeToActiveCheckIn(studentId, (record) => {
      setActiveCheckInRecord(record);
      setIsLoadingCurrentSession(false);
    });
    return unsubscribe;
  }, [studentId]);

  const handleCloseScanner = React.useCallback(() => {
    setIsScannerOpen(false);
  }, []);

  const handleScanSuccess = React.useCallback(async () => {
    if (!studentId) throw new Error("Student ID not available.");
    await addCheckIn(studentId);
    toast({ title: "Checked In!", description: `Successfully checked in at ${new Date().toLocaleTimeString()}.` });
    setIsScannerOpen(false);
    await fetchAllDashboardData();
  }, [studentId, toast, fetchAllDashboardData]);


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
    } catch (error: unknown) {
      console.error("Error during dashboard check-out:", error);
      toast({ title: "Check-out Error", description: (error instanceof Error ? error.message : String(error)) || "Failed to process check-out. Please try again.", variant: "destructive" });
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

  const coreActionTiles = React.useMemo((): DashboardTileProps[] => {
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
  }, [isLoadingStudentData, studentId, studentFeeStatus, studentNextDueDate, hasUnreadAlerts]);

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
    <ErrorBoundary>
      <>
      <div className="mb-4 flex flex-row items-center justify-between gap-3">
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
          <div className={cn("flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 text-base sm:text-lg rounded-lg border-2 font-bold flex-shrink-0", getShiftColorClass(currentStudent.shift))} title={`Seat ${currentStudent.seatNumber}`}>
            {currentStudent.seatNumber || 'N/A'}
          </div>
        )}
      </div>

      {showNotificationPrompt && <NotificationPrompt onDismiss={handleDismissPrompt} />}

      {isLoadingCurrentSession ? (
        <div className="my-3 animate-pulse rounded-md overflow-hidden border border-white/60 dark:border-white/10 bg-white/40 dark:bg-black/30 h-[128px]" />
      ) : activeCheckInRecord ? (
        <Card className="my-3 rounded-md overflow-hidden shadow-lg border-white/60 dark:border-white/10">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1">
              <ShadcnCardDescription className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Current Session</ShadcnCardDescription>
              <div className="text-4xl sm:text-5xl font-bold font-mono tracking-tighter text-primary">
                {activeCheckInRecord?.checkInTime ? <CheckInTimer checkInTime={activeCheckInRecord.checkInTime} /> : "00:00"}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground space-y-2">
                <div className="flex items-center justify-end">
                    <PlayCircle className="mr-1.5 h-3 w-3 text-green-600" />
                    <span>Checked In: {activeCheckInRecord.checkInTime && isValid(parseISO(activeCheckInRecord.checkInTime)) ? format(parseISO(activeCheckInRecord.checkInTime), 'p') : 'N/A'}</span>
                </div>
                <Button variant="link" size="sm" onClick={() => fetchAllDashboardData(true)} className="h-auto p-0 text-xs" disabled={isRefreshing}>
                    {isRefreshing ? <Loader2 aria-hidden="true" className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3"/>}
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
            </div>
          </CardContent>
          <CardFooter className="p-0">
             <Button
                onClick={handleDashboardCheckOut}
                disabled={isProcessingCheckout}
                className={cn(
                  "w-full rounded-t-none h-14 text-lg font-headline font-semibold text-primary-foreground animate-gradient-sweep-green"
                )}
             >
                {isProcessingCheckout ? (
                    <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <LogOut className="mr-2 h-5 w-5" />
                )}
                Tap to Check Out
             </Button>
          </CardFooter>
        </Card>
      ) : null}


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
         <div className="mb-3">
            <DashboardTile
              title={primaryAttendanceTitle}
              description="Scan the library QR code for attendance."
              icon={primaryAttendanceIcon}
              action={primaryAttendanceAction}
              isPrimaryAction={!primaryAttendanceDisabled}
              isLoadingStatistic={isLoadingCurrentSession && primaryAttendanceIcon === Loader2}
              disabled={primaryAttendanceDisabled}
              className={cn(!primaryAttendanceDisabled && "shadow-md")}
            />
        </div>
       )}


      {isScannerOpen && studentId && (
        <QrScannerOverlay
          expectedPayload={LIBRARY_QR_CODE_PAYLOAD}
          onSuccess={handleScanSuccess}
          onClose={handleCloseScanner}
        />
      )}

      {!studentId && !isLoadingStudentData && (
         <p className="text-xs text-destructive text-center mb-4">Could not load your student record. Some features may be unavailable.</p>
      )}


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {coreActionTiles.map((tile) => (
          <DashboardTile key={tile.title} {...tile} />
        ))}
      </div>

      <div className="my-4 border-t border-white/40 dark:border-white/10"></div>

      <div className="grid grid-cols-2 gap-3">
        <DashboardTile
            title="Library Rules"
            description="Familiarize yourself with guidelines."
            icon={ScrollText}
            href="/rules"
        />
        <Dialog open={isWifiDialogOpen} onOpenChange={setIsWifiDialogOpen}>
          <DialogTrigger asChild>
            <button onClick={handleOpenWifiDialog} className="block w-full h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
                <DashboardTile
                  title="WiFi Details"
                  description="View network credentials."
                  icon={Wifi}
                  isLoadingStatistic={isLoadingWifi && isWifiDialogOpen}
                />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <ShadcnDialogTitle>Library WiFi Details</ShadcnDialogTitle>
              <DialogDescription>
                Connect to the library&apos;s network using the credentials below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {isLoadingWifi ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 role="status" aria-label="Loading" className="h-6 w-6 animate-spin"/>
                </div>
              ) : wifiConfig.length > 0 ? (
                wifiConfig.map(wifi => (
                    <div key={wifi.id} className="p-4 border rounded-lg bg-muted/50 space-y-3">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-semibold">SSID</p>
                            <p className="text-sm font-semibold">{wifi.ssid}</p>
                        </div>
                        {wifi.password && (
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-semibold">Password</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-mono font-semibold flex-1 break-all">{wifi.password}</p>
                                    <Button variant="outline" size="sm" onClick={() => handleCopy(wifi.password!)}>
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copy
                                    </Button>
                                </div>
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
      </div>
      <div className="mt-3">
        <DashboardTile
            title="Rate Us"
            description="Love our space? Let others know!"
            icon={Star}
            href="https://g.page/r/CS-yYFo4JxNXEBM/review"
            external={true}
            className="w-full"
        />
      </div>
      </>
    </ErrorBoundary>
  );
}

    

    
