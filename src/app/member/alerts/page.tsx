
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Megaphone, Loader2, MailWarning, Circle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getAlertsForStudent, markAlertAsRead } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface AlertDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  alertItem: AlertItem | null;
}

function AlertDetailsDialog({ isOpen, onClose, alertItem }: AlertDetailsDialogProps) {
  if (!alertItem) return null;

  const getDialogAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'closure':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'feedback_response':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'info':
      default:
        return <Megaphone className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <ShadcnDialogTitle className="flex items-start">
            <span className="mr-2 pt-0.5">{getDialogAlertIcon(alertItem.type)}</span>
            <span>{alertItem.title}</span>
          </ShadcnDialogTitle>
          <DialogDescription className="text-xs pt-1">
            Sent on: {format(parseISO(alertItem.dateSent), 'MMM d, yyyy, p')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          {alertItem.originalFeedbackMessageSnippet && (
            <div className="text-sm p-3 bg-muted/50 rounded-md border">
              <p className="text-xs font-semibold text-muted-foreground">Regarding your feedback on:</p>
              <p className="italic line-clamp-2">"{alertItem.originalFeedbackMessageSnippet}"</p>
            </div>
          )}
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {alertItem.message}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export default function MemberAlertsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alertsList, setAlertsList] = React.useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [studentId, setStudentId] = React.useState<string | null>(null);

  const [isAlertDetailsOpen, setIsAlertDetailsOpen] = React.useState(false);
  const [currentAlertInModal, setCurrentAlertInModal] = React.useState<AlertItem | null>(null);


  const fetchAlerts = React.useCallback(async (currentStudentId: string | null) => {
    if (!currentStudentId) {
        setIsLoading(false); // If no studentId, stop loading early
        setAlertsList([]);
        return;
    }
    // Don't set isLoading to true here if it's a refresh, only for initial load
    try {
      const fetchedAlerts = await getAlertsForStudent(currentStudentId);
      setAlertsList(fetchedAlerts);
    } catch (error) {
      toast({ title: "Error", description: "Could not load alerts.", variant: "destructive" });
    } finally {
      if (isLoading) setIsLoading(false); // Only turn off initial loading
    }
  }, [toast, isLoading]); // isLoading is included to ensure initial load sets it false


  React.useEffect(() => {
    if (user?.email) {
      setIsLoading(true); // Set loading true for initial student fetch
      const fetchStudentDetails = async () => {
        try {
          const student = await getStudentByEmail(user.email);
          if (student) {
            setStudentId(student.studentId);
            // fetchAlerts will be called by the studentId useEffect
          } else {
            toast({ title: "Error", description: "Could not find your student record.", variant: "destructive" });
            setIsLoading(false);
            setAlertsList([]);
          }
        } catch (error) {
          toast({ title: "Error", description: "Failed to fetch your details.", variant: "destructive" });
          setIsLoading(false);
          setAlertsList([]);
        }
      };
      fetchStudentDetails();
    } else if (!user) {
      setIsLoading(false);
      setAlertsList([]);
    }
  }, [user, toast]);

  React.useEffect(() => {
    if (studentId) {
        // If isLoading is already true, it means it's the initial load triggered by studentId setting
        // If isLoading is false, it means studentId changed for other reasons, so we re-trigger loading for alerts.
        if(!isLoading) setIsLoading(true);
        fetchAlerts(studentId);
    } else if (!isLoading && !user) { 
        setAlertsList([]);
        setIsLoading(false);
    }
  }, [studentId, user, isLoading, fetchAlerts]);

  const handleOpenAlertDetails = async (alertItem: AlertItem) => {
    setCurrentAlertInModal(alertItem);
    setIsAlertDetailsOpen(true);
    if (!alertItem.isRead && studentId) {
      try {
        await markAlertAsRead(alertItem.id);
        // Re-fetch alerts silently in the background to update the read status in the list
        // This will reflect once the dialog is closed or if other actions trigger a re-render
        const currentStudentId = studentId; // Capture studentId in closure
        fetchAlerts(currentStudentId); 
      } catch (error) {
        toast({ title: "Error", description: "Could not mark alert as read.", variant: "destructive" });
      }
    }
  };

  const getAlertIconAndStyle = (alert: AlertItem) => {
    const baseClasses = "mr-2 h-5 w-5";
    let icon;
    let cardClasses = "shadow-md hover:shadow-lg transition-shadow cursor-pointer";
    let titleClasses = "text-lg";

    if (!alert.isRead) {
      cardClasses += " border-primary/50 ring-1 ring-primary/30";
      titleClasses += " font-semibold";
    } else {
      cardClasses += " bg-muted/30";
    }

    switch (alert.type) {
      case 'closure':
        icon = <Info className={cn(baseClasses, alert.isRead ? "text-blue-400" : "text-blue-500")} />;
        break;
      case 'warning':
        icon = <AlertTriangle className={cn(baseClasses, alert.isRead ? "text-yellow-400" : "text-yellow-500")} />;
        break;
      case 'feedback_response':
        icon = <CheckCircle2 className={cn(baseClasses, alert.isRead ? "text-green-400" : "text-green-600")} />;
        break;
      case 'info':
      default:
        icon = <Megaphone className={cn(baseClasses, alert.isRead ? "text-primary/70" : "text-primary")} />;
        break;
    }
    return { icon, cardClasses, titleClasses };
  };


  if (isLoading) {
    return (
      <>
        <PageTitle title="Notifications & Alerts" description="Loading your latest updates..." />
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading alerts...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Notifications & Alerts" description="Stay updated with important announcements from the library." />
      
      {alertsList.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center">
            <MailWarning className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No new alerts at the moment.</p>
            {!studentId && user && <p className="text-xs text-destructive mt-1">Could not link your account to a student record.</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alertsList.map((alert) => {
            const { icon, cardClasses, titleClasses } = getAlertIconAndStyle(alert);
            return (
              <Card 
                key={alert.id} 
                className={cardClasses}
                onClick={() => handleOpenAlertDetails(alert)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 pt-1 relative">
                      {icon}
                      {!alert.isRead && (
                        <span className="absolute -top-0.5 -right-0.5 block h-2 w-2 rounded-full bg-accent ring-1 ring-background" />
                      )}
                    </div>
                    <div>
                      <CardTitle className={titleClasses}>{alert.title}</CardTitle>
                      <CardDescription className="text-xs">
                        Received: {format(parseISO(alert.dateSent), 'MMM d, yyyy, p')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className={cn("text-sm text-foreground line-clamp-2", alert.isRead && "text-muted-foreground")}>
                    {alert.message}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <AlertDetailsDialog
        isOpen={isAlertDetailsOpen}
        onClose={() => {
          setIsAlertDetailsOpen(false);
          setCurrentAlertInModal(null);
        }}
        alertItem={currentAlertInModal}
      />
    </>
  );
}

