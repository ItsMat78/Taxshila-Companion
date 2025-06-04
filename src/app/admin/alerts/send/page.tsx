
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Send, Megaphone, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { sendGeneralAlert } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';

const alertFormSchema = z.object({
  alertTitle: z.string().min(5, { message: "Title must be at least 5 characters." }).max(100, {message: "Title must not exceed 100 characters."}),
  alertMessage: z.string().min(10, { message: "Message must be at least 10 characters." }).max(500, {message: "Message must not exceed 500 characters."}),
  alertType: z.enum(["info", "warning", "closure"], { required_error: "Alert type is required."}),
});

type AlertFormValues = z.infer<typeof alertFormSchema>;

const alertTypeOptions = [
  { value: "info" as AlertItem['type'], label: "General Info / Update", icon: <Info className="mr-2 h-4 w-4" /> },
  { value: "warning" as AlertItem['type'], label: "Warning / Maintenance", icon: <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" /> },
  { value: "closure" as AlertItem['type'], label: "Closure / Important Notice", icon: <Info className="mr-2 h-4 w-4 text-blue-500" /> },
];

export default function AdminSendAlertPage() {
  const { toast } = useToast();
  const [isSending, setIsSending] = React.useState(false);
  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      alertTitle: "",
      alertMessage: "",
      alertType: "info",
    },
  });

  async function onSubmit(data: AlertFormValues) {
    setIsSending(true);
    try {
      await sendGeneralAlert(data.alertTitle, data.alertMessage, data.alertType as AlertItem['type']);
      toast({
        title: `General Alert Sent (Type: ${data.alertType.toUpperCase()})`,
        description: `"${data.alertTitle}" has been broadcasted to all members.`,
      });
      form.reset();
    } catch (error) {
      toast({
        title: "Failed to Send Alert",
        description: "An error occurred while trying to send the alert. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to send alert:", error);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <PageTitle title="Send Alert to Members" description="Broadcast important messages or announcements to all registered students." />
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Megaphone className="mr-2 h-5 w-5" />
             Compose Alert
          </CardTitle>
          <CardDescription>The message will be visible to all members in their 'Alerts' tab with the chosen type.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="alertTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Library Closure, Maintenance Update" {...field} disabled={isSending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="alertType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an alert type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {alertTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center">
                              {React.cloneElement(option.icon, {className: "mr-2 h-4 w-4"})}
                              {option.label}
                            </div>
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
                name="alertMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Type the full alert message here..."
                        className="min-h-[120px]"
                        {...field}
                        disabled={isSending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSending}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSending ? "Sending..." : "Send Alert"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
