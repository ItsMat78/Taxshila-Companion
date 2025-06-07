
"use client";

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
  phone: z.string()
    .length(10, { message: "Phone number must be exactly 10 digits." })
    .regex(/^\d+$/, { message: "Phone number must contain only digits." }),
  address: z.string(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  shift: z.enum(["morning", "evening", "fullday"], { required_error: "Shift selection is required." }),
  seatNumber: z.string().min(1, "Seat selection is required."),
  idCardFileName: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
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
  const [isLoadingSeats, setIsLoadingSeats] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      confirmPassword: "",
      shift: undefined,
      seatNumber: "",
      idCardFileName: "",
    },
  });

  const selectedShift = form.watch("shift");

  React.useEffect(() => {
    const fetchSeatsForShift = async (shift: Shift) => {
      setIsLoadingSeats(true);
      setAvailableSeatOptions([]); 
      form.setValue("seatNumber", ""); 
      try {
        const seats = await getAvailableSeats(shift);
        setAvailableSeatOptions(seats);
      } catch (error) {
        console.error(`Failed to fetch available seats for ${shift} shift:`, error);
        toast({ title: "Error", description: `Could not load seats for ${shift} shift.`, variant: "destructive" });
        setAvailableSeatOptions([]);
      } finally {
        setIsLoadingSeats(false);
      }
    };

    if (selectedShift) {
      fetchSeatsForShift(selectedShift);
    } else {
      setAvailableSeatOptions([]); 
      setIsLoadingSeats(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShift, toast, form.setValue]);


  async function onSubmit(data: StudentFormValues) {
    setIsSubmitting(true);
    try {
      const studentPayload: AddStudentData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        address: data.address,
        password: data.password,
        shift: data.shift,
        seatNumber: data.seatNumber,
        idCardFileName: data.idCardFileName,
      };
      const newStudent = await addStudent(studentPayload);
      toast({
        title: "Student Registered Successfully",
        description: `${newStudent.name} (ID: ${newStudent.studentId}) has been registered with seat ${newStudent.seatNumber} for ${newStudent.shift} shift.`,
      });
      form.reset();
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
      setAvailableSeatOptions([]); 
    } catch (error: any) {
       toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      if (selectedShift && error.message?.toLowerCase().includes("seat")) {
        setIsLoadingSeats(true);
        try {
            const seats = await getAvailableSeats(selectedShift);
            setAvailableSeatOptions(seats);
        } catch (e) { console.error(e); }
        finally { setIsLoadingSeats(false); }
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
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="Enter address" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Enter password (min 6 characters)" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="Re-enter password" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="shift" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Shift Selection</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2" disabled={isSubmitting}>
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting || isLoadingSeats || !selectedShift}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedShift ? "Select shift first" : (isLoadingSeats ? "Loading seats..." : "Select an available seat")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!isLoadingSeats && !selectedShift && (
                            <p className="p-2 text-xs text-muted-foreground">Please select a shift to see available seats.</p>
                        )}
                        {!isLoadingSeats && selectedShift && availableSeatOptions.length === 0 && (
                            <p className="p-2 text-xs text-muted-foreground">No seats currently available for {selectedShift} shift.</p>
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
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isLoadingSeats || !selectedShift}>
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
