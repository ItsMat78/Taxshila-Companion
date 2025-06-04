
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
import { AlertCircle, Info, Megaphone } from 'lucide-react';

// Placeholder data for alerts
const placeholderAlerts = [
  { id: "1", title: "Library Closure Notification", message: "The library will be closed on July 4th for Independence Day. We will reopen on July 5th.", date: "2024-06-28", type: "closure" },
  { id: "2", title: "New Quiet Study Zone", message: "We've opened a new dedicated quiet study zone on the 2nd floor. Please maintain silence.", date: "2024-06-25", type: "info" },
  { id: "3", title: "Maintenance Scheduled", message: "Network maintenance is scheduled for this Sunday from 2 AM to 4 AM. Internet services might be intermittent.", date: "2024-06-20", type: "warning" },
];

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'closure':
      return <Info className="h-5 w-5 text-blue-500" />;
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Megaphone className="h-5 w-5 text-primary" />;
  }
};

export default function MemberAlertsPage() {
  return (
    <>
      <PageTitle title="Notifications & Alerts" description="Stay updated with important announcements from the library." />
      
      {placeholderAlerts.length === 0 && (
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No new alerts at the moment.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {placeholderAlerts.map((alert) => (
          <Card key={alert.id} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 pt-1">
                  {getAlertIcon(alert.type)}
                </div>
                <div>
                  <CardTitle className="text-lg">{alert.title}</CardTitle>
                  <CardDescription className="text-xs">Posted on: {alert.date}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">{alert.message}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
