
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
import { Camera, Loader2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function AttendanceCalendarPage() {
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
          setIsScannerOpen(false); // Close scanner if permission denied
        }
      } else {
        // Stop camera stream when scanner is closed
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
      // Cleanup: stop camera stream when component unmounts or scanner closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScannerOpen, toast]);

  const handleScanButtonClick = () => {
    setIsScannerOpen(true);
    setHasCameraPermission(null); // Reset permission status to re-trigger useEffect
  };

  const handleCancelScan = () => {
    setIsScannerOpen(false);
  };

  const simulateQrScan = async () => {
    setIsProcessingQr(true);
    // Simulate network delay and QR processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessingQr(false);
    setIsScannerOpen(false);
    toast({
      title: "Attendance Marked!",
      description: `${user?.email || 'Your'} attendance has been recorded at ${new Date().toLocaleTimeString()}.`,
    });
    // In a real app, you'd process the QR code data here.
  };

  return (
    <>
      <PageTitle title="Attendance Calendar" description="View your attendance and mark your presence." />
      
      {user?.role === 'member' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>Scan the QR code at your desk to check-in or check-out.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isScannerOpen ? (
              <Button onClick={handleScanButtonClick} className="w-full sm:w-auto">
                <Camera className="mr-2 h-4 w-4" />
                Scan QR Code for Check-in/Check-out
              </Button>
            ) : (
              <div className="space-y-4">
                {hasCameraPermission === false && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Camera access is required to scan QR codes. Please enable it in your browser settings and try again.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                </div>
                
                {hasCameraPermission === null && !videoRef.current?.srcObject && (
                     <div className="flex items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Requesting camera access...
                    </div>
                )}

                {hasCameraPermission && (
                     <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={simulateQrScan} className="w-full sm:flex-1" disabled={isProcessingQr}>
                          {isProcessingQr && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isProcessingQr ? "Processing..." : "Simulate Scan & Submit"}
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
      )}

      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Details for {date.toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No specific bookings or attendance records for this day (placeholder).
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
