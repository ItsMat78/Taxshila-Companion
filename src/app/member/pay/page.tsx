
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
import { getStudentByEmail, recordStudentPayment } from '@/services/student-service'; // Added recordStudentPayment
import type { Student } from '@/types/student'; // Added Student type

export default function MemberPayFeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [currentStudent, setCurrentStudent] = React.useState<Student | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = React.useState(true);

  React.useEffect(() => {
    if (user?.email) {
      setIsLoadingStudent(true);
      const fetchStudent = async () => {
        try {
          const student = await getStudentByEmail(user.email);
          if (student) {
            setCurrentStudent(student);
          } else {
            toast({
              title: "Student Record Not Found",
              description: "Could not find an active student record associated with your email.",
              variant: "destructive",
            });
            setCurrentStudent(null);
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to fetch your details.",
            variant: "destructive",
          });
          setCurrentStudent(null);
        } finally {
          setIsLoadingStudent(false);
        }
      };
      fetchStudent();
    } else {
      setIsLoadingStudent(false);
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
    if (!currentStudent || currentStudent.feeStatus === "Paid") {
         toast({
            title: currentStudent?.feeStatus === "Paid" ? "Fees Already Paid" : "Cannot Process Payment",
            description: currentStudent?.feeStatus === "Paid" ? "Your fees for the current period are already paid." : "Your student details could not be loaded. Please try again or contact support.",
            variant: currentStudent?.feeStatus === "Paid" ? "default" : "destructive",
         });
        return;
    }
    setIsScannerOpen(true);
    setHasCameraPermission(null);
  };

  const handleCancelScan = () => {
    setIsScannerOpen(false);
  };

  const simulateUpiPayment = async () => {
    if (!currentStudent || !currentStudent.studentId) {
      toast({
        title: "Error",
        description: "Student details not found. Cannot process payment.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    // Simulate network delay for QR scan/confirmation
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    try {
      // Assume full payment of current amountDue
      const amountToPay = currentStudent.amountDue || (currentStudent.shift === "fullday" ? "₹1200" : "₹700");
      
      const updatedStudent = await recordStudentPayment(currentStudent.studentId, amountToPay, "UPI");
      
      if (updatedStudent) {
        setCurrentStudent(updatedStudent); // Update local student state
        toast({
          title: "Payment Successful!",
          description: `Your fee payment of ${amountToPay} has been recorded. Next due date: ${updatedStudent.nextDueDate}.`,
          variant: "default"
        });
      } else {
         toast({
          title: "Payment Recording Failed",
          description: "Could not update your payment status. Please contact admin.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
       toast({
          title: "Payment Error",
          description: error.message || "An unexpected error occurred while recording your payment.",
          variant: "destructive",
        });
    } finally {
      setIsProcessingPayment(false);
      setIsScannerOpen(false);
    }
  };
  
  const getFeeStatusMessage = () => {
    if (isLoadingStudent) {
      return <p className="text-sm text-muted-foreground text-center py-2">Loading your fee details...</p>;
    }
    if (!currentStudent) {
      return <p className="text-sm text-destructive text-center py-2">Could not load your student information. Please try again or contact admin.</p>;
    }
    if (currentStudent.activityStatus === 'Left') {
      return <p className="text-sm text-destructive text-center py-2">Your account is marked as 'Left'. Please contact admin for fee payments.</p>;
    }
    if (currentStudent.feeStatus === 'Paid') {
      return <p className="text-sm text-green-600 text-center py-2">Your fees are currently paid up to {currentStudent.nextDueDate}.</p>;
    }
    return (
      <p className="text-sm text-yellow-600 text-center py-2">
        Your current amount due is {currentStudent.amountDue || (currentStudent.shift === "fullday" ? "₹1200" : "₹700")}.
        Next due date was {currentStudent.nextDueDate}.
      </p>
    );
  };


  return (
    <>
      <PageTitle title="Pay Your Fees" description="Choose a payment method or scan UPI QR at the desk." />

      <Card className="mb-6 shadow-md">
        <CardHeader>
            <CardTitle>Fee Status</CardTitle>
        </CardHeader>
        <CardContent>
            {getFeeStatusMessage()}
        </CardContent>
      </Card>

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
              <Button 
                onClick={handleScanUpiButtonClick} 
                className="w-full"
                disabled={isLoadingStudent || !currentStudent || currentStudent.feeStatus === 'Paid' || currentStudent.activityStatus === 'Left'}
              >
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
