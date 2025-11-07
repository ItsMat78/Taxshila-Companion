
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, History, Download, IndianRupee, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getFeeStructure, getStudentByCustomId } from '@/services/student-service';
import type { Student, PaymentRecord, FeeStructure as FeeStructureType } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

export default function MemberFeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = React.useState<Student | null>(null);
  const [feeStructure, setFeeStructure] = React.useState<FeeStructureType | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    const fetchInitialData = async () => {
      try {
        let student = null;
        if (user?.studentId) {
          student = await getStudentByCustomId(user.studentId);
        } else if (user?.email) {
          student = await getStudentByEmail(user.email);
        }

        const fees = await getFeeStructure();

        if (student) {
          setStudentData(student);
        } else {
          toast({
            title: "Error",
            description: "Could not find your student record.",
            variant: "destructive",
          });
        }
        setFeeStructure(fees);
      } catch (error) {
        console.error("Failed to fetch student data or fees for fees page:", error);
        toast({
          title: "Error",
          description: "Failed to load your fee details or settings.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [user, toast]);

  const getMonthlyFeeDisplay = (shift?: Student['shift'], currentFeeStructure?: FeeStructureType | null): string => {
    if (!shift || !currentFeeStructure) return "N/A";
    switch (shift) {
      case "morning": return `Rs. ${currentFeeStructure.morningFee}`;
      case "evening": return `Rs. ${currentFeeStructure.eveningFee}`;
      case "fullday": return `Rs. ${currentFeeStructure.fullDayFee}`;
      default: return "N/A";
    }
  };
  
  const getFeeStatusBadge = (status?: Student['feeStatus'], activityStatus?: Student['activityStatus']) => {
    if (activityStatus === 'Left') {
      return <Badge className="capitalize bg-status-left-bg text-status-left-text border-transparent">N/A (Left)</Badge>;
    }
    switch (status) {
      case "Paid": return <Badge className="capitalize bg-status-paid-bg text-status-paid-text border-transparent">Paid</Badge>; 
      case "Due": return <Badge className="capitalize bg-status-due-bg text-status-due-text border-transparent">Due</Badge>; 
      case "Overdue": return <Badge variant="destructive" className="capitalize">Overdue</Badge>;
      default: return <Badge variant="outline" className="capitalize">{status || 'N/A'}</Badge>;
    }
  };


  if (isLoading) {
    return (
      <>
        <PageTitle title="My Fee Details" description="Loading your fee status and payment history..." />
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!studentData || !feeStructure) {
    return (
      <>
        <PageTitle title="My Fee Details" description="Could not load your information." />
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              We could not retrieve your fee details. Please try again later or contact support.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const paymentHistory = studentData.paymentHistory || [];

  return (
    <>
      <PageTitle title="My Fee Details" description="View your current fee status and payment history." />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <IndianRupee className="mr-2 h-5 w-5" />
              Current Plan & Status
            </CardTitle>
            <CardDescription>Overview of your current subscription.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan Type:</span>
              <span className="font-medium capitalize">{studentData.shift} Shift</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Fee:</span>
              <span className="font-medium">{getMonthlyFeeDisplay(studentData.shift, feeStructure)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              {getFeeStatusBadge(studentData.feeStatus, studentData.activityStatus)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Due:</span>
              <span className="font-medium">{studentData.activityStatus === 'Left' ? 'N/A' : (studentData.amountDue && studentData.amountDue !== "Rs. 0" ? studentData.amountDue : getMonthlyFeeDisplay(studentData.shift, feeStructure))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Due Date:</span>
              <span className="font-medium">{studentData.activityStatus === 'Left' ? 'N/A' : (studentData.nextDueDate && isValid(parseISO(studentData.nextDueDate)) ? format(parseISO(studentData.nextDueDate), 'PP') : "N/A")}</span>
            </div>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">Please pay your fees at the desk. Online payments are coming soon.</p>
           </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>Your past transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.slice().reverse().map((payment: PaymentRecord) => ( 
                    <TableRow key={payment.paymentId}>
                      <TableCell>{payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'dd-MMM-yy') : 'N/A'}</TableCell>
                      <TableCell>{payment.amount}</TableCell>
                      <TableCell className="capitalize">{payment.method}</TableCell>
                      <TableCell>{payment.transactionId}</TableCell>
                       <TableCell>
                        <Button variant="outline" size="sm" disabled>
                          <Download className="mr-1 h-3 w-3" /> Invoice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No payment history available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

    