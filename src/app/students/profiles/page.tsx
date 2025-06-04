
"use client";

import * as React from 'react';
import Link from 'next/link';
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight } from 'lucide-react';

const studentFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  studentId: z.string().min(3, { message: "Student ID is required." }),
  phone: z.string().optional(),
  shift: z.enum(["morning", "evening", "fullday"], { required_error: "Shift selection is required." }),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

// Placeholder data for existing students
const placeholderStudents: StudentFormValues[] = [
  { studentId: "TS001", name: "Aarav Sharma", email: "aarav.sharma@example.com", phone: "9876543210", shift: "morning" },
  { studentId: "TS002", name: "Priya Patel", email: "priya.patel@example.com", phone: "9876543211", shift: "evening" },
  { studentId: "TS003", name: "Rohan Mehta", email: "rohan.mehta@example.com", phone: "9876543212", shift: "fullday" },
];

const shiftOptions = [
  { value: "morning", label: "Morning Shift (8 AM - 2 PM)" },
  { value: "evening", label: "Evening Shift (3 PM - 9 PM)" },
  { value: "fullday", label: "Full Day (8 AM - 9 PM)" },
];

export default function StudentProfilesPage() {
  const { toast } = useToast();
  const [students, setStudents] = React.useState(placeholderStudents);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      studentId: "",
      phone: "",
      shift: undefined,
    },
  });

  function onSubmit(data: StudentFormValues) {
    setStudents(prev => [...prev, data]);
    toast({
      title: "Student Registered",
      description: `${data.name} has been successfully registered.`,
    });
    form.reset();
  }

  return (
    <>
      <PageTitle title="Student Profiles" description="Manage student registration and information." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Register New Student</CardTitle>
            <CardDescription>Add a new student to the system including their shift.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter student's full name" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="studentId" render={({ field }) => (
                  <FormItem><FormLabel>Student ID</FormLabel><FormControl><Input placeholder="Assign a unique student ID" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone Number (Optional)</FormLabel><FormControl><Input type="tel" placeholder="Enter phone number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="shift" render={({ field }) => (
                  <FormItem className="space-y-3"><FormLabel>Shift Selection</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
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
              </CardContent>
              <CardFooter>
                <Button type="submit">Register Student</Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registered Students</CardTitle>
            <CardDescription>View and manage registered students.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/students/profiles/${student.studentId}`} className="hover:underline text-primary">
                        {student.name}
                      </Link>
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell className="capitalize">{student.shift}</TableCell>
                    <TableCell>
                      <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                        <Button variant="outline" size="sm">
                          View <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {students.length === 0 && (
              <p className="py-4 text-center text-muted-foreground">No students registered yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
