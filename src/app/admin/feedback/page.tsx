
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { MailWarning, MessageSquare, Archive, CheckCircle, Loader2, Send, Reply, User, Calendar, Type, ListFilter } from 'lucide-react';
import { getAllFeedback, updateFeedbackStatus as updateFeedbackStatusService, sendAlertToStudent } from '@/services/student-service';
import type { FeedbackItem, FeedbackStatus, FeedbackType } from '@/types/communication';
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
import { Label } from "@/components/ui/label";
import { useNotificationContext } from '@/contexts/notification-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/auth-context';


interface FeedbackResponseDialogProps {
  feedbackItem: FeedbackItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSendResponse: (feedbackId: string, responseMessage: string, originalMessage: string) => Promise<void>;
  isReviewer: boolean;
}

function FeedbackResponseDialog({ feedbackItem, isOpen, onClose, onSendResponse, isReviewer }: FeedbackResponseDialogProps) {
  const [responseMessage, setResponseMessage] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setResponseMessage("");
    }
  }, [isOpen]);

  if (!feedbackItem) return null;
  
  const handleSimulatedSubmit = () => {
    toast({
        title: "Simulated Success!",
        description: "As a reviewer, this action is simulated and no response was sent.",
    });
    onClose();
  };

  const handleSubmitResponse = async () => {
    if (isReviewer) {
      handleSimulatedSubmit();
      return;
    }

    if (!responseMessage.trim()) {
      return;
    }
    setIsSending(true);
    await onSendResponse(feedbackItem.id, responseMessage, feedbackItem.message);
    setIsSending(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Reply className="mr-2 h-5 w-5" />
            Respond to Feedback
            </DialogTitle>
          <DialogDescription>
            Your response will be sent as an alert to {feedbackItem.studentName || 'the student'} and this feedback will be marked as "Resolved".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="mb-2 p-3 bg-muted/50 rounded-md border">
            <p className="text-xs font-semibold text-muted-foreground">Original Feedback from {feedbackItem.studentName || 'Student'}:</p>
            <p className="text-sm italic line-clamp-3">"{feedbackItem.message}"</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="responseMessage" className="text-left">
              Your Response Message
            </Label>
            <Textarea
              id="responseMessage"
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder="Type your response here..."
              className="min-h-[100px]"
              disabled={isSending || isReviewer}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>Cancel</Button>
          <Button onClick={handleSubmitResponse} disabled={isSending || !responseMessage.trim() || isReviewer}>
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isReviewer ? "Send (For Reviewer)" : "Send Response & Resolve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const getFeedbackTypeBadge = (type: FeedbackType, size: "sm" | "xs" = "sm") => {
  const baseClass = size === "xs" ? "text-xs px-1.5 py-0.5" : "";
  switch (type) {
    case "Suggestion": return <Badge variant="secondary" className={`${baseClass} bg-blue-100 text-blue-700`}>{type}</Badge>;
    case "Complaint": return <Badge variant="secondary" className={`${baseClass} bg-red-100 text-red-700`}>{type}</Badge>;
    case "Issue": return <Badge variant="secondary" className={`${baseClass} bg-yellow-100 text-yellow-700`}>{type}</Badge>;
    case "Compliment": return <Badge variant="secondary" className={`${baseClass} bg-green-100 text-green-700`}>{type}</Badge>;
    default: return <Badge variant="outline" className={baseClass}>{type}</Badge>;
  }
};

const getFeedbackStatusBadge = (status: FeedbackStatus, size: "sm" | "xs" = "sm") => {
  const baseClass = size === "xs" ? "text-xs px-1.5 py-0.5" : "";
  switch (status) {
    case "Open": return <Badge className={`${baseClass} bg-orange-400 hover:bg-orange-500 text-white`}>{status}</Badge>;
    case "Resolved": return <Badge className={`${baseClass} bg-green-500 hover:bg-green-600 text-white`}>{status}</Badge>;
    case "Archived": return <Badge variant="secondary" className={baseClass}>{status}</Badge>;
    default: return <Badge variant="outline" className={baseClass}>{status}</Badge>;
  }
};

// Mobile Card Item
const FeedbackCardItem = ({ item, onOpenResponseDialog, onArchiveFeedback, updatingFeedbackId, selectedFeedbackForResponse, isReviewer }: {
  item: FeedbackItem;
  onOpenResponseDialog: (item: FeedbackItem) => void;
  onArchiveFeedback: (id: string) => void;
  updatingFeedbackId: string | null;
  selectedFeedbackForResponse: FeedbackItem | null;
  isReviewer: boolean;
}) => (
  <Card className="w-full shadow-md">
    <CardHeader className="pb-2">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-grow">
          {getFeedbackTypeBadge(item.type, "xs")}
        </div>
        {getFeedbackStatusBadge(item.status, "xs")}
      </div>
      <CardDescription className="text-xs pt-1">
        {format(parseISO(item.dateSubmitted), 'MMM d, yyyy, p')}
      </CardDescription>
    </CardHeader>
    <CardContent className="pb-3 space-y-1.5">
      <p className="text-sm font-medium">
        {item.studentName || 'Anonymous'}
        {item.studentId && <span className="text-xs text-muted-foreground ml-1">({item.studentId})</span>}
      </p>
      <p className="text-sm text-foreground line-clamp-3">{item.message}</p>
    </CardContent>
    <CardFooter className="flex justify-end space-x-2 py-3 border-t">
      {item.status === "Open" && item.studentId && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenResponseDialog(item)}
          disabled={updatingFeedbackId === item.id || isReviewer}
          className="px-2 sm:px-3"
        >
          {updatingFeedbackId === item.id && selectedFeedbackForResponse?.id === item.id ? (
            <Loader2 className="h-3 w-3 animate-spin sm:mr-1" />
          ) : (
            <Reply className="h-3 w-3 sm:mr-1" />
          )}
          <span className="hidden sm:inline">Resolve</span>
        </Button>
      )}
      {item.status !== "Archived" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onArchiveFeedback(item.id)}
          disabled={updatingFeedbackId === item.id && selectedFeedbackForResponse?.id !== item.id || isReviewer}
          className="text-muted-foreground hover:text-destructive px-2 sm:px-3"
        >
          {updatingFeedbackId === item.id && selectedFeedbackForResponse?.id !== item.id ? (
            <Loader2 className="h-3 w-3 animate-spin sm:mr-1" />
          ) : (
            <Archive className="h-3 w-3 sm:mr-1" />
          )}
          <span className="hidden sm:inline">Archive</span>
        </Button>
      )}
    </CardFooter>
  </Card>
);


export default function AdminFeedbackPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshNotifications, refreshKey } = useNotificationContext();
  const [allFeedbackList, setAllFeedbackList] = React.useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [updatingFeedbackId, setUpdatingFeedbackId] = React.useState<string | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<FeedbackStatus | "All">("Open");

  const [isResponseDialogOpen, setIsResponseDialogOpen] = React.useState(false);
  const [selectedFeedbackForResponse, setSelectedFeedbackForResponse] = React.useState<FeedbackItem | null>(null);
  
  const isReviewer = user?.email === 'guest-admin@taxshila-auth.com';

  const fetchFeedback = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getAllFeedback();
      setAllFeedbackList(items);
    } catch (error) {
      toast({ title: "Error", description: "Could not load feedback.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback, refreshKey]); // Added refreshKey to dependency array

  const filteredFeedbackList = React.useMemo(() => {
    if (filterStatus === "All") return allFeedbackList;
    return allFeedbackList.filter(item => item.status === filterStatus);
  }, [allFeedbackList, filterStatus]);

  const handleUpdateStatus = async (feedbackId: string, status: FeedbackStatus, responseMessage?: string, originalMessage?: string) => {
    if (isReviewer) {
      toast({
        title: "Simulated Success!",
        description: `As a reviewer, feedback status was simulated to be '${status}'.`,
      });
      return;
    }

    setUpdatingFeedbackId(feedbackId);
    try {
      await updateFeedbackStatusService(feedbackId, status);
      if (status === "Resolved" && responseMessage && selectedFeedbackForResponse?.studentId && originalMessage) {
        const snippet = originalMessage.substring(0, 50) + (originalMessage.length > 50 ? "..." : "");
        await sendAlertToStudent(
          selectedFeedbackForResponse.studentId,
          `Response to your feedback: "${snippet}"`,
          responseMessage,
          "feedback_response",
          selectedFeedbackForResponse.id,
          snippet
        );
        toast({ title: "Response Sent", description: `Alert sent to ${selectedFeedbackForResponse.studentName || 'student'} and feedback marked as Resolved.` });
      } else if (status !== "Resolved") {
        toast({ title: "Feedback Updated", description: `Status changed to ${status}.` });
      }
      await fetchFeedback(); // Re-fetch after update
      refreshNotifications(); // Refresh counts after update
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update feedback status.", variant: "destructive" });
    } finally {
      setUpdatingFeedbackId(null);
      setSelectedFeedbackForResponse(null); // Ensure this is cleared
    }
  };

  const handleOpenResponseDialog = (feedbackItem: FeedbackItem) => {
    setSelectedFeedbackForResponse(feedbackItem);
    setIsResponseDialogOpen(true);
  };

  const handleSendAndResolve = async (feedbackId: string, responseMsg: string, originalMsg: string) => {
    await handleUpdateStatus(feedbackId, "Resolved", responseMsg, originalMsg);
  };

  const handleArchiveFeedback = (feedbackId: string) => {
    handleUpdateStatus(feedbackId, "Archived");
  };

  if (isLoading && allFeedbackList.length === 0) {
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
      <PageTitle title="Member Feedback & Suggestions" description="Review and manage feedback submitted by students.">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ListFilter className="mr-2 h-4 w-4" />
              Filter: {filterStatus}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={filterStatus} onValueChange={(value) => setFilterStatus(value as FeedbackStatus | "All")}>
              <DropdownMenuRadioItem value="All">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="Open">Open</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="Resolved">Resolved</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="Archived">Archived</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageTitle>
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Feedback Inbox ({filteredFeedbackList.length})
          </CardTitle>
          <CardDescription>
            Showing {filterStatus.toLowerCase()} feedback. Use actions to resolve or archive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && filteredFeedbackList.length === 0 ? (
             <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredFeedbackList.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    <MailWarning className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    No {filterStatus !== "All" ? filterStatus.toLowerCase() : ""} feedback submissions found.
                  </div>
                ) : (
                  filteredFeedbackList.map((item) => (
                    <FeedbackCardItem
                      key={item.id}
                      item={item}
                      onOpenResponseDialog={handleOpenResponseDialog}
                      onArchiveFeedback={handleArchiveFeedback}
                      updatingFeedbackId={updatingFeedbackId}
                      selectedFeedbackForResponse={selectedFeedbackForResponse}
                      isReviewer={isReviewer}
                    />
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeedbackList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                          <MailWarning className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                          No {filterStatus !== "All" ? filterStatus.toLowerCase() : ""} feedback submissions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFeedbackList.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs whitespace-nowrap">{format(parseISO(item.dateSubmitted), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                              {item.studentName || 'Anonymous'}
                              {item.studentId && <span className="block text-xs text-muted-foreground">({item.studentId})</span>}
                          </TableCell>
                          <TableCell>{getFeedbackTypeBadge(item.type)}</TableCell>
                          <TableCell className="text-sm">{item.message}</TableCell>
                          <TableCell>{getFeedbackStatusBadge(item.status)}</TableCell>
                          <TableCell className="text-right space-x-1 whitespace-nowrap">
                            {item.status === "Open" && item.studentId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenResponseDialog(item)}
                                disabled={updatingFeedbackId === item.id || isReviewer}
                              >
                                {updatingFeedbackId === item.id && selectedFeedbackForResponse?.id === item.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Reply className="mr-1 h-3 w-3" />
                                )}
                                Resolve
                              </Button>
                            )}
                            {item.status !== "Archived" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchiveFeedback(item.id)}
                                disabled={updatingFeedbackId === item.id && selectedFeedbackForResponse?.id !== item.id || isReviewer}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                {updatingFeedbackId === item.id && selectedFeedbackForResponse?.id !== item.id ? (
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
              </div>
            </>
          )}
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
        isReviewer={isReviewer}
      />
    </>
  );
}
