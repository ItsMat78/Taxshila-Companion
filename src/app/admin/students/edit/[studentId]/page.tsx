
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
import { ArrowLeft, Save, ClipboardCheck, Info as InfoIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Placeholder for existing students to determine taken seats and student data
// In a real app, this data would come from an API or state management
const MOCK_STUDENT_DATABASE = {
  "TS001": { studentId: "TS001", name: "Aarav Sharma", email: "aarav.sharma@example.com", phone: "9876543210", shift: "morning" as const, seatNumber: "A01", idCardFileName: "aarav_id.jpg", feeStatus: "Paid" },
  "TS002": { studentId: "TS002", name: "Priya Patel", email: "priya.patel@example.com", phone: "9876543211", shift: "evening" as const, seatNumber: "B03", idCardFileName: "priya_id.png", feeStatus: "Due" },
  "TS003": { studentId: "TS003", name: "Rohan Mehta", email: "rohan.mehta@example.com", phone: "9876543212", shift: "fullday" as const, seatNumber: "C07", idCardFileName: "rohan_aadhar.jpeg", feeStatus: "Overdue" },
};
type StudentKey = keyof typeof MOCK_STUDENT_DATABASE;

// Define all seat numbers (e.g., A01-A20, B01-B20, etc.) - simplified for example
const ALL_SEAT_NUMBERS = Array.from({ length: 20 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`)
  .concat(Array.from({ length: 20 }, (_, i) => `B${String(i + 1).padStart(2, '0')}`))
  .concat(Array.from({ length: 5 }, (_, i) => `C${String(i + 1).padStart(2, '0')}`)); // Total 45 seats


const studentEditFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
  shift: z.enum(["morning", "evening", "fullday"], { required_error: "Shift selection is required." }),
  seatNumber: z.string().min(1, "Seat selection is required."),
});

type StudentEditFormValues = z.infer<typeof studentEditFormSchema>;

const shiftOptions = [
  { value: "morning", label: "Morning Shift (7 AM - 2 PM)" },
  { value: "evening", label: "Evening Shift (3 PM - 10 PM)" },
  { value: "fullday", label: "Full Day (7 AM - 10 PM)" },
];

export default function EditStudentPage() {
  const { toast } = useToast();
  const params = useParams();
  const studentId = params.studentId as StudentKey;

  const [studentData, setStudentData] = React.useState(MOCK_STUDENT_DATABASE[studentId]);

  const form = useForm<StudentEditFormValues>({
    resolver: zodResolver(studentEditFormSchema),
    defaultValues: studentData ? {
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      shift: studentData.shift,
      seatNumber: studentData.seatNumber,
    } : {},
  });
  
  React.useEffect(() => {
    // Reset form if studentData changes (e.g. after marking payment)
     if (studentData) {
      form.reset({
        name: studentData.name,
        email: studentData.email,
        phone: studentData.phone,
        shift: studentData.shift,
        seatNumber: studentData.seatNumber,
      });
    }
  }, [studentData, form]);


  if (!studentData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Student not found or loading...</p>
        <Link href="/students/list" passHref legacyBehavior>
          <Button variant="link" className="mt-4">Go back to list</Button>
        </Link>
      </div>
    );
  }
  
  // Simplified seat availability: lists all seats not taken by OTHER students, plus current student's seat
  const takenSeatsByOthers = Object.values(MOCK_STUDENT_DATABASE)
    .filter(s => s.studentId !== studentId && s.seatNumber)
    .map(s => s.seatNumber!);
  const availableSeatOptions = ALL_SEAT_NUMBERS.filter(seat => !takenSeatsByOthers.includes(seat) || seat === studentData.seatNumber);


  function onSaveChanges(data: StudentEditFormValues) {
    console.log("Updated student data (simulated):", { studentId, ...data });
    // Simulate update
    MOCK_STUDENT_DATABASE[studentId] = { ...MOCK_STUDENT_DATABASE[studentId], ...data, feeStatus: studentData.feeStatus, idCardFileName: studentData.idCardFileName };
    setStudentData(prev => prev ? { ...prev, ...data } : null); // Update local state for UI reflect
    toast({
      title: "Changes Saved (Placeholder)",
      description: `${data.name}'s details have been updated.`,
    });
  }

  function handleMarkPaymentPaid() {
    console.log(`Marking payment as paid for ${studentId} (simulated)`);
    MOCK_STUDENT_DATABASE[studentId].feeStatus = "Paid"; // Simulate update
    setStudentData(prev => prev ? { ...prev, feeStatus: "Paid" as const } : null);
    toast({
      title: "Payment Status Updated (Placeholder)",
      description: `Payment for ${studentData.name} has been marked as Paid.`,
    });
  }

  return (
    <>
      <PageTitle title={`Edit Student: ${studentData.name}`} description={`Modifying details for Student ID: ${studentId}`}>
        <Link href="/students/list" passHref legacyBehavior>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Student List
          </Button>
        </Link>
      </PageTitle>
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Edit Student Details</CardTitle>
          <CardDescription>Update the information below. Current Fee Status: <span className="font-semibold">{studentData.feeStatus}</span></CardDescription>
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
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter student's full name" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="Enter 10-digit phone number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="shift" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Shift Selection</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2">
                      {shiftOptions.map(option => (
                        <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value={option.value} /></FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a seat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSeatOptions.map(seat => (
                          <SelectItem key={seat} value={seat}>
                            {seat}{seat === studentData.seatNumber ? " (Current)" : ""}
                          </SelectItem>
                        ))}
                        {availableSeatOptions.length === 0 && (
                           <p className="p-2 text-xs text-muted-foreground">No seats currently available.</p>
                        )}
                      </SelectContent>
                    </Select>
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
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <Button type="button" variant="outline" onClick={handleMarkPaymentPaid} disabled={studentData.feeStatus === "Paid"}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Mark Payment as Paid
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
