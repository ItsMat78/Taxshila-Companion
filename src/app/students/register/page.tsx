
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
import { addStudent, getAvailableSeats, type AddStudentData } from '@/services/student-service';
import type { Shift } from '@/types/student';

const studentFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  shift: z.enum(["morning", "evening", "fullday"], { required_error: "Shift selection is required." }),
  seatNumber: z.string().min(1, "Seat selection is required."),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

const shiftOptions = [
  { value: "morning" as Shift, label: "Morning Shift (7 AM - 2 PM)" },
  { value: "evening" as Shift, label: "Evening Shift (3 PM - 10 PM)" },
  { value: "fullday" as Shift, label: "Full Day (7 AM - 10 PM)" },
];

export default function StudentRegisterPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availableSeatOptions, setAvailableSeatOptions] = React.useState<string[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = React.useState(true);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      shift: undefined,
      seatNumber: "",
    },
  });

  const fetchSeats = React.useCallback(async () => {
    setIsLoadingSeats(true);
    try {
      const seats = await getAvailableSeats();
      setAvailableSeatOptions(seats);
    } catch (error) {
      console.error("Failed to fetch available seats:", error);
      toast({ title: "Error", description: "Could not load available seats.", variant: "destructive" });
      setAvailableSeatOptions([]);
    } finally {
      setIsLoadingSeats(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  async function onSubmit(data: StudentFormValues) {
    setIsSubmitting(true);
    try {
      const studentPayload: AddStudentData = { 
        ...data, 
        email: data.email || undefined,
      };
      const newStudent = await addStudent(studentPayload);
      toast({
        title: "Student Registered Successfully",
        description: `${newStudent.name} (ID: ${newStudent.studentId}) has been registered with seat ${newStudent.seatNumber}.`,
      });
      form.reset();
      await fetchSeats(); // Refresh available seats after successful registration
    } catch (error: any) {
       toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      if (error.message?.toLowerCase().includes("seat")) {
        await fetchSeats(); // Refresh seats if it was a seat conflict
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageTitle title="Register New Student" description="Add a new student to the system." />
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Student Registration Form</CardTitle>
          <CardDescription>Fill in the details below. Student ID will be auto-generated.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter student's full name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="Enter 10-digit phone number" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="shift" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Shift Selection</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2" disabled={isSubmitting}>
                      {shiftOptions.map(option => (
                        <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value={option.value} disabled={isSubmitting} /></FormControl>
                          <FormLabel className="font-normal">{option.label}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                <FormMessage /></FormItem>
              )} />
              <FormField
                control={form.control}
                name="seatNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seat Number</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || isLoadingSeats}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingSeats ? "Loading seats..." : "Select an available seat"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!isLoadingSeats && availableSeatOptions.length === 0 && (
                            <p className="p-2 text-xs text-muted-foreground">No seats currently available.</p>
                        )}
                        {availableSeatOptions.map(seat => (
                          <SelectItem key={seat} value={seat}>
                            Seat {seat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isLoadingSeats}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Registering..." : "Register Student"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
