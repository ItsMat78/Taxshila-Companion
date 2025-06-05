
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
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getFeeStructure } from '@/services/student-service'; // Added getFeeStructure
import type { Student, PaymentRecord, FeeStructure as FeeStructureType } from '@/types/student'; // Added FeeStructureType
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns'; // Ensure format, parseISO, isValid are imported

export default function MemberFeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = React.useState<Student | null>(null);
  const [feeStructure, setFeeStructure] = React.useState<FeeStructureType | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (user?.email) {
      const fetchInitialData = async () => {
        setIsLoading(true);
        try {
          const [student, fees] = await Promise.all([
            getStudentByEmail(user.email),
            getFeeStructure()
          ]);

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
    } else {
      setIsLoading(false); 
    }
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
  
  const getFeeStatusBadgeVariant = (status?: Student['feeStatus'], activityStatus?: Student['activityStatus']) => {
    if (activityStatus === 'Left') return "secondary";
    switch (status) {
      case "Paid": return "default"; 
      case "Due": return "default"; 
      case "Overdue": return "destructive";
      default: return "outline";
    }
  };

  const getFeeStatusBadgeClasses = (status?: Student['feeStatus'], activityStatus?: Student['activityStatus']) => {
     if (activityStatus === 'Left') return "bg-gray-100 text-gray-700";
     switch (status) {
      case "Paid": return "bg-green-100 text-green-700";
      case "Due": return "bg-yellow-100 text-yellow-700";
      case "Overdue": return "bg-red-100 text-red-700"; 
      default: return "";
    }
  }


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
              <Badge 
                variant={getFeeStatusBadgeVariant(studentData.feeStatus, studentData.activityStatus)} 
                className={`capitalize px-2 py-1 text-xs ${getFeeStatusBadgeClasses(studentData.feeStatus, studentData.activityStatus)}`}
              >
                {studentData.activityStatus === 'Left' ? 'N/A (Left)' : studentData.feeStatus}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Due:</span>
              <span className="font-medium">{studentData.activityStatus === 'Left' ? 'N/A' : (studentData.amountDue && studentData.amountDue !== "Rs. 0" ? studentData.amountDue : getMonthlyFeeDisplay(studentData.shift, feeStructure))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Due Date:</span>
              <span className="font-medium">{studentData.activityStatus === 'Left' ? 'N/A' : (studentData.nextDueDate && isValid(parseISO(studentData.nextDueDate)) ? format(parseISO(studentData.nextDueDate), 'PP') : "N/A")}</span>
            </div>
            {studentData.activityStatus === 'Active' && studentData.feeStatus !== 'Paid' && (
                <Link href="/member/pay" passHref legacyBehavior>
                  <Button className="w-full mt-4">
                     <Receipt className="mr-2 h-4 w-4" /> Proceed to Pay Fees
                  </Button>
                </Link>
            )}
          </CardContent>
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

    