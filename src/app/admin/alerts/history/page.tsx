
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
import { History, AlertTriangle, Info, Megaphone, CheckCircle2, Users, User, Loader2, MailWarning } from 'lucide-react';
import { getAllAdminSentAlerts } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const getAlertDisplayInfo = (alert: AlertItem) => {
  switch (alert.type) {
    case 'closure':
      return {
        icon: <Info className="h-4 w-4 text-blue-500" />,
        color: "text-blue-700 bg-blue-100",
        label: "Closure"
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        color: "text-yellow-700 bg-yellow-100",
        label: "Warning"
      };
    case 'feedback_response':
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        color: "text-green-700 bg-green-100",
        label: "Feedback Response"
      };
    case 'info':
    default:
      return {
        icon: <Megaphone className="h-4 w-4 text-primary" />,
        color: "text-primary bg-primary/10",
        label: "Info / General"
      };
  }
};

export default function AdminAlertsHistoryPage() {
  const { toast } = useToast();
  const [sentAlerts, setSentAlerts] = React.useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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

  return (
    <>
      <PageTitle title="Sent Alerts History" description="A log of all announcements and alerts sent to members." />
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Broadcast Log
          </CardTitle>
          <CardDescription>Review all past communications sent to members.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading alerts history...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Sent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentAlerts.map((alert) => {
                  const { icon, color, label } = getAlertDisplayInfo(alert);
                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(parseISO(alert.dateSent), 'MMM d, yyyy, p')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("capitalize border-opacity-50", color)}>
                          {React.cloneElement(icon, {className: "mr-1 h-3 w-3"})}
                          {label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {alert.studentId ? (
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                            <User className="mr-1 h-3 w-3" />
                            Targeted: {alert.studentId}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                            <Users className="mr-1 h-3 w-3" />
                            General
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell className="text-sm whitespace-pre-wrap">{alert.message}</TableCell>
                    </TableRow>
                  );
                })}
                {sentAlerts.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                       <MailWarning className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                      No alerts have been sent yet.
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
