
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
import { ArrowLeft, Save, ClipboardCheck, Info as InfoIcon, Loader2, UserX, UserCheck } from 'lucide-react';
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
  seatNumber: z.string().min(1, "Seat selection is required.").nullable(),
  idCardFileName: z.string().optional(),
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
  const [isLoadingSeats, setIsLoadingSeats] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<StudentEditFormValues>({
    resolver: zodResolver(studentEditFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      shift: undefined,
      seatNumber: null,
      idCardFileName: "",
    },
  });

  const selectedShift = form.watch("shift");
  const currentSeatNumber = studentData?.seatNumber; // Original seat number for comparison

  const fetchStudentDetails = React.useCallback(async (currentStudentId: string) => {
    setIsLoading(true);
    try {
      const student = await getStudentById(currentStudentId);
      if (student) {
        setStudentData(student);
        form.reset({
          name: student.name,
          email: student.email || "",
          phone: student.phone,
          shift: student.shift,
          seatNumber: student.seatNumber,
          idCardFileName: student.idCardFileName || "",
        });
        // Initial seat loading will be triggered by useEffect watching selectedShift
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
  }, [form, toast]);

  React.useEffect(() => {
    if (studentId) {
      fetchStudentDetails(studentId);
    }
  }, [studentId, fetchStudentDetails]);

  React.useEffect(() => {
    const fetchSeatsForShift = async (shift: Shift) => {
      if (!studentData) return; // Don't fetch if student data isn't loaded yet

      setIsLoadingSeats(true);
      setAvailableSeatOptions([]);
      // Don't reset seatNumber here if it's the student's current shift and seat
      
      try {
        const seats = await getAvailableSeats(shift);
        const seatOptionsSet = new Set(seats);

        // If student is active, has a seat, and the current form shift matches student's actual shift,
        // ensure their current seat is in the options list.
        if (studentData.seatNumber && studentData.activityStatus === 'Active' && studentData.shift === shift) {
          seatOptionsSet.add(studentData.seatNumber);
        }
        // For re-activation, if they had a seat and the selected shift could accommodate it (hypothetically)
        // it doesn't make sense to pre-select. Let them choose a new one.
        
        setAvailableSeatOptions(Array.from(seatOptionsSet).sort((a,b) => parseInt(a) - parseInt(b)));
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
  }, [selectedShift, studentData, toast]);


  async function onSaveChanges(data: StudentEditFormValues) {
    if (!studentId || !studentData) return;
    setIsSaving(true);

    let payload: Partial<Student>;
    let successMessage: string;

    if (studentData.activityStatus === 'Left') {
      if (!data.seatNumber) {
        toast({
            title: "Re-activation Failed",
            description: "A seat must be selected to re-activate a student.",
            variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        shift: data.shift,
        seatNumber: data.seatNumber,
        activityStatus: 'Active',
        feeStatus: 'Due',
        amountDue: data.shift === "fullday" ? "₹1200" : "₹700",
        lastPaymentDate: undefined,
        nextDueDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        registrationDate: studentData.registrationDate,
        idCardFileName: data.idCardFileName,
      };
      successMessage = `${data.name} has been re-activated for ${data.shift} shift with seat ${data.seatNumber}.`;

    } else { // Standard edit logic
      payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        shift: data.shift,
        seatNumber: data.seatNumber,
        idCardFileName: data.idCardFileName,
      };
      successMessage = `${data.name}'s details have been updated.`;
    }

    try {
      const updatedStudent = await updateStudent(studentId, payload);
      if (updatedStudent) {
        setStudentData(updatedStudent);
        form.reset({ 
            name: updatedStudent.name,
            email: updatedStudent.email || "",
            phone: updatedStudent.phone,
            shift: updatedStudent.shift,
            seatNumber: updatedStudent.seatNumber,
            idCardFileName: updatedStudent.idCardFileName || "",
        });
        toast({
          title: studentData.activityStatus === 'Left' ? "Student Re-activated" : "Changes Saved",
          description: successMessage,
        });
        // Re-fetch available seats for the current shift
        if (updatedStudent.shift) {
            setIsLoadingSeats(true);
            try {
                const seats = await getAvailableSeats(updatedStudent.shift);
                const seatOptionsSet = new Set(seats);
                if (updatedStudent.seatNumber && updatedStudent.activityStatus === 'Active') {
                    seatOptionsSet.add(updatedStudent.seatNumber);
                }
                setAvailableSeatOptions(Array.from(seatOptionsSet).sort((a,b)=>parseInt(a)-parseInt(b)));
            } catch(e) { console.error(e); }
            finally { setIsLoadingSeats(false); }
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
      const updatedStudent = await updateStudent(studentId, {
        activityStatus: 'Left',
        seatNumber: null,
        feeStatus: 'N/A',
        amountDue: 'N/A',
        lastPaymentDate: undefined,
        nextDueDate: undefined,
      });
      if (updatedStudent) {
        setStudentData(updatedStudent);
        form.reset({
            name: updatedStudent.name,
            email: updatedStudent.email || "",
            phone: updatedStudent.phone,
            shift: updatedStudent.shift, // Keep their last shift
            seatNumber: null, // Seat is now null
            idCardFileName: updatedStudent.idCardFileName || "",
        });
        toast({
          title: "Student Marked as Left",
          description: `${updatedStudent.name} is now marked as Left. Their seat is available for their shift.`,
        });
        // Seats for the current form shift might need refreshing if the student's shift was this one
        if (selectedShift) {
           setIsLoadingSeats(true);
            try {
                const seats = await getAvailableSeats(selectedShift);
                setAvailableSeatOptions(seats.sort((a,b)=>parseInt(a)-parseInt(b)));
            } catch(e) { console.error(e); }
            finally { setIsLoadingSeats(false); }
        }
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("idCardFileName", file.name);
    } else {
      form.setValue("idCardFileName", studentData?.idCardFileName || "");
    }
  };


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
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
            Current Fee Status: <span className="font-semibold">{studentData.feeStatus}</span>.
            Activity Status: <span className={`font-semibold ${isStudentLeft ? 'text-destructive' : 'text-green-600'}`}>{studentData.activityStatus}</span>.
            {isStudentLeft && " Update details and select a shift & seat to re-activate."}
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
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter student's full name" {...field} disabled={isSaving} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} disabled={isSaving} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="Enter 10-digit phone number" {...field} disabled={isSaving} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="shift" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Shift Selection</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2" disabled={isSaving}>
                      {shiftOptions.map(option => (
                        <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value={option.value} disabled={isSaving} /></FormControl>
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
                        disabled={isSaving || isLoadingSeats || !selectedShift}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedShift ? "Select shift first" : (isLoadingSeats ? "Loading seats..." : (isStudentLeft ? "Select new seat" : "Select a seat"))} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!selectedShift && (<p className="p-2 text-xs text-muted-foreground">Select a shift to see available seats.</p>)}
                        {selectedShift && isLoadingSeats && (<p className="p-2 text-xs text-muted-foreground">Loading seats...</p>)}
                        {selectedShift && !isLoadingSeats && availableSeatOptions.length === 0 && (
                           <p className="p-2 text-xs text-muted-foreground">No seats currently available for {selectedShift} shift.</p>
                        )}
                        {availableSeatOptions.map(seat => (
                          <SelectItem key={seat} value={seat}>
                            {seat}{seat === studentData.seatNumber && studentData.shift === selectedShift && !isStudentLeft ? " (Current)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isStudentLeft && <FormDescription>Student is Left. Selecting a shift and new seat is required to re-activate.</FormDescription>}
                    {!isStudentLeft && studentData.seatNumber && studentData.shift !== selectedShift && <FormDescription>Shift changed. Select a new seat for the {selectedShift} shift.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>ID Card (Optional - Photo/Scan)</FormLabel>
                 <Input
                    type="file"
                    accept="image/*,.pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isSaving}
                    className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {form.getValues("idCardFileName") && (
                    <FormDescription>Current file: {form.getValues("idCardFileName")}</FormDescription>
                  )}
                   <FormDescription>Editing/re-uploading ID card image not fully supported in demo (filename change only).</FormDescription>
              </FormItem>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleMarkAsLeft}
                disabled={isSaving || isStudentLeft}
                className={isStudentLeft ? "hidden" : ""}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                 Mark as Left
              </Button>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" onClick={handleMarkPaymentPaid} disabled={isSaving || studentData.feeStatus === "Paid" || isStudentLeft}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                  Mark Payment as Paid
                </Button>
                <Button type="submit" disabled={isSaving || isLoadingSeats || (!isStudentLeft && !form.formState.isDirty && !fileInputRef.current?.files?.length) }>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isStudentLeft ? <UserCheck className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />)}
                  {isStudentLeft ? "Save and Re-activate" : "Save Changes"}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
