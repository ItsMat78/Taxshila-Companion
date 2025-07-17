
"use client";

import * as React from 'react';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Loader2 } from 'lucide-react';
import { getAvailableSeats } from '@/services/student-service';
import type { Shift } from '@/types/student';
import { useRouter } from 'next/navigation';

const studentFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().length(10, { message: "Phone number must be exactly 10 digits." }).regex(/^[6-9]\d{9}$/, { message: "Must be a valid 10-digit Indian mobile number." }),
  address: z.string().min(1, { message: "Address is required." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  shift: z.enum(["morning", "evening", "fullday"], { required_error: "Shift selection is required." }),
  seatNumber: z.string().min(1, "Seat selection is required."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

const shiftOptions = [
  { value: "morning" as Shift, label: "Morning Shift (7 AM - 2 PM)" },
  { value: "evening" as Shift, label: "Evening Shift (2 PM - 9:30 PM)" },
  { value: "fullday" as Shift, label: "Full Day (7 AM - 9:30 PM)" },
];

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
    <FormLabel>{children} <span className="text-red-500">*</span></FormLabel>
);

export default function AdminStudentRegisterPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availableSeatOptions, setAvailableSeatOptions] = React.useState<string[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = React.useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: { name: "", email: "", phone: "", address: "", password: "", confirmPassword: "", shift: undefined, seatNumber: "" },
  });

  const selectedShift = form.watch("shift");

  React.useEffect(() => {
    const fetchSeatsForShift = async (shift: Shift) => {
      setIsLoadingSeats(true);
      form.setValue("seatNumber", ""); 
      try {
        const seats = await getAvailableSeats(shift);
        setAvailableSeatOptions(seats);
      } catch (error) {
        toast({ title: "Error", description: `Could not load seats for ${shift} shift.`, variant: "destructive" });
        setAvailableSeatOptions([]);
      } finally {
        setIsLoadingSeats(false);
      }
    };
    if (selectedShift) fetchSeatsForShift(selectedShift);
  }, [selectedShift, toast, form]);

  async function onSubmit(data: StudentFormValues) {
    setIsSubmitting(true);
    try {
      const { confirmPassword, ...payload } = data;
      const response = await fetch('/api/admin/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "An unknown error occurred.");

      toast({
        title: "Student Registered Successfully",
        description: `${data.name} (ID: ${result.studentId}) has been registered with seat ${data.seatNumber}.`,
      });
      router.push('/students/list');
    } catch (error: any) {
       toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageTitle title="Register New Student" description="Add a new student to the system." />
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Student Registration Form</CardTitle>
              <CardDescription>Fields marked with <span className="text-red-500">*</span> are required.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><RequiredLabel>Full Name</RequiredLabel><FormControl><Input placeholder="Full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><RequiredLabel>Phone Number</RequiredLabel><FormControl><Input type="tel" placeholder="10-digit number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><RequiredLabel>Address</RequiredLabel><FormControl><Input placeholder="Address" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="password" render={({ field }) => (<FormItem><RequiredLabel>Password</RequiredLabel><FormControl><Input type="password" placeholder="Min 6 characters" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><RequiredLabel>Confirm Password</RequiredLabel><FormControl><Input type="password" placeholder="Re-enter password" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="shift" render={({ field }) => (<FormItem><RequiredLabel>Shift</RequiredLabel><FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2">{shiftOptions.map(o => (<FormItem key={o.value} className="flex items-center space-x-3"><FormControl><RadioGroupItem value={o.value} /></FormControl><FormLabel className="font-normal">{o.label}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="seatNumber" render={({ field }) => (
                <FormItem>
                  <RequiredLabel>Seat</RequiredLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedShift || isLoadingSeats}>
                    <FormControl><SelectTrigger><SelectValue placeholder={!selectedShift ? "Select shift first" : (isLoadingSeats ? "Loading..." : "Select a seat")} /></SelectTrigger></FormControl>
                    <SelectContent>
                      {availableSeatOptions.map(seat => (<SelectItem key={seat} value={seat}>Seat {seat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting || isLoadingSeats}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Register Student
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
