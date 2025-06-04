
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
import { MailWarning, MessageSquare, Archive, CheckCircle, Loader2, Send } from 'lucide-react';
import { getAllFeedback, updateFeedbackStatus as updateFeedbackStatusService, sendAlertToStudent } from '@/services/student-service';
import type { FeedbackItem, FeedbackStatus } from '@/types/communication';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label"; // Added 'from' clause

interface FeedbackResponseDialogProps {
  feedbackItem: FeedbackItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSendResponse: (feedbackId: string, responseMessage: string) => Promise<void>;
}

function FeedbackResponseDialog({ feedbackItem, isOpen, onClose, onSendResponse }: FeedbackResponseDialogProps) {
  const [responseMessage, setResponseMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setResponseMessage(""); // Reset when dialog opens
    }
  }, [isOpen]);

  if (!feedbackItem) return null;

  const handleSubmitResponse = async () => {
    if (!responseMessage.trim()) {
      // Optionally show a toast or error message for empty response
      return;
    }
    setIsSending(true);
    await onSendResponse(feedbackItem.id, responseMessage);
    setIsSending(false);
    onClose(); // Close dialog after sending
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Respond to Feedback: "{feedbackItem.message.substring(0, 30)}..."</DialogTitle>
          <DialogDescription>
            Compose a message to send to {feedbackItem.studentName || 'the student'} regarding their feedback.
            This will also mark the feedback as "Resolved".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="responseMessage" className="text-right col-span-1">
              Message
            </Label>
            <Textarea
              id="responseMessage"
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder="Type your response here..."
              className="col-span-3 min-h-[100px]"
              disabled={isSending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSubmitResponse} disabled={isSending || !responseMessage.trim()}>
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Response & Resolve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function AdminFeedbackPage() {
  const { toast } = useToast();
  const [feedbackList, setFeedbackList] = React.useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [updatingFeedbackId, setUpdatingFeedbackId] = React.useState<string | null>(null);

  const [isResponseDialogOpen, setIsResponseDialogOpen] = React.useState(false);
  const [selectedFeedbackForResponse, setSelectedFeedbackForResponse] = React.useState<FeedbackItem | null>(null);

  const fetchFeedback = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getAllFeedback();
      setFeedbackList(items);
    } catch (error) {
      toast({ title: "Error", description: "Could not load feedback.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleUpdateStatus = async (feedbackId: string, status: FeedbackStatus, responseMessage?: string) => {
    setUpdatingFeedbackId(feedbackId);
    try {
      await updateFeedbackStatusService(feedbackId, status);
      if (status === "Resolved" && responseMessage && selectedFeedbackForResponse?.studentId) {
        await sendAlertToStudent(
          selectedFeedbackForResponse.studentId,
          `Regarding your feedback: "${selectedFeedbackForResponse.message.substring(0,20)}..."`,
          responseMessage,
          "info" // Using 'info' type for feedback responses
        );
        toast({ title: "Response Sent", description: `Alert sent to ${selectedFeedbackForResponse.studentName || 'student'} and feedback marked as Resolved.` });
      } else {
        toast({ title: "Feedback Updated", description: `Status changed to ${status}.` });
      }
      await fetchFeedback(); // Refresh list
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update feedback status.", variant: "destructive" });
    } finally {
      setUpdatingFeedbackId(null);
      setSelectedFeedbackForResponse(null);
    }
  };

  const handleOpenResponseDialog = (feedbackItem: FeedbackItem) => {
    setSelectedFeedbackForResponse(feedbackItem);
    setIsResponseDialogOpen(true);
  };

  const handleSendAndResolve = async (feedbackId: string, responseMessage: string) => {
    await handleUpdateStatus(feedbackId, "Resolved", responseMessage);
  };

  const handleArchiveFeedback = (feedbackId: string) => {
    handleUpdateStatus(feedbackId, "Archived");
  };

  const getFeedbackTypeBadge = (type: FeedbackType) => {
    switch (type) {
      case "Suggestion": return <Badge variant="secondary" className="bg-blue-100 text-blue-700">{type}</Badge>;
      case "Complaint": return <Badge variant="secondary" className="bg-red-100 text-red-700">{type}</Badge>;
      case "Issue": return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">{type}</Badge>;
      case "Compliment": return <Badge variant="secondary" className="bg-green-100 text-green-700">{type}</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getFeedbackStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case "Open": return <Badge className="bg-orange-400 hover:bg-orange-500 text-white">{status}</Badge>;
      case "Resolved": return <Badge className="bg-green-500 hover:bg-green-600 text-white">{status}</Badge>;
      case "Archived": return <Badge variant="secondary">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <>
        <PageTitle title="Member Feedback & Suggestions" description="Review and manage feedback submitted by students." />
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading feedback...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Member Feedback & Suggestions" description="Review and manage feedback submitted by students." />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Feedback Inbox
          </CardTitle>
          <CardDescription>
            Showing all feedback. Use actions to resolve or archive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[150px]">Student</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbackList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                    <MailWarning className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    No feedback submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                feedbackList.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{format(parseISO(item.dateSubmitted), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                        {item.studentName || 'Anonymous'}
                        {item.studentId && <span className="block text-xs text-muted-foreground">({item.studentId})</span>}
                    </TableCell>
                    <TableCell>{getFeedbackTypeBadge(item.type)}</TableCell>
                    <TableCell className="text-sm">{item.message}</TableCell>
                    <TableCell>{getFeedbackStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {item.status === "Open" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResponseDialog(item)}
                          disabled={updatingFeedbackId === item.id}
                        >
                          {updatingFeedbackId === item.id && item.status === "Open" ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          )}
                          Resolve
                        </Button>
                      )}
                      {item.status !== "Archived" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchiveFeedback(item.id)}
                          disabled={updatingFeedbackId === item.id}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          {updatingFeedbackId === item.id && item.status !== "Archived" ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Archive className="mr-1 h-3 w-3" />
                          )}
                          Archive
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <FeedbackResponseDialog
        feedbackItem={selectedFeedbackForResponse}
        isOpen={isResponseDialogOpen}
        onClose={() => {
            setIsResponseDialogOpen(false);
            setSelectedFeedbackForResponse(null);
        }}
        onSendResponse={handleSendAndResolve}
      />
    </>
  );
}
