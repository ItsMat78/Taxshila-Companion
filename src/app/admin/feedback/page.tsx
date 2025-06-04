
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MailWarning, MessageSquare, Archive, CheckCircle } from 'lucide-react';

// Placeholder data for feedback
const placeholderFeedback = [
  { id: "FB001", studentId: "TS002", studentName: "Priya Patel", date: "2024-06-28", type: "Complaint", message: "The AC in the evening shift section is not working properly. It gets very warm.", status: "Open" },
  { id: "FB002", studentId: "TS005", studentName: "Neha Reddy", date: "2024-06-27", type: "Suggestion", message: "Could we have more charging points available near the window seats?", status: "Open" },
  { id: "FB003", studentId: "TS001", studentName: "Aarav Sharma", date: "2024-06-25", type: "Compliment", message: "The staff is very helpful and the library is always clean. Great job!", status: "Closed" },
  { id: "FB004", studentId: "TS008", studentName: "Kavita Singh", date: "2024-06-22", type: "Issue", message: "Water dispenser on the 1st floor is empty.", status: "Open" },
];

export default function AdminFeedbackPage() {
  // Placeholder action handlers
  const handleMarkAsResolved = (feedbackId: string) => {
    console.log(`Marking feedback ${feedbackId} as resolved.`);
    // In a real app, update the status in the backend
  };

  const handleArchiveFeedback = (feedbackId: string) => {
    console.log(`Archiving feedback ${feedbackId}.`);
    // In a real app, update the status or move to an archive
  };

  return (
    <>
      <PageTitle title="Member Feedback & Complaints" description="Review and manage feedback submitted by students." />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Received Feedback
          </CardTitle>
          <CardDescription>List of all feedback items. Prioritize open items.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[40%]">Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placeholderFeedback.map((item) => (
                <TableRow key={item.id} className={item.status === "Open" ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}>
                  <TableCell className="text-xs">{item.date}</TableCell>
                  <TableCell className="font-medium">{item.studentName} ({item.studentId})</TableCell>
                  <TableCell>
                    <Badge variant={item.type === "Complaint" || item.type === "Issue" ? "destructive" : item.type === "Compliment" ? "default" : "secondary"} className="capitalize bg-opacity-80">
                      {item.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{item.message}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === "Open" ? "outline" : "default"} className={item.status === "Open" ? "border-yellow-500 text-yellow-600" : "bg-green-100 text-green-700"}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-1">
                    {item.status === "Open" && (
                      <Button variant="ghost" size="sm" onClick={() => handleMarkAsResolved(item.id)} title="Mark as Resolved">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleArchiveFeedback(item.id)} title="Archive">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {placeholderFeedback.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                     <MailWarning className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    No feedback received yet.
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
