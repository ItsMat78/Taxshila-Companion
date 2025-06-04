
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
import { MailWarning, MessageSquare, Archive, CheckCircle, Loader2 } from 'lucide-react';
import { getAllFeedback, updateFeedbackStatus as updateFeedbackStatusService } from '@/services/student-service';
import type { FeedbackItem, FeedbackStatus } from '@/types/communication';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

export default function AdminFeedbackPage() {
  const { toast } = useToast();
  const [feedbackList, setFeedbackList] = React.useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdatingId, setIsUpdatingId] = React.useState<string | null>(null); // Store ID of item being updated

  const fetchFeedback = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllFeedback();
      setFeedbackList(data);
    } catch (error) {
      console.error("Failed to fetch feedback:", error);
      toast({ title: "Error", description: "Could not load feedback.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleUpdateStatus = async (feedbackId: string, newStatus: FeedbackStatus) => {
    setIsUpdatingId(feedbackId);
    try {
      await updateFeedbackStatusService(feedbackId, newStatus);
      toast({
        title: "Status Updated",
        description: `Feedback item ${feedbackId} marked as ${newStatus}.`,
      });
      fetchFeedback(); // Refresh the list
    } catch (error) {
      console.error(`Failed to mark feedback ${feedbackId} as ${newStatus}:`, error);
      toast({
        title: "Update Failed",
        description: `Could not update status for feedback ${feedbackId}.`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingId(null);
    }
  };
  
  const getFeedbackTypeBadgeVariant = (type: FeedbackItem['type']) => {
    switch(type) {
        case "Complaint":
        case "Issue":
            return "destructive";
        case "Compliment":
            return "default"; // or another color like green
        case "Suggestion":
        default:
            return "secondary";
    }
  }

  const getStatusBadgeVariant = (status: FeedbackStatus) => {
     switch(status) {
        case "Open":
            return "outline";
        case "Resolved":
            return "default";
        case "Archived":
            return "secondary";
        default:
            return "outline";
     }
  }
  const getStatusBadgeClasses = (status: FeedbackStatus) => {
     switch(status) {
        case "Open":
            return "border-yellow-500 text-yellow-600";
        case "Resolved":
            return "bg-green-100 text-green-700";
        case "Archived":
            return "bg-gray-100 text-gray-700";
        default:
            return "";
     }
  }


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
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading feedback...</p>
            </div>
          ) : (
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
                {feedbackList.map((item) => (
                  <TableRow key={item.id} className={item.status === "Open" ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}>
                    <TableCell className="text-xs">{format(parseISO(item.dateSubmitted), 'yyyy-MM-dd')}</TableCell>
                    <TableCell className="font-medium">
                      {item.studentName || 'N/A'} {item.studentId ? `(${item.studentId})` : ''}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getFeedbackTypeBadgeVariant(item.type)} 
                        className="capitalize bg-opacity-80"
                      >
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.message}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusBadgeVariant(item.status)} 
                        className={`capitalize px-2 py-1 text-xs ${getStatusBadgeClasses(item.status)}`}
                       >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-1">
                      {item.status === "Open" && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleUpdateStatus(item.id, "Resolved")} 
                          title="Mark as Resolved"
                          disabled={isUpdatingId === item.id}
                        >
                          {isUpdatingId === item.id ? <Loader2 className="h-4 w-4 animate-spin text-green-600" /> : <CheckCircle className="h-4 w-4 text-green-600" />}
                        </Button>
                      )}
                      {item.status !== "Archived" && (
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleUpdateStatus(item.id, "Archived")} 
                            title="Archive"
                            disabled={isUpdatingId === item.id}
                          >
                          {isUpdatingId === item.id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Archive className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {feedbackList.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                       <MailWarning className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      No feedback received yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
