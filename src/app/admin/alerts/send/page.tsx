
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
import { Send, Megaphone, Info, AlertTriangle } from 'lucide-react';

const alertFormSchema = z.object({
  alertTitle: z.string().min(5, { message: "Title must be at least 5 characters." }).max(100, {message: "Title must not exceed 100 characters."}),
  alertMessage: z.string().min(10, { message: "Message must be at least 10 characters." }).max(500, {message: "Message must not exceed 500 characters."}),
  alertType: z.enum(["info", "warning", "closure"], { required_error: "Alert type is required."}),
});

type AlertFormValues = z.infer<typeof alertFormSchema>;

const alertTypeOptions = [
  { value: "info", label: "General Info / Update", icon: <Info className="mr-2 h-4 w-4" /> },
  { value: "warning", label: "Warning / Maintenance", icon: <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" /> },
  { value: "closure", label: "Closure / Important Notice", icon: <Info className="mr-2 h-4 w-4 text-blue-500" /> },
];

export default function AdminSendAlertPage() {
  const { toast } = useToast();
  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      alertTitle: "",
      alertMessage: "",
      alertType: "info",
    },
  });

  function onSubmit(data: AlertFormValues) {
    // Placeholder for actual alert sending logic
    console.log("Alert to send:", data);
    toast({
      title: `Alert Sent (Type: ${data.alertType.toUpperCase()})`,
      description: `"${data.alertTitle}" has been broadcasted to all members.`,
    });
    form.reset();
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
                      <Input placeholder="e.g., Library Closure, Maintenance Update" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                Send Alert
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
