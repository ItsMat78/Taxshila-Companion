
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CreditCard, ShieldCheck, IndianRupee, Verified, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, recordStudentPayment } from '@/services/student-service'; 
import type { Student } from '@/types/student'; 
import { format, parseISO, isValid } from 'date-fns';

const MONTH_OPTIONS = [
  { value: 1, label: "1 Month" },
  { value: 2, label: "2 Months" },
  { value: 3, label: "3 Months" },
];

export default function MemberPayFeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentStudent, setCurrentStudent] = React.useState<Student | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = React.useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);

  const [selectedMonths, setSelectedMonths] = React.useState<number>(1);
  const [totalPayableAmount, setTotalPayableAmount] = React.useState<string>("Rs. 0");
  const [upiId, setUpiId] = React.useState<string>("");
  const [isUpiVerified, setIsUpiVerified] = React.useState<boolean>(false);
  const [upiVerificationMessage, setUpiVerificationMessage] = React.useState<string | null>(null);


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
    if (currentStudent) {
      const monthlyFee = currentStudent.shift === "fullday" ? 1200 : 700;
      const calculatedAmount = monthlyFee * selectedMonths;
      setTotalPayableAmount(`Rs. ${calculatedAmount.toLocaleString('en-IN')}`);
    } else {
      setTotalPayableAmount("Rs. 0");
    }
  }, [currentStudent, selectedMonths]);

  const handleVerifyUpiId = () => {
    setUpiVerificationMessage(null);
    if (!upiId.trim()) {
      setUpiVerificationMessage("UPI ID cannot be empty.");
      setIsUpiVerified(false);
      return;
    }
    // Simulate UPI ID validation (e.g., basic format check)
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(upiId)) {
      setUpiVerificationMessage("Invalid UPI ID format (e.g., yourname@bank).");
      setIsUpiVerified(false);
      return;
    }
    // Simulate successful verification after a short delay
    setIsProcessingPayment(true); // Use this to show a brief loading on verify button
    setTimeout(() => {
      setIsUpiVerified(true);
      setUpiVerificationMessage(`UPI ID "${upiId}" verified successfully.`);
      setIsProcessingPayment(false);
    }, 1000);
  };

  const handlePayNowWithUpi = async () => {
    if (!currentStudent || !currentStudent.studentId || !isUpiVerified) {
      toast({
        title: "Payment Error",
        description: !isUpiVerified ? "Please verify your UPI ID first." : "Student details not found or UPI ID not verified.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate payment processing time
    
    try {
      const updatedStudent = await recordStudentPayment(
        currentStudent.studentId, 
        totalPayableAmount, 
        "UPI",
        selectedMonths
      );
      
      if (updatedStudent) {
        setCurrentStudent(updatedStudent); 
        toast({
          title: "Payment Successful!",
          description: `Your fee payment of ${totalPayableAmount} for ${selectedMonths} month(s) has been recorded. Next due date: ${updatedStudent.nextDueDate ? format(parseISO(updatedStudent.nextDueDate), 'PP') : 'N/A'}.`,
          variant: "default"
        });
        setUpiId("");
        setIsUpiVerified(false);
        setSelectedMonths(1);
        setUpiVerificationMessage(null);
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
    if (currentStudent.feeStatus === 'Paid' && currentStudent.nextDueDate && isValid(parseISO(currentStudent.nextDueDate))) {
      return <p className="text-sm text-green-600 text-center py-2">Your fees are currently paid up to {format(parseISO(currentStudent.nextDueDate), 'PP')}.</p>;
    }
    let dueMessage = `Your current amount due is Rs. ${currentStudent.amountDue || (currentStudent.shift === "fullday" ? "1200" : "700")}.`;
    if(currentStudent.nextDueDate && isValid(parseISO(currentStudent.nextDueDate))) {
        dueMessage += ` Next due date was ${format(parseISO(currentStudent.nextDueDate), 'PP')}.`;
    }
    return (
      <p className="text-sm text-yellow-600 text-center py-2">
        {dueMessage}
      </p>
    );
  };

  const canPay = currentStudent && currentStudent.activityStatus === 'Active';

  return (
    <>
      <PageTitle title="Pay Your Fees" description="Securely pay your membership fees using UPI." />

      <Card className="mb-6 shadow-md">
        <CardHeader>
            <CardTitle>Current Fee Status</CardTitle>
        </CardHeader>
        <CardContent>
            {getFeeStatusMessage()}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <IndianRupee className="mr-2 h-5 w-5" />
              Pay with UPI
            </CardTitle>
            <CardDescription>Select months, verify UPI ID, and proceed to pay.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="select-months">Select Number of Months</Label>
              <Select
                value={String(selectedMonths)}
                onValueChange={(value) => setSelectedMonths(Number(value))}
                disabled={isProcessingPayment || !canPay}
              >
                <SelectTrigger id="select-months" className="w-full mt-1">
                  <SelectValue placeholder="Select months" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Total Payable Amount:</p>
              <p className="text-2xl font-bold">{totalPayableAmount}</p>
            </div>

            <div>
              <Label htmlFor="upi-id">Your UPI ID</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  id="upi-id" 
                  placeholder="yourname@bank" 
                  value={upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    setIsUpiVerified(false); // Reset verification status on change
                    setUpiVerificationMessage(null);
                  }}
                  disabled={isProcessingPayment || !canPay}
                  className="flex-grow"
                />
                <Button 
                  onClick={handleVerifyUpiId} 
                  variant="outline" 
                  disabled={isProcessingPayment || !upiId.trim() || isUpiVerified || !canPay}
                >
                  {isProcessingPayment && !isUpiVerified ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isUpiVerified ? <Verified className="mr-2 h-4 w-4 text-green-500" /> : null}
                  Verify
                </Button>
              </div>
              {upiVerificationMessage && (
                <p className={`text-xs mt-1 ${isUpiVerified ? 'text-green-600' : 'text-red-600'}`}>
                  {isUpiVerified ? <Verified className="inline h-3 w-3 mr-1"/> : <AlertCircle className="inline h-3 w-3 mr-1"/>}
                  {upiVerificationMessage}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handlePayNowWithUpi} 
              className="w-full" 
              disabled={isProcessingPayment || !isUpiVerified || !canPay}
            >
              {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              {isProcessingPayment ? 'Processing Payment...' : `Pay ${totalPayableAmount} Now`}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheck className="mr-2 h-5 w-5" />
              Other Payment Information
            </CardTitle>
            <CardDescription>Alternative ways to pay or get help.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <IndianRupee className="h-4 w-4" />
              <AlertTitle>Pay at Desk</AlertTitle>
              <AlertDescription>
                You can also pay your fees directly at the library reception desk via cash or other available methods.
              </AlertDescription>
            </Alert>
             <Alert variant="destructive">
              <CreditCard className="h-4 w-4" />
              <AlertTitle>Online Gateway (Coming Soon)</AlertTitle>
              <AlertDescription>
                Secure online payments via Credit/Debit Card or Net Banking will be available in a future update.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              For any payment-related assistance or queries, please contact the library administration.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
