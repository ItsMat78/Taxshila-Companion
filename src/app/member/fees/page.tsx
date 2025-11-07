
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
import { Receipt, History, Download, IndianRupee, Loader2, Briefcase, CalendarClock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getFeeStructure, getStudentByCustomId } from '@/services/student-service';
import type { Student, PaymentRecord, FeeStructure as FeeStructureType } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

// A new component for individual stat boxes
const StatBox = ({ title, value, icon, badge }: { title: string, value: string | React.ReactNode, icon?: React.ElementType, badge?: React.ReactNode }) => {
    const Icon = icon;
    return (
        <div className="p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                {Icon && <Icon className="h-4 w-4" />}
                <p className="text-sm font-medium">{title}</p>
            </div>
            {badge ? (
                <div className="mt-1">{badge}</div>
            ) : (
                <p className="text-2xl font-bold break-words">{value}</p>
            )}
        </div>
    );
};


export default function MemberFeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = React.useState<Student | null>(null);
  const [feeStructure, setFeeStructure] = React.useState<FeeStructureType | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showHistory, setShowHistory] = React.useState(false);

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
    const baseClasses = "text-base capitalize border-transparent";
    if (activityStatus === 'Left') {
      return <Badge className={cn(baseClasses, "bg-status-left-bg text-status-left-text")}>N/A (Left)</Badge>;
    }
    switch (status) {
      case "Paid": return <Badge className={cn(baseClasses, "bg-status-paid-bg text-status-paid-text")}><CheckCircle className="mr-1 h-3 w-3" /> Paid</Badge>; 
      case "Due": return <Badge className={cn(baseClasses, "bg-status-due-bg text-status-due-text")}><CalendarClock className="mr-1 h-3 w-3" />Due</Badge>; 
      case "Overdue": return <Badge variant="destructive" className="text-base capitalize"><AlertTriangle className="mr-1 h-3 w-3" />Overdue</Badge>;
      default: return <Badge variant="outline" className="capitalize text-base">{status || 'N/A'}</Badge>;
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

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Fee Overview</CardTitle>
          <CardDescription>Your current subscription details.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatBox title="Plan Type" value={studentData.shift} icon={Briefcase} />
            <StatBox title="Monthly Fee" value={getMonthlyFeeDisplay(studentData.shift, feeStructure)} icon={IndianRupee} />
            <StatBox title="Fee Status" value="" badge={getFeeStatusBadge(studentData.feeStatus, studentData.activityStatus)} />
            <StatBox title="Amount Due" value={studentData.activityStatus === 'Left' ? 'N/A' : (studentData.amountDue && studentData.amountDue !== "Rs. 0" ? studentData.amountDue : getMonthlyFeeDisplay(studentData.shift, feeStructure))} icon={IndianRupee} />
            <StatBox title="Next Due Date" value={studentData.activityStatus === 'Left' ? 'N/A' : (studentData.nextDueDate && isValid(parseISO(studentData.nextDueDate)) ? format(parseISO(studentData.nextDueDate), 'PP') : "N/A")} icon={CalendarClock} />
             <div className="p-4 rounded-lg bg-primary/5 border-primary/20 border flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
                <p className="text-sm font-medium text-primary">Need to Pay?</p>
                <p className="text-xs text-muted-foreground mt-1 mb-2">Please pay your fees at the library reception desk.</p>
                <p className="text-xs text-muted-foreground">Online payments are coming soon.</p>
            </div>
        </CardContent>
      </Card>
      
      <Card className="mt-6 shadow-lg">
        <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your recorded past transactions.</CardDescription>
        </CardHeader>
        <CardContent>
            {!showHistory ? (
                <div className="text-center">
                    <Button onClick={() => setShowHistory(true)}>
                        <History className="mr-2 h-4 w-4"/> View Payment History
                    </Button>
                </div>
            ) : (
                paymentHistory.length > 0 ? (
                  <div className="overflow-auto max-h-80">
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
                            <TableCell className="whitespace-nowrap">{payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'dd-MMM-yy') : 'N/A'}</TableCell>
                            <TableCell className="whitespace-nowrap">{payment.amount}</TableCell>
                            <TableCell className="capitalize whitespace-nowrap">{payment.method}</TableCell>
                            <TableCell className="whitespace-nowrap">{payment.transactionId}</TableCell>
                             <TableCell className="whitespace-nowrap">
                              <Button variant="outline" size="sm" disabled>
                                <Download className="mr-1 h-3 w-3" /> Invoice
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No payment history available.</p>
                )
            )}
        </CardContent>
      </Card>
    </>
  );
}

