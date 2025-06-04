
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
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
import { Camera, Loader2, XCircle, QrCode, CreditCard, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function MemberPayFeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
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
          console.error('Error accessing camera for payment:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to scan QR codes.',
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

  const handleScanUpiButtonClick = () => {
    setIsScannerOpen(true);
    setHasCameraPermission(null);
  };

  const handleCancelScan = () => {
    setIsScannerOpen(false);
  };

  const simulateUpiPayment = async () => {
    setIsProcessingPayment(true);
    await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate network delay
    setIsProcessingPayment(false);
    setIsScannerOpen(false);
    toast({
      title: "Payment Successful (Simulated)",
      description: `Your fee payment has been processed for ${user?.email || 'your account'}.`,
      variant: "default" // or a success variant if defined
    });
  };

  return (
    <>
      <PageTitle title="Pay Your Fees" description="Choose a payment method or scan UPI QR at the desk." />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <QrCode className="mr-2 h-5 w-5" />
              Scan UPI QR Code at Desk
            </CardTitle>
            <CardDescription>Use your UPI app to scan the QR code available at the library reception.</CardDescription>
          </CardHeader>
          <CardContent>
            {!isScannerOpen ? (
              <Button onClick={handleScanUpiButtonClick} className="w-full">
                <Camera className="mr-2 h-4 w-4" />
                Open Camera to Scan UPI QR
              </Button>
            ) : (
              <div className="space-y-4">
                {hasCameraPermission === false && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>
                      Camera access is required to scan QR codes. Please enable it in your browser settings.
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
                        <Button onClick={simulateUpiPayment} className="w-full sm:flex-1" disabled={isProcessingPayment}>
                          {isProcessingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isProcessingPayment ? "Processing Payment..." : "Simulate Scan & Confirm Payment"}
                        </Button>
                        <Button variant="outline" onClick={handleCancelScan} className="w-full sm:w-auto" disabled={isProcessingPayment}>
                          Cancel Scan
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
              <CreditCard className="mr-2 h-5 w-5" />
              Other Payment Options
            </CardTitle>
            <CardDescription>More ways to pay your fees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Online Payment Gateway</AlertTitle>
              <AlertDescription>
                Secure online payments via Credit/Debit Card or Net Banking will be available soon.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              For assistance with payments, please contact the library administration.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

