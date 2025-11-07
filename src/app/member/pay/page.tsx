
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CreditCard, ShieldCheck, IndianRupee, Info } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getFeeStructure, getStudentByCustomId } from '@/services/student-service';
import type { Student, FeeStructure as FeeStructureType } from '@/types/student';
import { useToast } from '@/hooks/use-toast';


export default function MemberPayFeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentStudent, setCurrentStudent] = React.useState<Student | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = React.useState(true);
  const [feeStructure, setFeeStructure] = React.useState<FeeStructureType | null>(null);
  const [isLoadingFeeStructure, setIsLoadingFeeStructure] = React.useState(true);


  React.useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingStudent(true);
      setIsLoadingFeeStructure(true);
      try {
        let student = null;
        if (user?.studentId) {
          student = await getStudentByCustomId(user.studentId);
        } else if (user?.email) {
          student = await getStudentByEmail(user.email);
        }

        if (student) {
          setCurrentStudent(student);
        } else {
          toast({
            title: "Student Record Not Found",
            description: "Could not find an active student record associated with your email.",
            variant: "destructive",
          });
          setCurrentStudent(null);
        }

        const fees = await getFeeStructure();
        setFeeStructure(fees);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch your details or fee settings.",
          variant: "destructive",
        });
        setCurrentStudent(null);
        setFeeStructure(null);
      } finally {
        setIsLoadingStudent(false);
        setIsLoadingFeeStructure(false);
      }
    };
    fetchInitialData();
  }, [user, toast]);


  if (isLoadingStudent || isLoadingFeeStructure) {
    return (
      <>
        <PageTitle title="My Payments" description="Loading your payment details..." />
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Pay Your Fees" description="Information about your fee payment." />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheck className="mr-2 h-5 w-5" />
              Payment Information
            </CardTitle>
            <CardDescription>How to pay your fees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="default" className="border-primary/30 bg-primary/5">
              <IndianRupee className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Pay at Desk</AlertTitle>
              <AlertDescription>
                Please pay your fees at the library reception desk. You can pay via cash or other methods available at the desk.
                Your payment status will be updated by an admin shortly after.
              </AlertDescription>
            </Alert>
             <Alert variant="destructive">
              <CreditCard className="h-4 w-4" />
              <AlertTitle>Online Gateway (Coming Soon)</AlertTitle>
              <AlertDescription>
                Secure online payments via UPI, Credit/Debit Card, or Net Banking will be available in a future update.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              For any payment-related assistance or queries, please contact the library administration.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
