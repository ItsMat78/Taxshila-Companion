
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
import { AlertTriangle, Info, Megaphone, Loader2, MailWarning } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getAlertsForStudent } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

const getAlertIcon = (type: AlertItem['type']) => {
  switch (type) {
    case 'closure':
      return <Info className="h-5 w-5 text-blue-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'info':
    default:
      return <Megaphone className="h-5 w-5 text-primary" />;
  }
};

export default function MemberAlertsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alertsList, setAlertsList] = React.useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [studentId, setStudentId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user?.email) {
      const fetchStudentDetails = async () => {
        try {
          const student = await getStudentByEmail(user.email);
          if (student) {
            setStudentId(student.studentId);
          } else {
            toast({ title: "Error", description: "Could not find your student record.", variant: "destructive" });
            setIsLoading(false);
          }
        } catch (error) {
          toast({ title: "Error", description: "Failed to fetch your details.", variant: "destructive" });
          setIsLoading(false);
        }
      };
      fetchStudentDetails();
    } else if (!user) {
      // If user is explicitly null (not just loading), stop loading
      setIsLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    if (studentId) {
      const fetchAlerts = async () => {
        setIsLoading(true);
        try {
          const fetchedAlerts = await getAlertsForStudent(studentId);
          setAlertsList(fetchedAlerts);
        } catch (error) {
          toast({ title: "Error", description: "Could not load alerts.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchAlerts();
    } else if (!user && !isLoading) { 
        // If no user and not already loading, ensure loading is false.
        // This handles the case where user logs out or session is invalid.
        setAlertsList([]);
        setIsLoading(false);
    }
  }, [studentId, user, isLoading, toast]);

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
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alertsList.map((alert) => (
            <Card key={alert.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{alert.title}</CardTitle>
                    <CardDescription className="text-xs">
                      Posted on: {format(parseISO(alert.dateSent), 'MMM d, yyyy, p')} (Type: {alert.type})
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{alert.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
