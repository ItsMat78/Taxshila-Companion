"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { PageTitle } from '@/components/shared/page-title';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker"; 
import { useToast } from "@/hooks/use-toast";
import { seatReleaseRecommendation, type SeatReleaseRecommendationInput, type SeatReleaseRecommendationOutput } from '@/ai/flows/seat-release-recommendation';
import { Loader2 } from "lucide-react";

const seatReleaseFormSchema = z.object({
  studentId: z.string().min(1, "Student ID is required."),
  seatId: z.string().min(1, "Seat ID is required."),
  bookingTimestamp: z.date({ required_error: "Booking timestamp is required." }),
  lastActivityTimestamp: z.date({ required_error: "Last activity timestamp is required." }),
  holdSeatPolicy: z.string().min(10, "Hold seat policy must be at least 10 characters."),
  exceptions: z.string().optional(),
});

type SeatReleaseFormValues = z.infer<typeof seatReleaseFormSchema>;

export default function SeatReleasePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [recommendation, setRecommendation] = React.useState<SeatReleaseRecommendationOutput | null>(null);

  const form = useForm<SeatReleaseFormValues>({
    resolver: zodResolver(seatReleaseFormSchema),
    defaultValues: {
      studentId: "TS001",
      seatId: "A12",
      holdSeatPolicy: "Release seat if inactive for 2 hours after booking confirmation. For full-day bookings, check inactivity every 4 hours.",
      exceptions: "Student TS001 has a medical condition, allow up to 3 hours of inactivity.",
    },
  });

  async function onSubmit(data: SeatReleaseFormValues) {
    setIsLoading(true);
    setRecommendation(null);

    const input: SeatReleaseRecommendationInput = {
      ...data,
      bookingTimestamp: data.bookingTimestamp.toISOString(),
      lastActivityTimestamp: data.lastActivityTimestamp.toISOString(),
    };

    try {
      const result = await seatReleaseRecommendation(input);
      setRecommendation(result);
      toast({
        title: "Recommendation Received",
        description: "AI has provided a seat release recommendation.",
      });
    } catch (error) {
      console.error("Error getting seat release recommendation:", error);
      toast({
        title: "Error",
        description: "Failed to get recommendation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <PageTitle title="Intelligent Seat Release" description="AI-powered tool to recommend seat release based on inactivity and policies." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Seat Information</CardTitle>
            <CardDescription>Enter details to get a release recommendation.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="studentId" render={({ field }) => (
                  <FormItem><FormLabel>Student ID</FormLabel><FormControl><Input placeholder="e.g., TS001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="seatId" render={({ field }) => (
                  <FormItem><FormLabel>Seat ID</FormLabel><FormControl><Input placeholder="e.g., A12" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bookingTimestamp" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Booking Timestamp</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} placeholder="Select booking date" />
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="lastActivityTimestamp" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Last Activity Timestamp</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} placeholder="Select last activity date" />
                  <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="holdSeatPolicy" render={({ field }) => (
                  <FormItem><FormLabel>Hold Seat Policy</FormLabel><FormControl><Textarea placeholder="Describe the seat holding policy..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="exceptions" render={({ field }) => (
                  <FormItem><FormLabel>Exceptions (Optional)</FormLabel><FormControl><Textarea placeholder="Any exceptions to the policy..." {...field} rows={2} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Get Recommendation
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {recommendation && (
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendation</CardTitle>
              <CardDescription>Based on the provided information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Recommendation</h3>
                <p className="text-lg font-semibold">{recommendation.recommendation}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Reasoning</h3>
                <p className="text-base">{recommendation.reason}</p>
              </div>
            </CardContent>
          </Card>
        )}
         {isLoading && !recommendation && (
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Generating recommendation...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
