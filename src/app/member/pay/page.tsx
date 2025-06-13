"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
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
import { Loader2, CreditCard, ShieldCheck, IndianRupee, CalendarCheck2, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getFeeStructure, getStudentByCustomId } from '@/services/student-service'; // Added getFeeStructure
import type { Student, FeeStructure as FeeStructureType } from '@/types/student'; // Added FeeStructureType
import { format, parseISO, isValid, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const [feeStructure, setFeeStructure] = React.useState<FeeStructureType | null>(null);
  const [isLoadingFeeStructure, setIsLoadingFeeStructure] = React.useState(true);

  const [selectedMonths, setSelectedMonths] = React.useState<number>(1);
  const [totalPayableAmount, setTotalPayableAmount] = React.useState<string>("Rs. 0");
  const [calculatedNextDueDate, setCalculatedNextDueDate] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingStudent(true);
      setIsLoadingFeeStructure(true);
      try {
        let student = null;
        if (user?.studentId) {
          student = await getStudentByCustomId(user.studentId);
        } else if (user?.email) {
          student = await getStudentByEmail(user.email);
        }

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

        const fees = await getFeeStructure();
        setFeeStructure(fees);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch your details or fee settings.",
          variant: "destructive",
        });
        setCurrentStudent(null);
        setFeeStructure(null);
      } finally {
        setIsLoadingStudent(false);
        setIsLoadingFeeStructure(false);
      }
    };
    fetchInitialData();
  }, [user, toast]);

  React.useEffect(() => {
    if (currentStudent && feeStructure) {
      let monthlyFee: number;
      switch (currentStudent.shift) {
        case "morning": monthlyFee = feeStructure.morningFee; break;
        case "evening": monthlyFee = feeStructure.eveningFee; break;
        case "fullday": monthlyFee = feeStructure.fullDayFee; break;
        default: monthlyFee = 0;
      }

      const calculatedAmount = monthlyFee * selectedMonths;
      setTotalPayableAmount(`Rs. ${calculatedAmount.toLocaleString('en-IN')}`);

      let baseDateForNextDue = new Date();
      if (currentStudent.nextDueDate && isValid(parseISO(currentStudent.nextDueDate)) && parseISO(currentStudent.nextDueDate) > baseDateForNextDue) {
        baseDateForNextDue = parseISO(currentStudent.nextDueDate);
      }
      const nextDueDate = addMonths(baseDateForNextDue, selectedMonths);
      setCalculatedNextDueDate(format(nextDueDate, 'PP'));

    } else {
      setTotalPayableAmount("Rs. 0");
      setCalculatedNextDueDate(null);
    }
  }, [currentStudent, selectedMonths, feeStructure]);

  const getFeeStatusDisplay = () => {
    if (isLoadingStudent || isLoadingFeeStructure) {
      return <div className="flex items-center justify-center py-2"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading fee details...</div>;
    }
    if (!currentStudent) {
      return <p className="text-sm text-destructive text-center py-2">Could not load your student information.</p>;
    }
    if (!feeStructure) {
      return <p className="text-sm text-destructive text-center py-2">Could not load fee structure.</p>;
    }
    if (currentStudent.activityStatus === 'Left') {
      return <p className="text-sm text-destructive text-center py-2">Your account is marked as 'Left'. Please contact admin for fee payments.</p>;
    }

    let currentMonthlyFeeString = "Rs. 0";
    if (feeStructure) {
        switch (currentStudent.shift) {
            case "morning": currentMonthlyFeeString = `Rs. ${feeStructure.morningFee}`; break;
            case "evening": currentMonthlyFeeString = `Rs. ${feeStructure.eveningFee}`; break;
            case "fullday": currentMonthlyFeeString = `Rs. ${feeStructure.fullDayFee}`; break;
        }
    }
    
    if (currentStudent.feeStatus === 'Paid' && currentStudent.nextDueDate && isValid(parseISO(currentStudent.nextDueDate))) {
      return (
        <div className="text-center py-2 space-y-1">
          <p className="text-sm text-green-600 font-medium">Your fees are currently paid.</p>
          <p className="text-xs text-muted-foreground">Next due date: {format(parseISO(currentStudent.nextDueDate), 'PP')}.</p>
        </div>
      );
    }
    
    let dueMessage = `Current Amount Due: ${currentStudent.amountDue && currentStudent.amountDue !== "Rs. 0" ? currentStudent.amountDue : currentMonthlyFeeString}.`;
    if (currentStudent.feeStatus === 'Overdue' && currentStudent.nextDueDate && isValid(parseISO(currentStudent.nextDueDate))) {
      dueMessage += ` Payment was due on ${format(parseISO(currentStudent.nextDueDate), 'PP')}.`;
    } else if (currentStudent.feeStatus === 'Due' && currentStudent.nextDueDate && isValid(parseISO(currentStudent.nextDueDate))) {
      dueMessage += ` Next due date is ${format(parseISO(currentStudent.nextDueDate), 'PP')}.`;
    }
    return (
      <div className={cn(
        "text-center py-2 space-y-1",
        currentStudent.feeStatus === 'Overdue' ? "text-red-600" : "text-yellow-600"
      )}>
        <p className="text-sm font-medium">
          {currentStudent.feeStatus === 'Overdue' ? 'Fee Overdue' : 'Fee Due'}
        </p>
        <p className="text-xs">{dueMessage}</p>
      </div>
    );
  };

  const canPay = currentStudent && currentStudent.activityStatus === 'Active' && feeStructure;

  return (
    <>
      <PageTitle title="Pay Your Fees" description="Information about your fee payment." />

      <Card className="mb-6 shadow-md bg-muted/30">
        <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base font-semibold text-center">Current Fee Status</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 pt-0">
            {getFeeStatusDisplay()}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <IndianRupee className="mr-2 h-5 w-5" />
              Fee Payment Details
            </CardTitle>
            <CardDescription>Review your payable amount. Payments are currently accepted at the desk.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="select-months">Select Number of Months to Pay</Label>
              <Select
                value={String(selectedMonths)}
                onValueChange={(value) => setSelectedMonths(Number(value))}
                disabled={!canPay || isLoadingStudent || isLoadingFeeStructure}
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
              <p className="text-2xl font-bold">{isLoadingFeeStructure || isLoadingStudent ? <Loader2 className="h-6 w-6 animate-spin" /> : totalPayableAmount}</p>
              {calculatedNextDueDate && canPay && !isLoadingStudent && !isLoadingFeeStructure && (
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <CalendarCheck2 className="mr-1 h-3 w-3" />
                  If paid, fees will be covered up to: {calculatedNextDueDate}
                </p>
              )}
            </div>
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Payment Instructions</AlertTitle>
                <AlertDescription>
                  <p className="font-semibold">Online UPI Payments are coming soon!</p>
                  <p className="mt-1">For now, please pay your fees at the library reception desk.</p>
                  <p className="mt-1">An admin will update your payment status in the system after you've paid.</p>
                </AlertDescription>
            </Alert>
          </CardContent>
          {/* Footer removed as no direct pay action here */}
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheck className="mr-2 h-5 w-5" />
              Payment Information
            </CardTitle>
            <CardDescription>How to pay your fees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="default" className="border-primary/30 bg-primary/5">
              <IndianRupee className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Pay at Desk</AlertTitle>
              <AlertDescription>
                Please pay your fees at the library reception desk. You can pay via cash or other methods available at the desk.
                Your payment status will be updated by an admin shortly after.
              </AlertDescription>
            </Alert>
             <Alert variant="destructive">
              <CreditCard className="h-4 w-4" />
              <AlertTitle>Online Gateway (Coming Soon)</AlertTitle>
              <AlertDescription>
                Secure online payments via UPI, Credit/Debit Card, or Net Banking will be available in a future update.
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

    