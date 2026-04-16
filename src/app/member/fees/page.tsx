
"use client";

import * as React from 'react';
import Image from 'next/image';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Receipt, History, Download, IndianRupee, Loader2, Briefcase, CalendarClock, AlertTriangle, CheckCircle, CreditCard, Sun, Moon, Sparkles, Smartphone, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getFeeStructure, getStudentByCustomId } from '@/services/student-service';
import type { Student, PaymentRecord, FeeStructure as FeeStructureType, Shift } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

function formatPeriod(prev?: string, next?: string): string {
  const fmtDate = (d?: string) =>
    d && isValid(parseISO(d)) ? format(parseISO(d), 'dd MMM') : null;
  const p = fmtDate(prev);
  const n = fmtDate(next);
  if (!p && !n) return '—';
  if (!p) return `? → ${n}`;
  if (!n) return `${p} → ?`;
  return `${p} → ${n}`;
}

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  let w = '';
  if (n >= 1000) { w += ones[Math.floor(n / 1000)] + ' Thousand '; n %= 1000; }
  if (n >= 100) { w += ones[Math.floor(n / 100)] + ' Hundred '; n %= 100; }
  if (n >= 20) { w += tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''); n = 0; }
  else if (n > 0) { w += ones[n]; }
  return w.trim();
}

const generateReceipt = (payment: PaymentRecord, student: Student) => {
  const win = window.open('', '_blank');
  if (!win) return;

  const receiptNo = payment.paymentId;
  const issueDate = payment.date && isValid(parseISO(payment.date))
    ? format(parseISO(payment.date), 'dd MMM, yyyy')
    : 'N/A';
  const shiftDisplay = student.shift === 'fullday' ? 'Full Day'
    : student.shift.charAt(0).toUpperCase() + student.shift.slice(1);
  const renewalPeriod = formatPeriod(payment.previousDueDate, payment.newDueDate);
  const activeTill = payment.newDueDate && isValid(parseISO(payment.newDueDate))
    ? format(parseISO(payment.newDueDate), 'dd MMM, yyyy')
    : 'N/A';
  const rawAmount = parseInt(payment.amount.replace(/[^\d]/g, ''), 10) || 0;
  const amountInWords = `Rupees ${numberToWords(rawAmount)} Only`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payment Receipt — ${receiptNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 32px; }
    .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
    .biz-name { font-size: 18px; font-weight: bold; }
    .biz-sub { font-size: 11px; color: #444; margin-top: 3px; line-height: 1.5; }
    .receipt-label { font-size: 20px; font-weight: bold; text-align: right; }
    .receipt-meta { font-size: 11px; color: #444; text-align: right; margin-top: 4px; line-height: 1.6; }
    .divider { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .label { color: #555; }
    .bold { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { border: 1px solid #000; padding: 7px 10px; text-align: left; font-size: 12px; }
    td { border: 1px solid #ccc; padding: 7px 10px; font-size: 12px; }
    td.right { text-align: right; }
    .total-row td { border-top: 2px solid #000; font-weight: bold; }
    .words { font-size: 11px; color: #444; margin-top: 3px; font-style: italic; }
    .footer { margin-top: 24px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 11px; color: #666; text-align: center; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="top">
    <div>
      <div class="biz-name">Taxshila Digital Library</div>
      <div class="biz-sub">SA-17/144/79, Agrasen Nagar Colony, Paharia<br>Varanasi, Uttar Pradesh 221007<br>+91 6306343791</div>
    </div>
    <div>
      <div class="receipt-label">PAYMENT RECEIPT</div>
      <div class="receipt-meta">
        Receipt No: <strong>${receiptNo}</strong><br>
        Date: ${issueDate}
      </div>
    </div>
  </div>

  <div class="row"><span class="label">Member Name</span><span class="bold">${student.name}</span></div>
  <div class="row"><span class="label">Member ID</span><span>${student.studentId}</span></div>
  ${student.phone ? `<div class="row"><span class="label">Phone</span><span>${student.phone}</span></div>` : ''}
  <div class="row"><span class="label">Shift</span><span>${shiftDisplay}</span></div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr><th>Description</th><th>Renewal Period</th><th>Active Until</th><th style="text-align:right;">Amount</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Monthly Library Membership</td>
        <td>${renewalPeriod}</td>
        <td>${activeTill}</td>
        <td class="right">Rs. ${rawAmount}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align:right;">Total Paid</td>
        <td class="right">Rs. ${rawAmount}</td>
      </tr>
    </tfoot>
  </table>

  <div class="words">${amountInWords}</div>

  <div class="divider"></div>

  <div class="row"><span class="label">Mode of Payment</span><span>${payment.method}</span></div>
  <div class="row"><span class="label">Transaction ID</span><span>${payment.transactionId || '—'}</span></div>

  <div class="footer">
    Thank you for being a valued member of Taxshila Digital Library.<br>
    This is a computer-generated receipt and does not require a signature.
  </div>
  <script>setTimeout(() => window.print(), 300);</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
};

// New Shift Display Card Component
const ShiftDisplayCard = ({ shift }: { shift: Shift }) => {
  const shiftDetails = {
    morning: {
      name: 'Morning Shift',
      timing: '7 AM - 2 PM',
      icon: (
        <svg viewBox="0 0 100 60" className="absolute inset-0 z-0 w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
          <path d="M-5,65 l25,-20 l15,10 l25,-20 l15,10 l25,-20 v25 h-105 z" fill="#855a3a" />
          <path d="M-5,65 l30,-25 l15,10 l20,-15 l15,10 l25,-20 v25 h-105 z" fill="#6b482f" />
          <circle cx="80" cy="15" r="8" fill="hsl(25, 95%, 60%)" />
          <circle cx="20" cy="20" r="5" fill="hsl(var(--background)/0.4)" />
          <circle cx="45" cy="15" r="7" fill="hsl(var(--background)/0.4)" />
        </svg>
      ),
      gradient: 'from-orange-100 to-sky-200 dark:from-orange-900/30 dark:to-sky-900/40',
    },
    evening: {
      name: 'Evening Shift',
      timing: '2 PM - 9:30 PM',
       icon: (
        <svg viewBox="0 0 100 60" className="absolute inset-0 z-0 w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
          <path d="M-5,65 l15,-40 l15,40 z" fill="hsl(120, 60%, 15%)" />
          <path d="M15,65 l15,-35 l15,35 z" fill="hsl(120, 60%, 20%)" />
          <path d="M35,65 l15,-45 l15,45 z" fill="hsl(120, 60%, 15%)" />
          <path d="M55,65 l15,-38 l15,38 z" fill="hsl(120, 60%, 20%)" />
          <path d="M75,65 l15,-42 l15,42 z" fill="hsl(120, 60%, 15%)" />
          <circle cx="85" cy="15" r="8" fill="hsl(60, 80%, 90%)" />
          <circle cx="20" cy="10" r="1.5" fill="hsl(60, 80%, 90%)" />
          <circle cx="45" cy="20" r="1" fill="hsl(60, 80%, 90%)" />
          <circle cx="65" cy="12" r="1.5" fill="hsl(60, 80%, 90%)" />
        </svg>
      ),
      gradient: 'from-indigo-800 to-slate-800 dark:from-indigo-900/40 dark:to-slate-900/50',
    },
    fullday: {
      name: 'Full Day',
      timing: '7 AM - 9:30 PM',
      icon: (
        <svg viewBox="0 0 100 60" className="absolute inset-0 z-0 w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
          <path d="M-5,35 C30,50 70,50 105,35 V65 H-5 z" fill="hsl(200, 70%, 50%)" />
          <path d="M-5,40 C30,55 70,55 105,40 V65 H-5 z" fill="hsl(200, 70%, 60%)" />
          <path d="M-5,45 C30,60 70,60 105,45 V65 H-5 z" fill="hsl(40, 80%, 70%)" />
          <circle cx="20" cy="20" r="10" fill="hsl(50, 100%, 60%)">
             <animate attributeName="cy" values="20;18;20" dur="3s" repeatCount="indefinite" />
          </circle>
        </svg>
      ),
      gradient: 'from-yellow-100 to-sky-300 dark:from-yellow-900/30 dark:to-sky-900/50',
    },
  };

  const currentShift = shiftDetails[shift];

  return (
    <div className={cn(
      "p-3 sm:p-4 rounded-lg bg-gradient-to-br",
      "relative min-h-[120px] overflow-hidden flex flex-col justify-end items-start col-span-2 md:col-span-3",
      currentShift.gradient
    )}>
        {currentShift.icon}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="relative z-10 p-2">
            <p className="font-semibold text-lg sm:text-xl text-white drop-shadow-sm">{currentShift.name}</p>
            <p className="text-xs sm:text-sm text-white/90 font-medium drop-shadow-sm">{currentShift.timing}</p>
        </div>
    </div>
  );
};



// A new component for individual stat boxes
const StatBox = ({ title, value, icon, badge }: { title: string, value: string | React.ReactNode, icon?: React.ElementType, badge?: React.ReactNode }) => {
    const Icon = icon;
    return (
        <div className="p-3 sm:p-4 rounded-lg bg-muted/50 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                {Icon && <Icon className="h-4 w-4" />}
                <p className="text-sm font-medium">{title}</p>
            </div>
            {badge ? (
                <div className="mt-1">{badge}</div>
            ) : (
                <p className="text-xl sm:text-2xl font-bold break-words">{value}</p>
            )}
        </div>
    );
};

// Mobile Card Item for Payment History
const PaymentHistoryCardItem = ({ payment, student }: { payment: PaymentRecord; student: Student }) => (
  <div className="p-3 border rounded-md bg-muted/30 shadow-sm">
    <div className="flex justify-between items-start mb-1">
      <div className="font-semibold text-sm">{payment.amount}</div>
      <Badge variant="outline" className="text-xs capitalize">
        <CreditCard className="mr-1 h-3 w-3"/>
        {payment.method}
      </Badge>
    </div>
    <div className="text-xs text-muted-foreground space-y-1">
      <p>Date: {payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'dd-MMM-yy') : 'N/A'}</p>
      <p>Period: {formatPeriod(payment.previousDueDate, payment.newDueDate)}</p>
      <p>Transaction ID: {payment.transactionId}</p>
    </div>
    <div className="mt-2">
      <Button variant="outline" size="sm" onClick={() => generateReceipt(payment, student)} className="w-full">
        <Download className="mr-1 h-3 w-3" /> Receipt
      </Button>
    </div>
  </div>
);


export default function MemberFeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = React.useState<Student | null>(null);
  const [feeStructure, setFeeStructure] = React.useState<FeeStructureType | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showHistory, setShowHistory] = React.useState(false);
  const [showUpiReturn, setShowUpiReturn] = React.useState(false);
  const [upiPending, setUpiPending] = React.useState(false);
  const [lastUpiTn, setLastUpiTn] = React.useState<string>('');

  const getFeeAmount = (): number => {
    if (!feeStructure || !studentData) return 0;
    switch (studentData.shift) {
      case 'morning': return feeStructure.morningFee;
      case 'evening': return feeStructure.eveningFee;
      case 'fullday': return feeStructure.fullDayFee;
      default: return 0;
    }
  };

  const handleUpiPayment = () => {
    if (!studentData || !feeStructure) return;
    const amount = getFeeAmount();
    const tn = `TXNONL${studentData.studentId}${format(new Date(), 'ddMMyyHHmmss')}`;
    const upiUri = `upi://pay?pa=kartikey.code@okhdfcbank&pn=Taxshila%20Digital%20Library&am=${amount}&cu=INR&tn=${encodeURIComponent(tn)}`;
    setUpiPending(true);

    const med = (window as any).median;
    if (med?.android?.intent) {
      med.android.intent({
        uri: upiUri,
        callback: (result: { status?: string; txnId?: string; txnRef?: string }) => {
          setUpiPending(false);
          const status = (result?.status || '').toUpperCase();
          if (status === 'SUCCESS') {
            const txnId = result.txnId || result.txnRef || tn;
            toast({ title: 'Payment received!', description: `Transaction ID: ${txnId}. Admin has been notified to verify your account.` });
            fetch('/api/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'payment-alert',
                studentName: studentData!.name,
                studentId: studentData!.studentId,
                amount,
                txnId,
              }),
            }).catch(console.error);
          } else {
            setLastUpiTn(tn);
            setShowUpiReturn(true);
          }
        },
      });
    } else {
      setLastUpiTn(tn);
      window.location.href = upiUri;
    }
  };

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

  React.useEffect(() => {
    if (!upiPending) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setShowUpiReturn(true);
        setUpiPending(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [upiPending]);

  const handlePaymentConfirmed = () => {
    setShowUpiReturn(false);
    if (!studentData) return;
    const amount = getFeeAmount();
    fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment-alert',
        studentName: studentData.name,
        studentId: studentData.studentId,
        amount,
        txnId: lastUpiTn || undefined,
      }),
    }).catch(console.error);
    toast({
      title: 'Admin Notified',
      description: 'Admin has been alerted to verify your payment. Your account will be updated shortly.',
    });
  };

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
    const baseClasses = "text-sm capitalize border-transparent";
    if (activityStatus === 'Left') {
      return <Badge className={cn(baseClasses, "bg-status-left-bg text-status-left-text")}>N/A (Left)</Badge>;
    }
    switch (status) {
      case "Paid": return <Badge className={cn(baseClasses, "bg-status-paid-bg text-status-paid-text")}><CheckCircle className="mr-1 h-3 w-3" /> Paid</Badge>;
      case "Due": return <Badge className={cn(baseClasses, "bg-status-due-bg text-status-due-text")}><CalendarClock className="mr-1 h-3 w-3" />Due</Badge>;
      case "Overdue": return <Badge variant="destructive" className="text-sm capitalize"><AlertTriangle className="mr-1 h-3 w-3" />Overdue</Badge>;
      default: return <Badge variant="outline" className="capitalize text-sm">{status || 'N/A'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <>
        <PageTitle title="My Fee Details" description="Loading your fee status and payment history..." />
        <div className="flex justify-center items-center py-10">
          <Loader2 role="status" aria-label="Loading" className="h-8 w-8 animate-spin text-primary" />
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
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ShiftDisplayCard shift={studentData.shift} />
            <StatBox title="Monthly Fee" value={getMonthlyFeeDisplay(studentData.shift, feeStructure)} icon={IndianRupee} />
            <StatBox title="Fee Status" value="" badge={getFeeStatusBadge(studentData.feeStatus, studentData.activityStatus)} />
            <StatBox title="Amount Due" value={studentData.activityStatus === 'Left' ? 'N/A' : (studentData.amountDue && studentData.amountDue !== "Rs. 0" ? studentData.amountDue : getMonthlyFeeDisplay(studentData.shift, feeStructure))} icon={IndianRupee} />
            <StatBox title="Next Due Date" value={studentData.activityStatus === 'Left' ? 'N/A' : (studentData.nextDueDate && isValid(parseISO(studentData.nextDueDate)) ? format(parseISO(studentData.nextDueDate), 'PP') : "N/A")} icon={CalendarClock} />
        </CardContent>
      </Card>

      {studentData && studentData.feeStatus !== 'Paid' && (
        <Card className="mt-4 overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-br from-primary to-primary/80 dark:from-indigo-500 dark:to-violet-600 px-5 pt-4 pb-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-75">Monthly Membership</p>
                <p className="text-xs font-mono opacity-60 mt-0.5">kartikey.code@okhdfcbank</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tracking-tight">Rs. {getFeeAmount()}</p>
                <p className="text-xs opacity-70">{studentData.shift === 'fullday' ? 'Full Day' : studentData.shift.charAt(0).toUpperCase() + studentData.shift.slice(1)} Shift</p>
              </div>
            </div>
          </div>
          <CardContent className="p-4 space-y-2">
            <button
              onClick={handleUpiPayment}
              className="w-full flex items-center justify-between gap-3 rounded-xl bg-white border border-border shadow-sm px-5 py-4 active:scale-[0.98] transition-transform hover:bg-gray-50"
            >
              <Image src="/upi-logo.svg" alt="UPI" width={64} height={24} className="h-6 w-auto" />
              <span className="font-bold text-base text-foreground">Pay Now &mdash; Rs. {getFeeAmount()}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
            <p className="text-xs text-muted-foreground text-center leading-relaxed pt-1">
              Opens your UPI app. Return here after payment — admin will verify and update your account.
            </p>
          </CardContent>
        </Card>
      )}

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
                  <>
                    <div className="md:hidden space-y-3 max-h-80 overflow-y-auto">
                      {paymentHistory.slice().reverse().map((payment: PaymentRecord) => (
                        <PaymentHistoryCardItem key={payment.paymentId} payment={payment} student={studentData!} />
                      ))}
                    </div>
                    <div className="hidden md:block max-h-80 w-full overflow-y-auto overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Period</TableHead>
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
                              <TableCell className="whitespace-nowrap">{formatPeriod(payment.previousDueDate, payment.newDueDate)}</TableCell>
                              <TableCell className="capitalize whitespace-nowrap">{payment.method}</TableCell>
                              <TableCell className="whitespace-nowrap">{payment.transactionId}</TableCell>
                               <TableCell className="whitespace-nowrap">
                                <Button variant="outline" size="sm" onClick={() => generateReceipt(payment, studentData!)}>
                                  <Download className="mr-1 h-3 w-3" /> Receipt
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No payment history available.</p>
                )
            )}
        </CardContent>
      </Card>

      <AlertDialog open={showUpiReturn} onOpenChange={setShowUpiReturn}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Did your payment go through?</AlertDialogTitle>
            <AlertDialogDescription>
              If your UPI payment was successful, please inform the admin with your transaction ID. Your account will be updated after verification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, I&apos;ll try again</AlertDialogCancel>
            <AlertDialogAction onClick={handlePaymentConfirmed}>
              Yes, I paid — notify admin!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
