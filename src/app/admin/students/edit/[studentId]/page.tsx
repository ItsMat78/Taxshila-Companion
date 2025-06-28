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
import { getStudentById, updateStudent, getAvailableSeats, recordStudentPayment, deleteStudentCompletely, getFeeStructure } from '@/services/student-service';
import type { Student, Shift, FeeStructure } from '@/types/student';
import { format, addMonths } from 'date-fns';
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationContext } from '@/contexts/notification-context';

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
  nextDueDate: z.date().optional(),
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
  { value: "evening" as Shift, label: "Evening Shift (2 PM - 9:30 PM)" },
  { value: "fullday" as Shift, label: "Full Day (7 AM - 9:30 PM)" },
];

export default function EditStudentPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const { refreshNotifications } = useNotificationContext();

  const [studentData, setStudentData] = React.useState<Student | null>(null);
  const [availableSeatOptions, setAvailableSeatOptions] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isLoadingSeats, setIsLoadingSeats] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDirtyOverride, setIsDirtyOverride] = React.useState(false);

  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = React.useState(false);
  const [isConfirmMarkLeftOpen, setIsConfirmMarkLeftOpen] = React.useState(false);
  const [feeStructure, setFeeStructure] = React.useState<FeeStructure | null>(null);


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
      nextDueDate: undefined,
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
      const [student, fees] = await Promise.all([
          getStudentById(currentStudentId),
          getFeeStructure()
      ]);
      setFeeStructure(fees);
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
          nextDueDate: student.nextDueDate ? new Date(student.nextDueDate) : undefined,
          newPassword: "", 
          confirmNewPassword: "",
        });
      } else {
        toast({ title: "Error", description: "Student not found.", variant: "destructive" });
        setStudentData(null);
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
      if (form.getValues("shift") !== studentData.shift || studentData.activityStatus === 'Left') {
         form.setValue("seatNumber", null, {shouldDirty: true});
         setIsDirtyOverride(true);
      } else {
        form.setValue("seatNumber", studentData.seatNumber, { shouldDirty: false });
      }
      
      try {
        const seats = await getAvailableSeats(shift);
        const seatOptionsSet = new Set(seats);
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
        nextDueDate: data.nextDueDate ? format(data.nextDueDate, 'yyyy-MM-dd') : undefined,
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
        nextDueDate: data.nextDueDate ? format(data.nextDueDate, 'yyyy-MM-dd') : undefined,
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
            nextDueDate: updatedStudent.nextDueDate ? new Date(updatedStudent.nextDueDate) : undefined,
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
    if (!studentId || !studentData || isStudentLeft || !feeStructure) return;
    setIsSaving(true);
    
    let amountToPay: string;
    if (studentData.amountDue && studentData.amountDue !== "Rs. 0" && studentData.amountDue !== "N/A") {
      amountToPay = studentData.amountDue;
    } else {
        let defaultFee = 0;
        switch(studentData.shift) {
            case 'morning': defaultFee = feeStructure.morningFee; break;
            case 'evening': defaultFee = feeStructure.eveningFee; break;
            case 'fullday': defaultFee = feeStructure.fullDayFee; break;
        }
        amountToPay = `Rs. ${defaultFee}`;
    }

    try {
      const updatedStudent = await recordStudentPayment(studentId, amountToPay, "Admin Recorded");
      if (updatedStudent) {
        setStudentData(updatedStudent); 
        setIsDirtyOverride(false);
        refreshNotifications(); // Refresh sidebar counts
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
      setIsConfirmPaymentOpen(false);
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
            nextDueDate: updatedStudent.nextDueDate ? new Date(updatedStudent.nextDueDate) : undefined,
            newPassword: "", 
            confirmNewPassword: ""
        });
        setIsDirtyOverride(true); 
        refreshNotifications(); // Refresh sidebar counts
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
      setIsConfirmMarkLeftOpen(false);
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

  const getAmountDueDisplay = () => {
    if (studentData.amountDue && studentData.amountDue !== "Rs. 0" && studentData.amountDue !== "N/A") {
      return studentData.amountDue;
    }
    if (feeStructure) {
      switch (studentData.shift) {
        case 'morning': return `Rs. ${feeStructure.morningFee}`;
        case 'evening': return `Rs. ${feeStructure.eveningFee}`;
        case 'fullday': return `Rs. ${feeStructure.fullDayFee}`;
      }
    }
    return "Calculating...";
  };

  const amountDueDisplay = getAmountDueDisplay();

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
                           <p className="p-2 text-xs text-muted-foreground">No seats currently available for {selectedShift} shift.</p>)}
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
              
              <FormField
                control={form.control}
                name="nextDueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Next Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={isSaving || isDeleting}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                  <AlertDialog open={isConfirmMarkLeftOpen} onOpenChange={setIsConfirmMarkLeftOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving || isDeleting || isStudentLeft}
                        className={isStudentLeft ? "hidden" : ""}
                        onClick={() => setIsConfirmMarkLeftOpen(true)}
                      >
                        <UserX className="mr-2 h-4 w-4" /> Mark as Left
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark {studentData.name} as Left?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the student as inactive and their seat will become available. Are you sure?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsConfirmMarkLeftOpen(false)} disabled={isSaving}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMarkAsLeft} disabled={isSaving}>
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

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
                 <AlertDialog open={isConfirmPaymentOpen} onOpenChange={setIsConfirmPaymentOpen}>
                    <AlertDialogTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isSaving || isDeleting || studentData.feeStatus === "Paid" || isStudentLeft}
                            onClick={() => setIsConfirmPaymentOpen(true)}
                        >
                            <ClipboardCheck className="mr-2 h-4 w-4" /> Mark Payment as Paid
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Payment for {studentData.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will mark the current due amount of <strong>{amountDueDisplay}</strong> as paid and advance the due date by one month.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsConfirmPaymentOpen(false)} disabled={isSaving}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleMarkPaymentPaid} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirm Payment
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
