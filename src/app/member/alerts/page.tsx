
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
import { Badge } from '@/components/ui/badge'; // Import Badge
import { AlertTriangle, Info, Megaphone, Loader2, MailWarning, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getAlertsForStudent, markAlertAsRead } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotificationContext } from '@/contexts/notification-context';

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
  const { refreshNotifications, refreshKey } = useNotificationContext(); // Get refreshKey
  const [alertsList, setAlertsList] = React.useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [studentId, setStudentId] = React.useState<string | null>(null);

  const [isAlertDetailsOpen, setIsAlertDetailsOpen] = React.useState(false);
  const [currentAlertInModal, setCurrentAlertInModal] = React.useState<AlertItem | null>(null);

  React.useEffect(() => {
    if (user?.email) {
      setIsLoading(true);
      setStudentId(null);
      setAlertsList([]);
      getStudentByEmail(user.email)
        .then(student => {
          if (student) {
            setStudentId(student.studentId);
          } else {
            toast({ title: "Error", description: "Could not find your student record.", variant: "destructive" });
            setIsLoading(false);
          }
        })
        .catch(error => {
          toast({ title: "Error", description: "Failed to fetch your details.", variant: "destructive" });
          setIsLoading(false);
        });
    } else if (!user) {
      setStudentId(null);
      setAlertsList([]);
      setIsLoading(false);
    }
  }, [user, toast]);


  const fetchAlerts = React.useCallback(async (currentStudentId: string) => {
    try {
      const fetchedAlerts = await getAlertsForStudent(currentStudentId);
      setAlertsList(fetchedAlerts);
    } catch (error) {
      toast({ title: "Error", description: "Could not load alerts.", variant: "destructive" });
      setAlertsList([]);
    }
  }, [toast]);

  React.useEffect(() => {
    if (studentId) {
      fetchAlerts(studentId).finally(() => {
          setIsLoading(false);
      });
    }
  }, [studentId, fetchAlerts, refreshKey]); // Add refreshKey to dependency array


  const handleOpenAlertDetails = async (alertItem: AlertItem) => {
    setCurrentAlertInModal(alertItem);
    setIsAlertDetailsOpen(true);
    if (!alertItem.isRead && studentId && alertItem.id) { // Ensure alertItem.id is present
      try {
        await markAlertAsRead(alertItem.id, studentId);
        await fetchAlerts(studentId);
        refreshNotifications();
      } catch (error) {
        toast({ title: "Error", description: "Could not mark alert as read.", variant: "destructive" });
      }
    }
  };

  const getAlertInfo = (alert: AlertItem): {
    mainIcon: JSX.Element;
    cardClasses: string;
    titleClasses: string;
    badgeColorClass: string;
    badgeLabel: string;
    badgeIconElement: JSX.Element;
  } => {
    let cardClasses = "shadow-md hover:shadow-lg transition-shadow cursor-pointer";
    let titleClasses = "text-lg";
    let mainIcon: JSX.Element;
    let badgeIconElement: JSX.Element;
    let badgeColorClass: string;
    let badgeLabel: string;

    const mainIconBaseClasses = "h-5 w-5";
    const badgeIconBaseClasses = "h-3 w-3";

    if (!alert.isRead) {
      cardClasses += " border-primary/50 ring-1 ring-primary/30";
      titleClasses += " font-semibold";
    } else {
      cardClasses += " bg-muted/30";
    }

    switch (alert.type) {
      case 'closure':
        mainIcon = <Info className={cn(mainIconBaseClasses, alert.isRead ? "text-blue-400" : "text-blue-500")} />;
        badgeIconElement = <Info className={cn(badgeIconBaseClasses, "text-blue-500")} />;
        badgeColorClass = "text-blue-700 bg-blue-100";
        badgeLabel = "Closure";
        break;
      case 'warning':
        mainIcon = <AlertTriangle className={cn(mainIconBaseClasses, alert.isRead ? "text-yellow-400" : "text-yellow-500")} />;
        badgeIconElement = <AlertTriangle className={cn(badgeIconBaseClasses, "text-yellow-500")} />;
        badgeColorClass = "text-yellow-700 bg-yellow-100";
        badgeLabel = "Warning";
        break;
      case 'feedback_response':
        mainIcon = <CheckCircle2 className={cn(mainIconBaseClasses, alert.isRead ? "text-green-400" : "text-green-600")} />;
        badgeIconElement = <CheckCircle2 className={cn(badgeIconBaseClasses, "text-green-600")} />;
        badgeColorClass = "text-green-700 bg-green-100";
        badgeLabel = "Feedback Response";
        break;
      case 'info':
      default:
        mainIcon = <Megaphone className={cn(mainIconBaseClasses, alert.isRead ? "text-primary/70" : "text-primary")} />;
        badgeIconElement = <Megaphone className={cn(badgeIconBaseClasses, "text-primary")} />;
        badgeColorClass = "text-primary bg-primary/10";
        badgeLabel = "Info / General";
        break;
    }
    return { mainIcon, cardClasses, titleClasses, badgeColorClass, badgeLabel, badgeIconElement };
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
            if (!alert || !alert.id) {
              // This check is defensive. If alert.id is truly undefined, this alert will be skipped.
              // The root cause is that `alert.id` isn't being correctly passed from the service.
              console.warn("Skipping alert with undefined ID:", alert);
              return null;
            }
            const { mainIcon, cardClasses, titleClasses, badgeColorClass, badgeLabel, badgeIconElement } = getAlertInfo(alert);
            return (
              <Card
                key={alert.id}
                className={cardClasses}
                onClick={() => handleOpenAlertDetails(alert)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 pt-1 relative">
                        {React.cloneElement(mainIcon, { className: cn(mainIcon.props.className, "mr-2")})}
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
                    <Badge variant="outline" className={cn("capitalize border-opacity-50 text-xs shrink-0", badgeColorClass)}>
                      {React.cloneElement(badgeIconElement, {className: cn(badgeIconElement.props.className, "mr-1")})}
                      {badgeLabel}
                    </Badge>
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
