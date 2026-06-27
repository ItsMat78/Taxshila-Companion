
"use client";

import * as React from 'react';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/shared/error-boundary';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { IndianRupee, MessageSquare, Bell, ScrollText, Star, Loader2, ScanLine, LogOut, AlertCircle, X, RefreshCw, Wifi, Copy, Flame, Clock, Armchair, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentByEmail, getAlertsForStudent, addCheckIn, addCheckOut, getStudentByCustomId, getWifiConfiguration, subscribeToActiveCheckIn, getMemberStudyStats } from '@/services/student-service';
import type { MemberStudyStats } from '@/services/student-service';
import type { Student, AttendanceRecord, FeeStatus, Shift, WifiConfig } from '@/types/student';
import { format, parseISO, isValid } from 'date-fns';
import { setupPushNotifications } from '@/lib/notification-setup';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { CheckInTimer } from '@/components/member/CheckInTimer';
import { QrScannerOverlay } from '@/components/member/QrScannerOverlay';

const LIBRARY_QR_CODE_PAYLOAD = "TAXSHILA_LIBRARY_CHECKIN_QR_V1";
const REVIEW_URL = "https://g.page/r/CS-yYFo4JxNXEBM/review";

const SHIFT_META: Record<Shift, { label: string; icon: string; chipBg: string; chipText: string }> = {
  morning: { label: 'Morning', icon: 'text-orange-500', chipBg: 'bg-orange-100 dark:bg-orange-900/40', chipText: 'text-orange-600 dark:text-orange-400' },
  evening: { label: 'Evening', icon: 'text-purple-500', chipBg: 'bg-purple-100 dark:bg-purple-900/40', chipText: 'text-purple-600 dark:text-purple-400' },
  fullday: { label: 'Full Day', icon: 'text-yellow-600', chipBg: 'bg-yellow-100 dark:bg-yellow-900/40', chipText: 'text-yellow-600 dark:text-yellow-400' },
};

const motivationalQuotes = [
  "Stay motivated.", "You got this.", "Never give up.", "Progress, not perfection.",
  "Find a way.", "Make it happen.", "Keep moving forward.", "You are strong.",
  "See it through.", "Trust the process.", "Dare to begin.", "Stay the course.", "Embrace the journey."
];

function formatStudyHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0 && m === 0) return "0h";
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Frosted card, mirrors the admin dashboard's GlassCard look.
const GlassCard = ({ children, className = "", interactive = false }: { children: React.ReactNode; className?: string; interactive?: boolean }) => (
  <div className={cn(
    "rounded-lg border border-white/60 bg-white/40 shadow-[0_4px_16px_rgb(0,0,0,0.04)] backdrop-blur-md dark:border-white/5 dark:bg-slate-900/60 dark:shadow-xl md:backdrop-blur-xl",
    interactive && "h-full transition-all active:scale-[0.99]",
    className
  )}>
    {children}
  </div>
);

function NotificationPrompt({ onDismiss }: { onDismiss: () => void }) {
  const { user } = useAuth();
  const handleEnableNotifications = async () => {
    if (user && user.firestoreId && user.role) {
      await setupPushNotifications(user.firestoreId, user.role);
    }
    onDismiss();
  };
  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
      <Bell className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-foreground/80">Turn on notifications for alerts &amp; announcements.</p>
      <Button size="sm" onClick={handleEnableNotifications} className="h-8">Enable</Button>
      <button onClick={onDismiss} aria-label="Dismiss" className="text-muted-foreground transition-colors hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Compact stat card: tiny label + colored icon, then a light-weight value.
type StatCardProps = {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  iconClass: string;
  valueClass?: string;
  href: string;
};
function StatCard({ label, value, sub, icon: Icon, iconClass, valueClass, href }: StatCardProps) {
  return (
    <Link href={href} className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <GlassCard interactive className="flex h-full flex-col justify-between p-3 hover:bg-white/55 dark:hover:bg-slate-800/60 md:p-4">
        <div className="mb-2 flex items-start justify-between">
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 md:text-xs">{label}</span>
          <Icon className={cn("h-4 w-4", iconClass)} />
        </div>
        <div>
          <p className={cn("text-2xl font-light leading-none tracking-tight md:text-3xl", valueClass)}>{value}</p>
          {sub && <p className="mt-1.5 truncate font-body text-[10px] text-gray-400 dark:text-gray-500">{sub}</p>}
        </div>
      </GlassCard>
    </Link>
  );
}

// Color-coded quick action, mirrors the admin dashboard's action row.
type QuickActionProps = {
  icon: React.ElementType;
  label: string;
  chipClass: string;   // bg + text for the icon chip
  labelClass: string;  // text color for the label
  hoverClass: string;  // card hover tint
  href?: string;
  action?: () => void;
  external?: boolean;
  showDot?: boolean;
};
function QuickAction({ icon: Icon, label, chipClass, labelClass, hoverClass, href, action, external, showDot }: QuickActionProps) {
  const card = (
    <GlassCard interactive className={cn("group relative flex flex-col items-center justify-center gap-1.5 p-3 md:p-4", hoverClass)}>
      {showDot && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F05454] ring-2 ring-white dark:ring-slate-900" />}
      <div className={cn("rounded-xl p-1.5 transition-transform group-hover:scale-110 md:p-2", chipClass)}>
        <Icon className="h-4 w-4 md:h-5 md:w-5" />
      </div>
      <span className={cn("text-[11px] font-semibold md:text-sm", labelClass)}>{label}</span>
    </GlassCard>
  );
  const cls = "rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  if (action) return <button onClick={action} className={cn(cls, "text-left")}>{card}</button>;
  return <Link href={href!} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className={cls}>{card}</Link>;
}

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
  const [studyStats, setStudyStats] = React.useState<MemberStudyStats | null>(null);

  React.useEffect(() => {
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setShowNotificationPrompt(Notification.permission === 'default');
    }
  }, []);

  const handleDismissPrompt = () => setShowNotificationPrompt(false);

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

          // Render name, fee status, and cards immediately.
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
  }, [user, fetchAllDashboardData]);

  // Real-time listener for check-in status — updates instantly when the student
  // checks in or out from any device.
  React.useEffect(() => {
    if (!studentId) return;
    setIsLoadingCurrentSession(true);
    const unsubscribe = subscribeToActiveCheckIn(studentId, (record) => {
      setActiveCheckInRecord(record);
      setIsLoadingCurrentSession(false);
    });
    return unsubscribe;
  }, [studentId]);

  // Study streak + weekly hours. Recomputed when the active session changes
  // (i.e. on check-in / check-out) so the numbers stay fresh. Non-fatal on error.
  React.useEffect(() => {
    if (!currentStudent?.studentId) return;
    let cancelled = false;
    getMemberStudyStats(currentStudent.studentId, currentStudent.shift)
      .then((stats) => { if (!cancelled) setStudyStats(stats); })
      .catch((err) => console.error("Could not load study stats:", err));
    return () => { cancelled = true; };
  }, [currentStudent?.studentId, currentStudent?.shift, activeCheckInRecord]);

  const handleCloseScanner = React.useCallback(() => setIsScannerOpen(false), []);

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
      toast({ title: "Checked Out!", description: `Successfully checked out at ${new Date().toLocaleTimeString()}.` });
      await fetchAllDashboardData();
    } catch (error: unknown) {
      console.error("Error during dashboard check-out:", error);
      toast({ title: "Check-out Error", description: (error instanceof Error ? error.message : String(error)) || "Failed to process check-out. Please try again.", variant: "destructive" });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Password copied to clipboard." });
    }, () => {
      toast({ title: "Copy Failed", description: "Could not copy password.", variant: "destructive" });
    });
  };

  // --- Derived display values ---
  const defaultWelcomeName = user?.email?.split('@')[0] || 'Member';
  const firstName = studentFirstName || defaultWelcomeName;
  const dateline = format(new Date(), 'EEEE, d MMMM');
  const shiftMeta = currentStudent ? SHIFT_META[currentStudent.shift] : null;

  const primaryAttendanceDisabled = !studentId || isLoadingCurrentSession || isScannerOpen;
  const checkInTime = activeCheckInRecord?.checkInTime;
  const sessionSince = checkInTime && isValid(parseISO(checkInTime)) ? format(parseISO(checkInTime), 'p') : null;

  const dueDateStr = studentNextDueDate && isValid(parseISO(studentNextDueDate))
    ? format(parseISO(studentNextDueDate), 'd MMM')
    : null;

  let feeValue = '—';
  let feeSub: string | undefined;
  let feeValueClass = 'text-gray-700 dark:text-gray-200';
  let feeIconClass = 'text-gray-400';
  if (isLoadingStudentData) {
    feeValue = '-';
  } else {
    switch (studentFeeStatus) {
      case 'Paid':
        feeValue = 'Paid'; feeSub = dueDateStr ? `Through ${dueDateStr}` : 'Up to date';
        feeValueClass = 'text-emerald-600 dark:text-emerald-400'; feeIconClass = 'text-emerald-500';
        break;
      case 'Due':
        feeValue = 'Due'; feeSub = dueDateStr ? `By ${dueDateStr}` : 'Payment due';
        feeValueClass = 'text-amber-600 dark:text-amber-400'; feeIconClass = 'text-amber-500';
        break;
      case 'Overdue':
        feeValue = 'Overdue'; feeSub = 'Pay at the desk';
        feeValueClass = 'text-red-600 dark:text-red-500'; feeIconClass = 'text-red-500';
        break;
      default:
        feeValue = studentFeeStatus || 'N/A'; feeSub = 'View payments';
    }
  }

  return (
    <ErrorBoundary>
      <div className="mx-auto w-full max-w-4xl pb-8 font-headline text-gray-800 dark:text-gray-100">

        {showNotificationPrompt && <NotificationPrompt onDismiss={handleDismissPrompt} />}

        {/* Welcome header */}
        <div className="mb-4 flex items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-light leading-none tracking-tight text-gray-900 dark:text-white md:text-4xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1.5 font-body text-xs text-gray-500 dark:text-gray-400 md:text-sm">{dateline}</p>
          </div>
          <Link href="/member/profile" aria-label="Open your profile" className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Avatar className="h-11 w-11 border-2 border-white/70 shadow-md dark:border-white/10">
              <AvatarImage src={currentStudent?.profilePictureUrl || user?.profilePictureUrl || undefined} alt={currentStudent?.name} data-ai-hint="profile person" />
              <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 dark:from-indigo-900 dark:to-slate-900 dark:text-indigo-300">{getInitials(currentStudent?.name)}</AvatarFallback>
            </Avatar>
          </Link>
        </div>

        <div className="space-y-3">

          {/* Session hero */}
          <GlassCard className="relative overflow-hidden p-4 shadow-[0_12px_40px_rgba(16,185,129,0.07)] md:p-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-300 opacity-20 blur-3xl dark:bg-emerald-500/40 dark:opacity-20" />
            {isLoadingCurrentSession ? (
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-28 rounded bg-gray-200/70 dark:bg-white/10" />
                <div className="h-10 w-44 rounded bg-gray-200/70 dark:bg-white/10" />
                <div className="h-11 w-full rounded-lg bg-gray-200/70 dark:bg-white/10" />
              </div>
            ) : activeCheckInRecord ? (
              <div className="relative">
                <div className="mb-1.5 flex items-start justify-between">
                  <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 md:text-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/70 motion-safe:animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Current session{sessionSince ? ` · since ${sessionSince}` : ''}
                  </span>
                  <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <div className="font-mono text-4xl font-light tabular-nums tracking-tight text-gray-900 dark:text-white md:text-5xl">
                  {checkInTime ? <CheckInTimer checkInTime={checkInTime} /> : "00:00"}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button onClick={handleDashboardCheckOut} disabled={isProcessingCheckout} className="h-11 flex-1 bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700">
                    {isProcessingCheckout ? <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
                    Check out
                  </Button>
                  <Button onClick={() => fetchAllDashboardData(true)} disabled={isRefreshing} variant="outline" size="icon" aria-label="Refresh session" className="h-11 w-11 border-white/60 bg-white/30 dark:border-white/10 dark:bg-white/5">
                    <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="mb-1.5 flex items-start justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 md:text-xs">Check in</span>
                  <div className="rounded-full bg-emerald-100 p-1.5 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <ScanLine className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-light tracking-tight text-gray-900 dark:text-white">Ready to study?</p>
                <p className="mt-0.5 font-body text-xs italic text-gray-400 dark:text-gray-500">{motivationalQuote}</p>
                <Button onClick={handleOpenScanner} disabled={primaryAttendanceDisabled} className="mt-4 h-12 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700">
                  <ScanLine className="mr-2 h-5 w-5" />
                  Scan to check in
                </Button>
              </div>
            )}
          </GlassCard>

          {!studentId && !isLoadingStudentData && (
            <p className="text-center text-xs text-destructive">Could not load your student record. Some features may be unavailable.</p>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Day streak"
              value={studyStats ? studyStats.currentStreak : '-'}
              sub={studyStats ? (studyStats.currentStreak === 1 ? 'day in a row' : 'days in a row') : undefined}
              icon={Flame}
              iconClass="text-[#F05454]"
              href="/member/attendance"
            />
            <StatCard
              label="This week"
              value={studyStats ? formatStudyHours(studyStats.weeklyHours) : '-'}
              sub={studyStats ? 'studied' : undefined}
              icon={Clock}
              iconClass="text-indigo-500"
              href="/member/attendance"
            />
            <StatCard
              label="Fees"
              value={feeValue}
              sub={feeSub}
              icon={IndianRupee}
              iconClass={feeIconClass}
              valueClass={feeValueClass}
              href="/member/fees"
            />
            <StatCard
              label="Your seat"
              value={currentStudent?.seatNumber || '-'}
              sub={shiftMeta ? shiftMeta.label : undefined}
              icon={Armchair}
              iconClass={shiftMeta ? shiftMeta.icon : 'text-gray-400'}
              href="/member/profile"
            />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
            <QuickAction
              icon={CalendarDays} label="Attendance"
              chipClass="bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400"
              labelClass="text-teal-700 dark:text-teal-300"
              hoverClass="hover:bg-teal-600/10 dark:hover:bg-teal-500/10"
              href="/member/attendance"
            />
            <QuickAction
              icon={Bell} label="Alerts"
              chipClass="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
              labelClass="text-blue-700 dark:text-blue-300"
              hoverClass="hover:bg-blue-600/10 dark:hover:bg-blue-500/10"
              href="/member/alerts"
              showDot={hasUnreadAlerts}
            />
            <QuickAction
              icon={MessageSquare} label="Feedback"
              chipClass="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
              labelClass="text-amber-700 dark:text-amber-300"
              hoverClass="hover:bg-amber-600/10 dark:hover:bg-amber-500/10"
              href="/member/feedback"
            />
            <QuickAction
              icon={ScrollText} label="Rules"
              chipClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400"
              labelClass="text-indigo-700 dark:text-indigo-300"
              hoverClass="hover:bg-indigo-600/10 dark:hover:bg-indigo-500/10"
              href="/rules"
            />
            <QuickAction
              icon={Wifi} label="WiFi"
              chipClass="bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400"
              labelClass="text-sky-700 dark:text-sky-300"
              hoverClass="hover:bg-sky-600/10 dark:hover:bg-sky-500/10"
              action={handleOpenWifiDialog}
            />
            <QuickAction
              icon={Star} label="Rate us"
              chipClass="bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
              labelClass="text-rose-700 dark:text-rose-300"
              hoverClass="hover:bg-rose-600/10 dark:hover:bg-rose-500/10"
              href={REVIEW_URL}
              external
            />
          </div>
        </div>
      </div>

      {/* Overlays & dialogs */}
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

      {isScannerOpen && studentId && (
        <QrScannerOverlay
          expectedPayload={LIBRARY_QR_CODE_PAYLOAD}
          onSuccess={handleScanSuccess}
          onClose={handleCloseScanner}
        />
      )}

      <Dialog open={isWifiDialogOpen} onOpenChange={setIsWifiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <ShadcnDialogTitle>Library WiFi Details</ShadcnDialogTitle>
            <DialogDescription>Connect to the library&apos;s network using the credentials below.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
            {isLoadingWifi ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 role="status" aria-label="Loading" className="h-6 w-6 animate-spin" />
              </div>
            ) : wifiConfig.length > 0 ? (
              wifiConfig.map(wifi => (
                <div key={wifi.id} className="space-y-3 rounded-lg border bg-muted/50 p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">SSID</p>
                    <p className="text-sm font-semibold">{wifi.ssid}</p>
                  </div>
                  {wifi.password && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Password</p>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 break-all font-mono text-sm font-semibold">{wifi.password}</p>
                        <Button variant="outline" size="sm" onClick={() => handleCopy(wifi.password!)}>
                          <Copy className="mr-1 h-3 w-3" />
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
    </ErrorBoundary>
  );
}
