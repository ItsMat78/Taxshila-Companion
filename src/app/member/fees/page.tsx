
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
import { Receipt, History, Download, IndianRupee } from 'lucide-react'; // Changed DollarSign to IndianRupee
import Link from 'next/link';

// Placeholder data for fee details and payment history
const placeholderFeeDetails = {
  planType: "Monthly Standard",
  monthlyFee: "₹700",
  status: "Paid", // Could be "Paid", "Due", "Overdue"
  nextDueDate: "2024-07-01",
};

const placeholderPaymentHistory = [
  { date: "2024-06-01", amount: "₹700", status: "Successful", transactionId: "TXN12345601" },
  { date: "2024-05-02", amount: "₹700", status: "Successful", transactionId: "TXN12345523" },
  { date: "2024-04-01", amount: "₹700", status: "Successful", transactionId: "TXN12345400" },
];

export default function MemberFeesPage() {
  return (
    <>
      <PageTitle title="My Fee Details" description="View your current fee status and payment history." />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <IndianRupee className="mr-2 h-5 w-5" /> {/* Changed DollarSign to IndianRupee */}
              Current Plan & Status
            </CardTitle>
            <CardDescription>Overview of your current subscription.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan Type:</span>
              <span className="font-medium">{placeholderFeeDetails.planType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Fee:</span>
              <span className="font-medium">{placeholderFeeDetails.monthlyFee}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={placeholderFeeDetails.status === "Paid" ? "default" : "destructive"} className="capitalize bg-green-100 text-green-700 data-[variant=destructive]:bg-red-100 data-[variant=destructive]:text-red-700 px-2 py-1 text-xs">
                {placeholderFeeDetails.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next Due Date:</span>
              <span className="font-medium">{placeholderFeeDetails.nextDueDate}</span>
            </div>
            <Link href="/member/pay" passHref legacyBehavior>
              <Button className="w-full mt-4">
                 <Receipt className="mr-2 h-4 w-4" /> Proceed to Pay Fees
              </Button>
            </Link>
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
            {placeholderPaymentHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placeholderPaymentHistory.map((payment) => (
                    <TableRow key={payment.transactionId}>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>{payment.amount}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === "Successful" ? "default" : "destructive"} className="capitalize bg-green-100 text-green-700 data-[variant=destructive]:bg-red-100 data-[variant=destructive]:text-red-700 px-2 py-1 text-xs">
                          {payment.status}
                        </Badge>
                      </TableCell>
                       <TableCell>
                        <Button variant="outline" size="sm" disabled> {/* Placeholder */}
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
