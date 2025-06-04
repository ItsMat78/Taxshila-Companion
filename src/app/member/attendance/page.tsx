
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
import { Camera, Loader2, XCircle, BarChart3, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function MemberAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);

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

  const handleScanButtonClick = () => {
    setIsScannerOpen(true);
    setHasCameraPermission(null); 
  };

  const handleCancelScan = () => {
    setIsScannerOpen(false);
  };

  const simulateQrScan = async () => {
    setIsProcessingQr(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessingQr(false);
    setIsScannerOpen(false);
    toast({
      title: "Attendance Marked!",
      description: `${user?.email || 'Your'} attendance has been recorded at ${new Date().toLocaleTimeString()}.`,
    });
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
              <Button onClick={handleScanButtonClick} className="w-full">
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
            <div className="text-4xl font-bold">42 <span className="text-lg font-normal text-muted-foreground">hours</span></div>
            <p className="text-sm text-muted-foreground mt-1">Total hours studied this month (placeholder).</p>
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
          />
        </CardContent>
      </Card>
      {date && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle>Details for {date.toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No specific check-in/out records for this day (placeholder).
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
