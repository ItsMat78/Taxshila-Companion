
"use client";

import * as React from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, submitFeedback as submitFeedbackService } from '@/services/student-service';
import type { FeedbackType } from '@/types/communication';
import type { Student } from '@/types/student';
import { Send, Loader2 } from 'lucide-react';

const feedbackFormSchema = z.object({
  feedbackType: z.enum(["Suggestion", "Complaint", "Issue", "Compliment"], {
    required_error: "Please select a feedback type.",
  }),
  feedbackText: z.string().min(10, { message: "Feedback must be at least 10 characters." }).max(1000, { message: "Feedback must not exceed 1000 characters." }),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

const feedbackTypeOptions: { value: FeedbackType; label: string }[] = [
  { value: "Suggestion", label: "Suggestion" },
  { value: "Complaint", label: "Complaint" },
  { value: "Issue", label: "Report an Issue" },
  { value: "Compliment", label: "Compliment" },
];

export default function MemberFeedbackPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentData, setStudentData] = React.useState<Student | null>(null);
  const [isLoadingStudent, setIsLoadingStudent] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      feedbackType: "Suggestion",
      feedbackText: "",
    },
  });

  React.useEffect(() => {
    if (user?.email) {
      setIsLoadingStudent(true);
      getStudentByEmail(user.email)
        .then(data => {
          setStudentData(data || null);
        })
        .catch(err => {
          console.error("Failed to fetch student data for feedback:", err);
          toast({ title: "Error", description: "Could not load your details.", variant: "destructive" });
        })
        .finally(() => setIsLoadingStudent(false));
    } else {
      setIsLoadingStudent(false);
    }
  }, [user, toast]);

  async function onSubmit(data: FeedbackFormValues) {
    setIsSubmitting(true);
    try {
      await submitFeedbackService(
        studentData?.studentId,
        studentData?.name,
        data.feedbackText,
        data.feedbackType as FeedbackType
      );
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We will review it shortly.",
      });
      form.reset();
    } catch (error) {
      console.error("Feedback submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Could not submit your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageTitle title="Submit Feedback or Report an Issue" description="We value your input. Let us know how we can improve or if you've encountered any problems." />
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Feedback Form</CardTitle>
          <CardDescription>Please provide as much detail as possible.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="feedbackType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Feedback</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting || isLoadingStudent}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a feedback type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {feedbackTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="feedbackText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Feedback / Complaint</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Type your message here..."
                        className="min-h-[150px]"
                        {...field}
                        disabled={isSubmitting || isLoadingStudent}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isLoadingStudent}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Feedback
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
