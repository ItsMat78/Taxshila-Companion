
"use client";

import * as React from 'react';
import Image from 'next/image';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, ClipboardCheck, Loader2, UserX, UserCheck, FileText, KeyRound, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getStudentById, updateStudent, getAvailableSeats, recordStudentPayment, deleteStudentCompletely } from '@/services/student-service';
import type { Student, Shift } from '@/types/student';
import { format, addMonths } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const ID_CARD_PLACEHOLDER_EDIT = "https://placehold.co/150x100.png?text=ID+Preview";

const studentEditFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string()
    .length(10, { message: "Phone number must be exactly 10 digits." })
    .regex(/^\d+$/, { message: "Phone number must contain only digits." }),
  address: z.string(),
  shift: z.enum(["morning", "evening", "fullday"], { required_error: "Shift selection is required." }),
  seatNumber: z.string().nullable().refine(val => val !== null && val !== "", { message: "Seat selection is required."}),
  idCardFileName: z.string().optional(),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && data.newPassword.length > 0) {
    return data.newPassword.length >= 6;
  }
  return true;
}, {
  message: "New password must be at least 6 characters.",
  path: ["newPassword"],
}).refine(data => {
  if (data.newPassword && data.newPassword.length > 0) {
    return data.confirmNewPassword === data.newPassword;
  }
  return true;
}, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
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
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isLoadingSeats, setIsLoadingSeats] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDirtyOverride, setIsDirtyOverride] = React.useState(false);

  const form = useForm<StudentEditFormValues>({
    resolver: zodResolver(studentEditFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      shift: undefined,
      seatNumber: null,
      idCardFileName: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const selectedShift = form.watch("shift");
  const currentIdCardFilename = form.watch("idCardFileName");
  const isStudentLeft = studentData?.activityStatus === 'Left';

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
          address: student.address,
          shift: student.shift,
          seatNumber: student.activityStatus === 'Left' ? null : student.seatNumber,
          idCardFileName: student.idCardFileName || "",
          newPassword: "", 
          confirmNewPassword: "",
        });
      } else {
        toast({ title: "Error", description: "Student not found.", variant: "destructive" });
        setStudentData(null);
        // Optionally redirect if student not found
        // router.push('/students/list'); 
      }
    } catch (error) {
      console.error("Failed to fetch student data:", error);
      toast({ title: "Error", description: "Failed to load student data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsDirtyOverride(false);
    }
  }, [form, toast]);

  React.useEffect(() => {
    if (studentId) {
      fetchStudentDetails(studentId);
    }
  }, [studentId, fetchStudentDetails]);

  React.useEffect(() => {
    const fetchSeatsForShift = async (shift: Shift) => {
      if (!studentData) return;

      setIsLoadingSeats(true);
      setAvailableSeatOptions([]);
      // If the shift is being changed OR the student was marked 'Left' and is being re-activated, clear the current seat selection.
      // Otherwise, (e.g., editing other details but not shift), retain the current seat.
      if (form.getValues("shift") !== studentData.shift || studentData.activityStatus === 'Left') {
         form.setValue("seatNumber", null, {shouldDirty: true}); // Clear seat if shift changes or student is 'Left'
         setIsDirtyOverride(true);
      } else {
        form.setValue("seatNumber", studentData.seatNumber, { shouldDirty: false }); // Keep current seat if shift not changing and student Active
      }
      
      try {
        const seats = await getAvailableSeats(shift); // `shift` is the new `selectedShift`
        const seatOptionsSet = new Set(seats);

        // If the student being edited is active and currently has a seat,
        // ensure that seat is always an option in the dropdown, even if their shift is changing.
        if (studentData.seatNumber && studentData.activityStatus === 'Active') {
          seatOptionsSet.add(studentData.seatNumber);
        }
        
        setAvailableSeatOptions(Array.from(seatOptionsSet).sort((a,b) => parseInt(a) - parseInt(b)));
      } catch (error) {
        console.error(`Failed to fetch available seats for ${shift} shift:`, error);
        toast({ title: "Error", description: `Could not load seats for ${shift} shift.`, variant: "destructive" });
        setAvailableSeatOptions([]);
      } finally {
        setIsLoadingSeats(false);
      }
    };

    if (selectedShift && studentData) {
      fetchSeatsForShift(selectedShift);
    } else {
      setAvailableSeatOptions([]);
      setIsLoadingSeats(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShift, studentData, toast]);


  async function onSaveChanges(data: StudentEditFormValues) {
    if (!studentId || !studentData) return;
    setIsSaving(true);

    let payload: Partial<Student> = {};
    let successMessage: string;
    let wasReactivated = false;
    let passwordUpdated = false;

    if (data.newPassword && data.newPassword.length >= 6 && data.newPassword === data.confirmNewPassword) {
      payload.password = data.newPassword;
      passwordUpdated = true;
    }


    if (isStudentLeft) { 
      if (!data.seatNumber) {
        form.setError("seatNumber", { type: "manual", message: "A seat must be selected to re-activate." });
        toast({ title: "Re-activation Failed", description: "A seat must be selected.", variant: "destructive" });
        setIsSaving(false);
        return;
      }
      payload = {
        ...payload,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        shift: data.shift,
        seatNumber: data.seatNumber,
        activityStatus: 'Active', 
        registrationDate: studentData.registrationDate, 
        idCardFileName: data.idCardFileName,
      };
      successMessage = `${data.name} has been re-activated.`;
      wasReactivated = true;
    } else { 
      payload = {
        ...payload,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        shift: data.shift,
        seatNumber: data.seatNumber,
        idCardFileName: data.idCardFileName,
      };
      successMessage = `${data.name}'s details have been updated.`;
    }
    
    if (passwordUpdated) {
        successMessage += wasReactivated ? " Their password has also been updated." : " Password has also been updated.";
    }

    try {
      const updatedStudent = await updateStudent(studentId, payload);
      if (updatedStudent) {
        setStudentData(updatedStudent); 
        form.reset({ 
            name: updatedStudent.name,
            email: updatedStudent.email || "",
            phone: updatedStudent.phone,
            address: updatedStudent.address,
            shift: updatedStudent.shift,
            seatNumber: updatedStudent.activityStatus === 'Left' ? null : updatedStudent.seatNumber,
            idCardFileName: updatedStudent.idCardFileName || "",
            newPassword: "", 
            confirmNewPassword: ""
        });
        setIsDirtyOverride(false); 
        toast({
          title: wasReactivated ? "Student Re-activated" : "Changes Saved",
          description: successMessage,
        });
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
    if (!studentId || !studentData || isStudentLeft) return;
    setIsSaving(true);
    
    const amountToPay = studentData.amountDue && studentData.amountDue !== "Rs. 0" && studentData.amountDue !== "N/A" 
                       ? studentData.amountDue 
                       : (studentData.shift === "fullday" ? "Rs. 1200" : "Rs. 700");
    try {
      const updatedStudent = await recordStudentPayment(studentId, amountToPay, "Admin Recorded");
      if (updatedStudent) {
        setStudentData(updatedStudent); 
        setIsDirtyOverride(false);
         toast({
          title: "Payment Status Updated",
          description: `Payment for ${updatedStudent.name} has been marked as Paid. An alert has been sent.`,
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
    if (!studentId || !studentData || isStudentLeft) return;
    setIsSaving(true);
    try {
      const updatedStudent = await updateStudent(studentId, {
        activityStatus: 'Left',
      });
      if (updatedStudent) {
        setStudentData(updatedStudent); 
        form.reset({ 
            name: updatedStudent.name,
            email: updatedStudent.email || "",
            phone: updatedStudent.phone,
            address: updatedStudent.address,
            shift: updatedStudent.shift,
            seatNumber: null,
            idCardFileName: updatedStudent.idCardFileName || "",
            newPassword: "", 
            confirmNewPassword: ""
        });
        setIsDirtyOverride(true); 
        toast({
          title: "Student Marked as Left",
          description: `${updatedStudent.name} is now marked as Left. Their seat is available. An alert has been sent.`,
        });
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

  const handleDeleteStudent = async () => {
    if (!studentId || !studentData) return;
    setIsDeleting(true);
    try {
      await deleteStudentCompletely(studentId);
      toast({
        title: "Student Deleted",
        description: `${studentData.name} (ID: ${studentId}) has been permanently deleted from the system.`,
      });
      router.push('/students/list');
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message || "An unexpected error occurred while deleting the student.",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
    // No finally setIsDeleting(false) here, as we navigate away on success.
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue("idCardFileName", file.name, {shouldDirty: true});
      setIsDirtyOverride(true);
    } else {
      form.setValue("idCardFileName", studentData?.idCardFileName || "", {shouldDirty: true});
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
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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

  return (
    <>
      <PageTitle title={`Edit Student: ${studentData.name}`} description={`Modifying details for Student ID: ${studentId}`}>
        <Link href="/students/list" passHref legacyBehavior>
          <Button variant="outline" disabled={isSaving || isDeleting}>
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
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter student's full name" {...field} disabled={isSaving || isDeleting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} disabled={isSaving || isDeleting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="Enter 10-digit phone number" {...field} disabled={isSaving || isDeleting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="Enter address" {...field} disabled={isSaving || isDeleting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="shift" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Shift Selection</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={(value) => { field.onChange(value); setIsDirtyOverride(true); }} value={field.value} className="flex flex-col space-y-2" disabled={isSaving || isDeleting}>
                      {shiftOptions.map(option => (
                        <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value={option.value} disabled={isSaving || isDeleting} /></FormControl>
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
                        onValueChange={(value) => { field.onChange(value); setIsDirtyOverride(true); }}
                        value={field.value || ""}
                        disabled={isSaving || isDeleting || isLoadingSeats || !selectedShift}
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
                    {!isStudentLeft && studentData.seatNumber && studentData.shift !== selectedShift && form.getValues("seatNumber") !== studentData.seatNumber && <FormDescription>Shift changed. Select a new seat for the {selectedShift} shift.</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
              

              <div className="space-y-2 pt-4 border-t">
                <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />Update Password (Optional)</FormLabel>
                 <FormField control={form.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Enter new password (min 6 chars)" {...field} disabled={isSaving || isDeleting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirmNewPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Confirm New Password</FormLabel>
                    <FormControl><Input type="password" placeholder="Re-enter new password" {...field} disabled={isSaving || isDeleting} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMarkAsLeft}
                    disabled={isSaving || isDeleting || isStudentLeft}
                    className={isStudentLeft ? "hidden" : ""}
                  >
                    {isSaving && !isStudentLeft && !isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
                    Mark as Left
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={isSaving || isDeleting}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Student
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the student
                          ({studentData.name} - {studentId}) and all their associated data (like attendance records).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteStudent} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Confirm Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" onClick={handleMarkPaymentPaid} disabled={isSaving || isDeleting || studentData.feeStatus === "Paid" || isStudentLeft}>
                  {isSaving && studentData.feeStatus !== "Paid" && !isStudentLeft && !isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardCheck className="mr-2 h-4 w-4" />}
                  Mark Payment as Paid
                </Button>
                <Button type="submit" disabled={isSaving || isDeleting || isLoadingSeats || (!isStudentLeft && !form.formState.isDirty && !isDirtyOverride && !form.getValues("newPassword")) }>
                  {isSaving && !isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isStudentLeft ? <UserCheck className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />)}
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
