
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
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Loader2 } from 'lucide-react';
import { addStudent, getAvailableSeats, type AddStudentData } from '@/services/student-service';
import type { Shift } from '@/types/student';

const studentFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  shift: z.enum(["morning", "evening", "fullday"], { required_error: "Shift selection is required." }),
  idCardImage: z.any().optional(),
  seatNumber: z.string().min(1, "Seat selection or auto-assign is required."),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

const shiftOptions = [
  { value: "morning", label: "Morning Shift (7 AM - 2 PM)" },
  { value: "evening", label: "Evening Shift (3 PM - 10 PM)" },
  { value: "fullday", label: "Full Day (7 AM - 10 PM)" },
];

export default function StudentRegisterPage() {
  const { toast } = useToast();
  const idCardImageRef = React.useRef<HTMLInputElement>(null);
  const [availableSeats, setAvailableSeats] = React.useState<string[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchSeats = async () => {
    setIsLoadingSeats(true);
    try {
      const seats = await getAvailableSeats();
      setAvailableSeats(seats);
    } catch (error) {
      toast({
        title: "Error fetching seats",
        description: "Could not load available seats. Please try again later.",
        variant: "destructive",
      });
      setAvailableSeats([]);
    } finally {
      setIsLoadingSeats(false);
    }
  };

  React.useEffect(() => {
    fetchSeats();
  }, []);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      shift: undefined,
      idCardImage: undefined,
      seatNumber: undefined,
    },
  });

  async function onSubmit(data: StudentFormValues) {
    setIsSubmitting(true);
    let idCardFileName: string | undefined;
    if (data.idCardImage && data.idCardImage.length > 0) {
      idCardFileName = data.idCardImage[0].name;
    }

    let assignedSeatNumber: string | undefined = data.seatNumber;

    if (data.seatNumber === "AUTO_ASSIGN_SEAT") {
      if (availableSeats.length > 0) {
        assignedSeatNumber = availableSeats[0]; // Assign the first available seat
      } else {
        toast({
          title: "Registration Failed",
          description: "No seats available for auto-assignment. Please check seat availability.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return; 
      }
    }
    
    if (!assignedSeatNumber) {
        toast({
          title: "Registration Failed",
          description: "Seat number is required.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
    }

    const studentPayload: AddStudentData = {
      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      shift: data.shift as Shift,
      seatNumber: assignedSeatNumber,
      idCardFileName: idCardFileName,
    };
    
    try {
      const newStudent = await addStudent(studentPayload);
      toast({
        title: "Student Registered Successfully",
        description: `${newStudent.name} (ID: ${newStudent.studentId}) has been registered. Assigned Seat: ${newStudent.seatNumber}.`,
      });
      form.reset();
      if (idCardImageRef.current) {
        idCardImageRef.current.value = ""; 
      }
      await fetchSeats(); // Re-fetch seats to update dropdown
    } catch (error: any) {
       toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageTitle title="Register New Student" description="Add a new student to the system including their shift and ID." />
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Student Registration Form</CardTitle>
          <CardDescription>Fill in the details below to add a new student. Student ID will be auto-generated.</CardDescription>
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
                    <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""} disabled={isSubmitting || isLoadingSeats}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingSeats ? "Loading seats..." : "Select a seat or Auto-assign"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!isLoadingSeats && <SelectItem value="AUTO_ASSIGN_SEAT">Auto-assign Seat</SelectItem>}
                        {!isLoadingSeats && availableSeats.map(seat => (
                          <SelectItem key={seat} value={seat}>
                            {seat}
                          </SelectItem>
                        ))}
                        {!isLoadingSeats && availableSeats.length === 0 && (
                           <p className="p-2 text-xs text-muted-foreground">No specific seats currently available. Choose Auto-assign if available.</p>
                        )}
                         {isLoadingSeats && (
                           <div className="p-2 text-xs text-muted-foreground flex items-center justify-center">
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading available seats...
                           </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a specific available seat or select "Auto-assign Seat".
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="idCardImage"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>ID Card Image (Aadhar, PAN, etc.)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={(e) => onChange(e.target.files)}
                        ref={idCardImageRef}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        disabled={isSubmitting}
                        {...rest}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload a clear image of the student's ID card for verification.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isLoadingSeats}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Registering..." : "Register Student"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}

    