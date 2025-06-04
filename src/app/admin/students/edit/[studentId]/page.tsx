
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
import { ArrowLeft, Save, ClipboardCheck, Info as InfoIcon, Loader2, UserX } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getStudentById, updateStudent, getAvailableSeats } from '@/services/student-service';
import type { Student, Shift } from '@/types/student';
import { format, addMonths } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const studentEditFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  shift: z.enum(["morning", "evening", "fullday"], { required_error: "Shift selection is required." }),
  seatNumber: z.string().min(1, "Seat selection is required.").nullable(), // Allow null for "Left" students
});

type StudentEditFormValues = z.infer<typeof studentEditFormSchema>;

const shiftOptions = [
  { value: "morning" as Shift, label: "Morning Shift (7 AM - 2 PM)" },
  { value: "evening" as Shift, label: "Evening Shift (3 PM - 10 PM)" },
  { value: "fullday" as Shift, label: "Full Day (7 AM - 10 PM)" },
];

export default function EditStudentPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [studentData, setStudentData] = React.useState<Student | null>(null);
  const [availableSeatOptions, setAvailableSeatOptions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<StudentEditFormValues>({
    resolver: zodResolver(studentEditFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      shift: undefined,
      seatNumber: null,
    },
  });

  React.useEffect(() => {
    if (!studentId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const student = await getStudentById(studentId);
        if (student) {
          setStudentData(student);
          form.reset({
            name: student.name,
            email: student.email || "",
            phone: student.phone,
            shift: student.shift,
            seatNumber: student.seatNumber,
          });

          const seats = await getAvailableSeats();
          const currentStudentSeat = student.seatNumber;
          const seatOptionsSet = new Set(seats);
          if (currentStudentSeat && student.activityStatus === 'Active') { // Only add current seat if student is active
            seatOptionsSet.add(currentStudentSeat);
          }
          setAvailableSeatOptions(Array.from(seatOptionsSet).sort());

        } else {
          toast({ title: "Error", description: "Student not found.", variant: "destructive" });
          setStudentData(null);
        }
      } catch (error) {
        console.error("Failed to fetch student data:", error);
        toast({ title: "Error", description: "Failed to load student data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [studentId, form, toast]);


  async function onSaveChanges(data: StudentEditFormValues) {
    if (!studentId || !studentData || studentData.activityStatus === 'Left') return;
    setIsSaving(true);
    try {
      const updatedStudent = await updateStudent(studentId, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        shift: data.shift,
        seatNumber: data.seatNumber, // seatNumber can be null if student is left, but form validation requires it if active
      });
      if (updatedStudent) {
        setStudentData(updatedStudent); 
        form.reset({
            name: updatedStudent.name,
            email: updatedStudent.email || "",
            phone: updatedStudent.phone,
            shift: updatedStudent.shift,
            seatNumber: updatedStudent.seatNumber,
        });
        toast({
          title: "Changes Saved",
          description: `${updatedStudent.name}'s details have been updated.`,
        });
         // Re-fetch available seats if seat was part of the update and student is active
        if (data.seatNumber !== studentData.seatNumber && updatedStudent.activityStatus === 'Active') {
            const seats = await getAvailableSeats();
            const seatOptionsSet = new Set(seats);
            if (updatedStudent.seatNumber) {
              seatOptionsSet.add(updatedStudent.seatNumber);
            }
            setAvailableSeatOptions(Array.from(seatOptionsSet).sort());
        }
      } else {
         toast({ title: "Error", description: "Failed to save changes.", variant: "destructive"});
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkPaymentPaid() {
    if (!studentId || !studentData || studentData.activityStatus === 'Left') return;
    setIsSaving(true);
    const today = new Date();
    const paymentUpdatePayload: Partial<Student> = {
      feeStatus: "Paid",
      amountDue: "₹0",
      lastPaymentDate: format(today, 'yyyy-MM-dd'),
      nextDueDate: format(addMonths(today, 1), 'yyyy-MM-dd'),
    };
    try {
      const updatedStudent = await updateStudent(studentId, paymentUpdatePayload);
      if (updatedStudent) {
        setStudentData(updatedStudent);
         toast({
          title: "Payment Status Updated",
          description: `Payment for ${updatedStudent.name} has been marked as Paid.`,
        });
      } else {
        toast({ title: "Error", description: "Failed to update payment status.", variant: "destructive"});
      }
    } catch (error: any) {
       toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkAsLeft() {
    if (!studentId || !studentData || studentData.activityStatus === 'Left') return;
    setIsSaving(true);
    try {
      const updatedStudent = await updateStudent(studentId, { activityStatus: 'Left', seatNumber: null, feeStatus: 'N/A', amountDue: 'N/A' });
      if (updatedStudent) {
        setStudentData(updatedStudent);
        form.reset({ // Reset form reflecting "Left" status
            name: updatedStudent.name,
            email: updatedStudent.email || "",
            phone: updatedStudent.phone,
            shift: updatedStudent.shift,
            seatNumber: null, // No seat for "Left" student
        });
        toast({
          title: "Student Marked as Left",
          description: `${updatedStudent.name} is now marked as Left. Their seat is available.`,
        });
        // Re-fetch available seats as one just became available
        const seats = await getAvailableSeats();
        setAvailableSeatOptions(seats.sort());

      } else {
        toast({ title: "Error", description: "Failed to mark student as Left.", variant: "destructive"});
      }
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }


  if (isLoading) {
    return (
      <>
        <PageTitle title="Edit Student: ..." description="Loading student details...">
         <Skeleton className="h-10 w-36" />
        </PageTitle>
        <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </>
    );
  }

  if (!studentData) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10">
        <PageTitle title="Student Not Found" description={`No student found with ID: ${studentId}`} />
        <Button onClick={() => router.push('/students/list')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Student List
        </Button>
      </div>
    );
  }
  
  const isStudentLeft = studentData.activityStatus === 'Left';

  return (
    <>
      <PageTitle title={`Edit Student: ${studentData.name}`} description={`Modifying details for Student ID: ${studentId}`}>
        <Link href="/students/list" passHref legacyBehavior>
          <Button variant="outline" disabled={isSaving}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Student List
          </Button>
        </Link>
      </PageTitle>
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Edit Student Details</CardTitle>
          <CardDescription>
            Update the information below. Current Fee Status: <span className="font-semibold">{studentData.feeStatus}</span>.
            Activity Status: <span className={`font-semibold ${isStudentLeft ? 'text-destructive' : 'text-green-600'}`}>{studentData.activityStatus}</span>.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSaveChanges)}>
            <CardContent className="space-y-6">
              <FormItem>
                <FormLabel>Student ID</FormLabel>
                <FormControl>
                  <Input value={studentId} disabled />
                </FormControl>
              </FormItem>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter student's full name" {...field} disabled={isSaving || isStudentLeft} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} disabled={isSaving || isStudentLeft} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="Enter 10-digit phone number" {...field} disabled={isSaving || isStudentLeft} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="shift" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Shift Selection</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2" disabled={isSaving || isStudentLeft}>
                      {shiftOptions.map(option => (
                        <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value={option.value} disabled={isSaving || isStudentLeft} /></FormControl>
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
                        value={field.value || ""} 
                        disabled={isSaving || isStudentLeft}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isStudentLeft ? "N/A (Student Left)" : "Select a seat"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!isStudentLeft && availableSeatOptions.map(seat => (
                          <SelectItem key={seat} value={seat}>
                            {seat}{seat === studentData.seatNumber && studentData.activityStatus === 'Active' ? " (Current)" : ""}
                          </SelectItem>
                        ))}
                        {!isStudentLeft && availableSeatOptions.length === 0 && (
                           <p className="p-2 text-xs text-muted-foreground">No seats currently available.</p>
                        )}
                         {isStudentLeft && (
                           <p className="p-2 text-xs text-muted-foreground">Student has left, no seat assigned.</p>
                        )}
                      </SelectContent>
                    </Select>
                     {isStudentLeft && <FormDescription>Student has left the study hall.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>ID Card Information</FormLabel>
                 <div className="flex items-center p-3 border rounded-md bg-muted/50">
                    <InfoIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      ID Card on file: {studentData.idCardFileName || "Not available"}. (Editing ID card image is not supported in this demo).
                    </p>
                </div>
              </FormItem>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <Button type="button" variant="outline" onClick={handleMarkAsLeft} disabled={isSaving || isStudentLeft}>
                {isSaving && !isStudentLeft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                {isStudentLeft ? "Student Marked as Left" : "Mark as Left"}
              </Button>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" onClick={handleMarkPaymentPaid} disabled={isSaving || studentData.feeStatus === "Paid" || isStudentLeft}>
                  {isSaving && !isStudentLeft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                  Mark Payment as Paid
                </Button>
                <Button type="submit" disabled={isSaving || isStudentLeft}>
                  {isSaving && !isStudentLeft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
