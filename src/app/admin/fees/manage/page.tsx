
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
import { Input } from '@/components/ui/input';
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
import { Loader2, Save, Settings, IndianRupee } from 'lucide-react';
import { getFeeStructure, updateFeeStructure } from '@/services/student-service';
import type { FeeStructure } from '@/types/student';
import { Skeleton } from '@/components/ui/skeleton';

const feeManagementFormSchema = z.object({
  morningFee: z.coerce.number().positive({ message: "Morning fee must be a positive number." }).min(100, {message: "Fee must be at least Rs. 100."}),
  eveningFee: z.coerce.number().positive({ message: "Evening fee must be a positive number." }).min(100, {message: "Fee must be at least Rs. 100."}),
  fullDayFee: z.coerce.number().positive({ message: "Full day fee must be a positive number." }).min(100, {message: "Fee must be at least Rs. 100."}),
});

type FeeManagementFormValues = z.infer<typeof feeManagementFormSchema>;

export default function ManageFeesPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [currentFees, setCurrentFees] = React.useState<FeeStructure | null>(null);

  const form = useForm<FeeManagementFormValues>({
    resolver: zodResolver(feeManagementFormSchema),
    defaultValues: {
      morningFee: 0,
      eveningFee: 0,
      fullDayFee: 0,
    },
  });

  const fetchCurrentFees = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fees = await getFeeStructure();
      setCurrentFees(fees);
      form.reset({
        morningFee: fees.morningFee,
        eveningFee: fees.eveningFee,
        fullDayFee: fees.fullDayFee,
      });
    } catch (error) {
      console.error("Failed to fetch fee structure:", error);
      toast({ title: "Error", description: "Could not load current fee settings.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [form, toast]);

  React.useEffect(() => {
    fetchCurrentFees();
  }, [fetchCurrentFees]);

  async function onSubmit(data: FeeManagementFormValues) {
    setIsSaving(true);
    try {
      await updateFeeStructure({
        morningFee: data.morningFee,
        eveningFee: data.eveningFee,
        fullDayFee: data.fullDayFee,
      });
      toast({
        title: "Fees Updated Successfully",
        description: "The fee structure has been saved.",
      });
      await fetchCurrentFees(); // Refresh current fees display
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Could not save fee settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageTitle title="Manage Fee Structure" description="Set the monthly fees for different student shifts." />
      <Card className="w-full md:max-w-xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Fee Settings
          </CardTitle>
          <CardDescription>
            Update the standard monthly fees. These will be applied to new registrations and for payment calculations.
          </CardDescription>
        </CardHeader>
        {isLoading ? (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="morningFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <IndianRupee className="mr-1 h-4 w-4 text-muted-foreground" />
                        Morning Shift Fee (Monthly)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 600" {...field} disabled={isSaving} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eveningFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <IndianRupee className="mr-1 h-4 w-4 text-muted-foreground" />
                        Evening Shift Fee (Monthly)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 600" {...field} disabled={isSaving} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fullDayFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        <IndianRupee className="mr-1 h-4 w-4 text-muted-foreground" />
                        Full Day Shift Fee (Monthly)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 1000" {...field} disabled={isSaving} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full sm:w-auto" disabled={isSaving || !form.formState.isDirty}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isSaving ? "Saving..." : "Save Fee Structure"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        )}
      </Card>
    </>
  );
}
