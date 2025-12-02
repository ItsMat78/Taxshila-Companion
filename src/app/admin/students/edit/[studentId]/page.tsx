

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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, ClipboardCheck, Loader2, UserX, UserCheck, KeyRound, Trash2, CalendarDays, User, Settings, AlertTriangle, Armchair, Info } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getStudentById, updateStudent, getAvailableSeats, recordStudentPayment, getFeeStructure } from '@/services/student-service';
import type { Student, Shift, FeeStructure, PaymentRecord } from '@/types/student';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Skeleton } from '@/components/ui/skeleton';
import { useNotificationContext } from '@/contexts/notification-context';
import { ProfilePictureUploader } from '@/components/admin/edit-student/profile-picture-uploader';
import { Separator } from '@/components/ui/separator';

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

const getShiftColorClass = (shift: Shift | undefined) => {
  if (!shift) return 'bg-gray-100 text-gray-800 border-gray-300';
  switch (shift) {
    case 'morning': return 'bg-seat-morning text-seat-morning-foreground border-orange-300 dark:border-orange-700';
    case 'evening': return 'bg-seat-evening text-seat-evening-foreground border-purple-300 dark:border-purple-700';
    case 'fullday': return 'bg-seat-fullday text-seat-fullday-foreground border-yellow-300 dark:border-yellow-700';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};


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
  const [isDirtyOverride, setIsDirtyOverride] = React.useState(false);

  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = React.useState(false);
  const [isConfirmMarkLeftOpen, setIsConfirmMarkLeftOpen] = React.useState(false);
  const [feeStructure, setFeeStructure] = React.useState<FeeStructure | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentRecord['method']>('Cash');

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
          nextDueDate: student.nextDueDate ? parseISO(student.nextDueDate) : undefined,
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
        nextDueDate: format(new Date(), 'yyyy-MM-dd'),
        leftDate: undefined,
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
            nextDueDate: updatedStudent.nextDueDate ? parseISO(updatedStudent.nextDueDate) : undefined,
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
      const updatedStudent = await recordStudentPayment(studentId, amountToPay, paymentMethod);
      if (updatedStudent) {
        setStudentData(updatedStudent); 
        setIsDirtyOverride(false);
        refreshNotifications(); // Refresh sidebar counts
         toast({
          title: "Payment Status Updated",
          description: `Payment for ${updatedStudent.name} has been marked as Paid via ${paymentMethod}. An alert has been sent.`,
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
        leftDate: format(new Date(), 'yyyy-MM-dd'),
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
            nextDueDate: updatedStudent.nextDueDate ? parseISO(updatedStudent.nextDueDate) : undefined,
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
      const response = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: studentData.uid,
          studentId: studentData.studentId
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Deletion failed.');
      }

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

  const onPictureUploadSuccess = (newUrl: string) => {
    if (studentData) {
      setStudentData({ ...studentData, profilePictureUrl: newUrl });
    }
    setIsDirtyOverride(false);
    toast({
      title: 'Profile Picture Updated',
      description: "The student's new profile picture has been saved.",
    });
  };

  const onPictureSelect = () => {
    setIsDirtyOverride(true);
  };


  if (isLoading) {
    return (
      <>
        <PageTitle title="Edit Student: ..." description="Loading student details...">
         <Skeleton className="h-10 w-36" />
        </PageTitle>
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
            <div className="md:col-span-2 space-y-6">
                 <Skeleton className="h-96 w-full" />
            </div>
        </div>
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

  const isSaveDisabled = isSaving || isDeleting || isLoadingSeats || (!isStudentLeft && !form.formState.isDirty && !isDirtyOverride && !form.getValues("newPassword"));

  return (
    <>
      <PageTitle title={`Edit Student: ${studentData.name}`} description={`Modifying details for Student ID: ${studentId}`}>
        <div className="flex items-center space-x-2">
            <Link href={`/students/profiles/${studentId}`} passHref legacyBehavior>
                <Button variant="outline" disabled={isSaving || isDeleting}>
                    <User className="mr-2 h-4 w-4" />
                    Go to Profile
                </Button>
            </Link>
            <Link href="/students/list" passHref legacyBehavior>
                <Button variant="outline" disabled={isSaving || isDeleting}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to List
                </Button>
            </Link>
        </div>
      </PageTitle>

      <Form {...form}>
        <form>
          <Card className="shadow-lg">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column for Picture */}
              <div className="md:col-span-1">
                 <ProfilePictureUploader
                    studentFirestoreId={studentData.firestoreId!}
                    currentProfilePictureUrl={studentData.profilePictureUrl}
                    onUploadSuccess={onPictureUploadSuccess}
                    onPictureSelect={onPictureSelect}
                  />
              </div>

              {/* Right Column for Form */}
              <div className="md:col-span-2 space-y-6">
                 <div>
                    <h3 className="text-lg font-medium flex items-center mb-2"><User className="mr-2 h-5 w-5" />Personal Information</h3>
                    <div className="space-y-4">
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
                    </div>
                </div>

                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center mb-2"><Settings className="mr-2 h-5 w-5" />Configuration</h3>
                  <div className="space-y-4">
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
                    
                    <FormField control={form.control} name="seatNumber" render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Seat Number</FormLabel>
                            {!isStudentLeft && field.value && (
                              <div className={cn("flex items-center justify-center h-8 w-8 text-sm rounded-md border-2 font-bold", getShiftColorClass(form.getValues("shift")))}>
                                {field.value}
                              </div>
                            )}
                          </div>
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
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField control={form.control} name="nextDueDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>Next Due Date</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full sm:w-[240px] pl-3 text-left font-normal",
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
                                disabled={isSaving || isDeleting || isStudentLeft}
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
                            <FormDescription>
                                {isStudentLeft && "This field is ignored for 'Left' students unless they are re-activated."}
                            </FormDescription>
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
                  </div>
                </div>

              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center gap-2 p-6 bg-muted/30 border-t">
               {isStudentLeft ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" className="w-full sm:w-auto" disabled={isSaveDisabled}>
                      <UserCheck className="mr-2 h-4 w-4" /> Save and Re-activate
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Student Re-activation</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to re-activate this student. This will set their fee status to 'Due' and their next payment date will be reset.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2 text-sm">
                      <p>The student's new due date will be set to <strong>today, {format(new Date(), 'PP')}</strong>.</p>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={form.handleSubmit(onSaveChanges)}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirm Re-activation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
               ) : (
                <Button type="submit" onClick={form.handleSubmit(onSaveChanges)} className="w-full sm:w-auto" disabled={isSaveDisabled}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
               )}

              <div className="w-full sm:w-auto sm:ml-auto flex flex-col sm:flex-row gap-2">
                 <AlertDialog open={isConfirmPaymentOpen} onOpenChange={setIsConfirmPaymentOpen}>
                    <AlertDialogTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={isSaving || isDeleting || studentData.feeStatus === "Paid" || isStudentLeft}
                            onClick={() => {
                              setPaymentMethod('Cash'); // Default to cash on open
                              setIsConfirmPaymentOpen(true)
                            }}
                        >
                           <ClipboardCheck className="mr-2 h-4 w-4"/> Mark as Paid
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Payment for {studentData.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will mark the current due amount of <strong>{amountDueDisplay}</strong> as paid and advance the due date by one month. Please select the payment method used.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                        <RadioGroup defaultValue="Cash" onValueChange={(value) => setPaymentMethod(value as PaymentRecord['method'])}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Cash" id="payment-cash" />
                                <FormLabel htmlFor="payment-cash">Cash</FormLabel>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Online" id="payment-online" />
                                <FormLabel htmlFor="payment-online">Online (UPI/Card)</FormLabel>
                            </div>
                            </RadioGroup>
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setIsConfirmPaymentOpen(false)} disabled={isSaving}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleMarkPaymentPaid} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirm Payment
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={isConfirmMarkLeftOpen} onOpenChange={setIsConfirmMarkLeftOpen}>
                  <AlertDialogTrigger asChild>
                  <Button
                      type="button"
                      variant="outline"
                        className="w-full"
                      disabled={isSaving || isDeleting || isStudentLeft}
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
                        className="w-full"
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
                      ({studentData.name} - {studentId}) and all their associated data.
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

            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
}
