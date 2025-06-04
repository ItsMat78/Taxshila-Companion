
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
import { History, AlertTriangle, Info, Megaphone } from 'lucide-react';

// Placeholder data for alerts - ensure types match what admin can send
const placeholderSentAlerts = [
  { id: "A001", title: "Library Closure Notification", message: "The library will be closed on July 4th for Independence Day.", date: "2024-06-28", type: "closure" },
  { id: "A002", title: "New Quiet Study Zone", message: "We've opened a new dedicated quiet study zone on the 2nd floor.", date: "2024-06-25", type: "info" },
  { id: "A003", title: "Maintenance Scheduled", message: "Network maintenance is scheduled for this Sunday from 2 AM to 4 AM.", date: "2024-06-20", type: "warning" },
];

const getAlertIconAndColor = (type: string) => {
  switch (type) {
    case 'closure':
      return { icon: <Info className="h-4 w-4 text-blue-500" />, color: "text-blue-700 bg-blue-100" };
    case 'warning':
      return { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, color: "text-yellow-700 bg-yellow-100" };
    case 'info':
    default:
      return { icon: <Megaphone className="h-4 w-4 text-primary" />, color: "text-primary bg-primary/10" };
  }
};

export default function AdminAlertsHistoryPage() {
  return (
    <>
      <PageTitle title="Sent Alerts History" description="A log of all announcements and alerts sent to members." />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5" />
            Broadcast Log
          </CardTitle>
          <CardDescription>Review all past communications sent to members.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Sent</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[40%]">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placeholderSentAlerts.map((alert) => {
                const { icon, color } = getAlertIconAndColor(alert.type);
                return (
                  <TableRow key={alert.id}>
                    <TableCell className="text-xs">{alert.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${color} border-opacity-50`}>
                        {React.cloneElement(icon, {className: "mr-1 h-3 w-3"})}
                        {alert.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{alert.title}</TableCell>
                    <TableCell className="text-sm">{alert.message}</TableCell>
                  </TableRow>
                );
              })}
              {placeholderSentAlerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    No alerts have been sent yet.
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
