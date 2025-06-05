
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
import { Camera, QrCode, Receipt, IndianRupee, MessageSquare, Bell, ScrollText, Star, Loader2, XCircle, Home, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStudentByEmail, getAlertsForStudent, calculateMonthlyStudyHours } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';

type DashboardTileProps = {
  title: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  className?: string;
  isPrimaryAction?: boolean;
  external?: boolean;
  hasNew?: boolean;
};

const DashboardTile: React.FC<DashboardTileProps> = ({ title, description, icon: Icon, href, action, className = "", isPrimaryAction = false, external = false, hasNew = false }) => {
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
        isPrimaryAction ? "p-4 pb-2" : "p-3 pb-1"
      )}>
        {hasNew && !isPrimaryAction && ( 
          <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-destructive ring-1 ring-white" />
        )}
        <div className={cn(
          "flex items-center gap-2",
           isPrimaryAction ? "" : "flex-col text-center"
        )}>
          <Icon className={cn(
            isPrimaryAction ? "h-6 w-6" : "h-6 w-6 mb-1" 
          )} />
          <ShadcnCardTitle className={cn(
            isPrimaryAction ? 'text-xl font-bold' : 'text-base font-semibold',
          )}>
            {title}
          </ShadcnCardTitle>
        </div>
      </CardHeader>
      <CardContent className={cn(
        "flex-grow",
        isPrimaryAction ? "p-4 pt-2" : "flex flex-col items-center justify-center p-3 pt-1" 
      )}>
        {description && <p className={cn(
          isPrimaryAction ? 'text-sm text-primary-foreground/80' : 'text-xs text-muted-foreground text-center',
        )}>{description}</p>}
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

  React.useEffect(() => {
    if (user?.email) {
      setIsLoadingStudentData(true);
      setIsLoadingStudyHours(true); 
      getStudentByEmail(user.email)
        .then(student => {
          if (student) {
            setStudentId(student.studentId);
            setStudentFirstName(student.name ? student.name.split(' ')[0] : null);
            
            // Fetch alerts and study hours
            const alertPromise = getAlertsForStudent(student.studentId);
            const studyHoursPromise = calculateMonthlyStudyHours(student.studentId);

            return Promise.all([alertPromise, studyHoursPromise, student]);
          }
          setStudentFirstName(null);
          setStudentId(null);
          return Promise.reject("Student not found to fetch further data"); 
        })
        .then(([alerts, hours]) => {
          setHasUnreadAlerts(alerts.some(alert => !alert.isRead));
          setMonthlyStudyHours(hours);
        })
        .catch(error => {
          console.error("Error fetching student data, alerts or study hours for dashboard:", error);
          if (error !== "Student not found to fetch further data") {
            toast({ title: "Error", description: "Could not load all dashboard data.", variant: "destructive" });
          }
          setStudentFirstName(null); // Ensure reset on error
          setHasUnreadAlerts(false);
          setMonthlyStudyHours(null);
        })
        .finally(() => {
          setIsLoadingStudentData(false);
          setIsLoadingStudyHours(false);
        });
    } else {
      setIsLoadingStudentData(false);
      setIsLoadingStudyHours(false);
      setStudentFirstName(null);
      setStudentId(null);
      setMonthlyStudyHours(null);
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
    setIsScannerOpen(true);
    setHasCameraPermission(null);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
  };

  const simulateQrScan = async () => {
    setIsProcessingQr(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessingQr(false);
    setIsScannerOpen(false);
    toast({
      title: "Attendance Marked!",
      description: `Your attendance has been recorded at ${new Date().toLocaleTimeString()}.`,
    });
    // Re-fetch study hours after simulated scan
    if(studentId) {
        setIsLoadingStudyHours(true);
        calculateMonthlyStudyHours(studentId)
            .then(setMonthlyStudyHours)
            .catch(() => setMonthlyStudyHours(null))
            .finally(() => setIsLoadingStudyHours(false));
    }
  };

  let activitySummaryDescription = "Track your study hours.";
  if (isLoadingStudyHours) {
    activitySummaryDescription = "Loading hours...";
  } else if (monthlyStudyHours !== null) {
    activitySummaryDescription = `${monthlyStudyHours} hours studied this month.`;
  } else if (!isLoadingStudentData && studentId) { // Only show N/A if student is loaded but hours are not
    activitySummaryDescription = "N/A hours recorded.";
  }


  const coreActionTiles: DashboardTileProps[] = [
    { title: "View Alerts", description: "Catch up on announcements.", icon: Bell, href: "/member/alerts", hasNew: isLoadingStudentData ? false : hasUnreadAlerts },
    { title: "Activity Summary", description: activitySummaryDescription, icon: BarChart3, href: "/member/attendance" },
    { title: "Pay Fees", description: "Settle your outstanding dues.", icon: IndianRupee, href: "/member/pay" },
    { title: "Submit Feedback", description: "Share suggestions or issues.", icon: MessageSquare, href: "/member/feedback" },
  ];

  const otherResourcesTiles: DashboardTileProps[] = [
    { title: "Library Rules", description: "Familiarize yourself with guidelines.", icon: ScrollText, href: "/member/rules" },
    { title: "Rate Us", description: "Love our space? Let others know!", icon: Star, href: "https://www.google.com/maps/search/?api=1&query=Taxshila+Study+Hall+Pune", external: true },
  ];
  
  const defaultWelcomeName = user?.email?.split('@')[0] || 'Member';
  const pageTitleText = isLoadingStudentData 
    ? `Welcome, ${defaultWelcomeName}!` 
    : (studentFirstName ? `Welcome, ${studentFirstName}!` : `Welcome, ${defaultWelcomeName}!`);

  return (
    <>
      <PageTitle title={pageTitleText} description="Your Taxshila Companion dashboard." />

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogTrigger asChild>
          <div className="mb-6 cursor-pointer">
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {coreActionTiles.map((tile) => (
          <DashboardTile key={tile.title} {...tile} className="aspect-square" />
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

