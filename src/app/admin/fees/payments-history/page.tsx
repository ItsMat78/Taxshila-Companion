
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { History, ListChecks, CreditCard } from 'lucide-react';

// Placeholder data for payment history
const placeholderPaymentHistory = [
  { id: "PAY001", studentId: "TS001", studentName: "Aarav Sharma", date: "2024-06-01", amount: "₹700", transactionId: "TXN12345601", method: "UPI" },
  { id: "PAY002", studentId: "TS002", studentName: "Priya Patel", date: "2024-06-02", amount: "₹700", transactionId: "TXN12345602", method: "Cash" },
  { id: "PAY003", studentId: "TS003", studentName: "Rohan Mehta", date: "2024-05-15", amount: "₹1200", transactionId: "TXN12345523", method: "UPI" },
  { id: "PAY004", studentId: "TS004", studentName: "Vikram Singh", date: "2024-06-03", amount: "₹700", transactionId: "TXN12345604", method: "Card" },
  { id: "PAY005", studentId: "TS007", studentName: "Sanya Gupta", date: "2024-05-10", amount: "₹700", transactionId: "TXN12345400", method: "UPI" },
];

export default function PaymentHistoryPage() {
  return (
    <>
      <PageTitle title="Recent Payment History" description="View a log of recent fee payments made by students." />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListChecks className="mr-2 h-5 w-5 text-primary" />
            All Payments
          </CardTitle>
          <CardDescription>Displaying recent transactions. Placeholder data used.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placeholderPaymentHistory.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.id}</TableCell>
                  <TableCell className="font-medium">{payment.studentName} ({payment.studentId})</TableCell>
                  <TableCell>{payment.date}</TableCell>
                  <TableCell>{payment.amount}</TableCell>
                  <TableCell>{payment.transactionId}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      <CreditCard className="mr-1 h-3 w-3"/> 
                      {payment.method}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {placeholderPaymentHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                     <History className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    No payment history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
