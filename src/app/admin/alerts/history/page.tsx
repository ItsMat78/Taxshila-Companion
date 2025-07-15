
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle as ShadcnDialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, AlertTriangle, Info, Megaphone, CheckCircle2, Users, User, Loader2, MailWarning, ListFilter } from 'lucide-react';
import { getAllAdminSentAlerts } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

// Dialog to show full alert details
interface AlertDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  alertItem: AlertItem | null;
}

function AlertDetailsDialog({ isOpen, onClose, alertItem }: AlertDetailsDialogProps) {
  if (!alertItem) return null;

  const getDialogAlertIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'closure': return <Info className="h-5 w-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'feedback_response': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'info':
      default: return <Megaphone className="h-5 w-5 text-primary" />;
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
            {alertItem.studentId && ` | To: ${alertItem.studentId}`}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
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


const getAlertDisplayInfo = (alert: AlertItem, size: "sm" | "xs" = "sm") => {
  const baseClass = size === "xs" ? "text-xs px-1.5 py-0.5" : "capitalize";
  const iconBaseClass = size === "xs" ? "h-3 w-3" : "h-4 w-4";
  switch (alert.type) {
    case 'closure':
      return {
        icon: <Info className={cn(iconBaseClass, "text-blue-500")} />,
        color: "text-blue-700 bg-blue-100",
        label: "Closure"
      };
    case 'warning':
      return {
        icon: <AlertTriangle className={cn(iconBaseClass, "text-yellow-500")} />,
        color: "text-yellow-700 bg-yellow-100",
        label: "Warning"
      };
    case 'feedback_response':
      return {
        icon: <CheckCircle2 className={cn(iconBaseClass, "text-green-600")} />,
        color: "text-green-700 bg-green-100",
        label: "Feedback Response"
      };
    case 'info':
    default:
      return {
        icon: <Megaphone className={cn(iconBaseClass, "text-primary")} />,
        color: "text-primary bg-primary/10",
        label: "Info / General"
      };
  }
};

const AlertCardItem = ({ alert, onCardClick }: { alert: AlertItem, onCardClick: (alert: AlertItem) => void }) => {
  const { icon, color, label } = getAlertDisplayInfo(alert, "xs");
  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onCardClick(alert)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <Badge variant="outline" className={cn("border-opacity-50", color, "text-xs px-1.5 py-0.5")}>
            {React.cloneElement(icon, {className: "mr-1 h-3 w-3"})}
            {label}
          </Badge>
          {alert.studentId ? (
            <Badge variant="secondary" className="bg-audience-targeted text-audience-targeted-foreground text-xs px-1.5 py-0.5">
              <User className="mr-1 h-3 w-3" />
              Targeted
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-audience-general text-audience-general-foreground text-xs px-1.5 py-0.5">
              <Users className="mr-1 h-3 w-3" />
              General
            </Badge>
          )}
        </div>
         <CardTitle className="text-md pt-1 break-words">{alert.title}</CardTitle>
        <CardDescription className="text-xs">
          {format(parseISO(alert.dateSent), 'MMM d, yyyy, p')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap">{alert.message}</p>
         {alert.studentId && <p className="text-xs text-muted-foreground mt-1">To: {alert.studentId}</p>}
      </CardContent>
    </Card>
  );
};

type AlertFilterType = 'all' | 'payment' | 'admin_broadcast' | 'feedback' | 'shift_warning';

export default function AdminAlertsHistoryPage() {
  const { toast } = useToast();
  const [sentAlerts, setSentAlerts] = React.useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [filterType, setFilterType] = React.useState<AlertFilterType>('all');
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [selectedAlert, setSelectedAlert] = React.useState<AlertItem | null>(null);

  React.useEffect(() => {
    const fetchAlerts = async () => {
      setIsLoading(true);
      try {
        const items = await getAllAdminSentAlerts();
        setSentAlerts(items);
      } catch (error) {
        console.error("Failed to fetch alerts history:", error);
        toast({ title: "Error", description: "Could not load alerts history.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAlerts();
  }, [toast]);

  const filteredAlerts = React.useMemo(() => {
    switch (filterType) {
      case 'payment':
        return sentAlerts.filter(alert => alert.title === 'Payment Confirmation');
      case 'admin_broadcast':
        return sentAlerts.filter(alert => !alert.studentId);
      case 'feedback':
        return sentAlerts.filter(alert => alert.type === 'feedback_response');
      case 'shift_warning':
        return sentAlerts.filter(alert => alert.title === 'Outside Shift Warning');
      case 'all':
      default:
        return sentAlerts;
    }
  }, [sentAlerts, filterType]);
  
  const getFilterLabel = (type: AlertFilterType): string => {
    switch (type) {
      case 'all': return 'All Alerts';
      case 'payment': return 'Payment Confirmations';
      case 'admin_broadcast': return 'Admin Broadcasts';
      case 'feedback': return 'Feedback Responses';
      case 'shift_warning': return 'Shift Warnings';
      default: return 'Filter';
    }
  };

  const handleOpenDetails = (alert: AlertItem) => {
    setSelectedAlert(alert);
    setIsDetailsDialogOpen(true);
  };

  return (
    <>
      <PageTitle title="Sent Alerts History" description="A log of all announcements and alerts sent to members.">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <ListFilter className="mr-2 h-4 w-4" />
              Filter: {getFilterLabel(filterType)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={filterType} onValueChange={(value) => setFilterType(value as AlertFilterType)}>
              <DropdownMenuRadioItem value="all">All Alerts</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="payment">Payment Confirmations</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="admin_broadcast">Admin Broadcasts</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="feedback">Feedback Responses</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="shift_warning">Shift Warnings</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageTitle>

      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Broadcast Log ({filteredAlerts.length})
          </CardTitle>
          <CardDescription>Review all past communications sent to members. Click an item to view its full content.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading alerts history...</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                     <MailWarning className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                    No alerts found for the selected filter.
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <AlertCardItem key={alert.id} alert={alert} onCardClick={handleOpenDetails} />
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date Sent</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Message Snippet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => {
                      const { icon, color, label } = getAlertDisplayInfo(alert);
                      return (
                        <TableRow key={alert.id} onClick={() => handleOpenDetails(alert)} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="text-xs whitespace-nowrap">{format(parseISO(alert.dateSent), 'MMM d, yyyy, p')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("capitalize border-opacity-50", color)}>
                              {React.cloneElement(icon, {className: "mr-1 h-3 w-3"})}
                              {label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {alert.studentId ? (
                              <Badge variant="secondary" className="bg-audience-targeted text-audience-targeted-foreground">
                                <User className="mr-1 h-3 w-3" />
                                Targeted: {alert.studentId}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-audience-general text-audience-general-foreground">
                                <Users className="mr-1 h-3 w-3" />
                                General
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{alert.title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground line-clamp-2">{alert.message}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredAlerts.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                          <MailWarning className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                          No alerts found for the selected filter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <AlertDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => {
          setIsDetailsDialogOpen(false);
          setSelectedAlert(null);
        }}
        alertItem={selectedAlert}
      />
    </>
  );
}
