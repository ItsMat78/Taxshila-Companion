
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
import { Send } from 'lucide-react';

const feedbackFormSchema = z.object({
  feedbackText: z.string().min(10, { message: "Feedback must be at least 10 characters." }).max(1000, { message: "Feedback must not exceed 1000 characters." }),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

export default function MemberFeedbackPage() {
  const { toast } = useToast();
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      feedbackText: "",
    },
  });

  function onSubmit(data: FeedbackFormValues) {
    // Placeholder for actual feedback submission logic
    console.log("Feedback submitted:", data.feedbackText);
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback! We will review it shortly.",
    });
    form.reset();
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
            <CardContent>
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto">
                <Send className="mr-2 h-4 w-4" />
                Submit Feedback
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
