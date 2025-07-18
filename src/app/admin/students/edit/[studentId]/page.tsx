
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
import { ArrowLeft, Save, Loader2, UserX, UserCheck, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getStudentById, updateStudentProfile, updateUserAuthDetails } from '@/services/student-service';
import type { Student, Shift } from '@/types/student';
import { Skeleton } from '@/components/ui/skeleton';

const studentEditFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().length(10, "Phone number must be 10 digits.").regex(/^[6-9]\d{9}$/, "Invalid phone number."),
  address: z.string().min(1, "Address is required."),
  newPassword: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
});

type StudentEditFormValues = z.infer<typeof studentEditFormSchema>;

export default function EditStudentPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [studentData, setStudentData] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<StudentEditFormValues>({
    resolver: zodResolver(studentEditFormSchema),
  });

  React.useEffect(() => {
    const fetchStudentDetails = async (id: string) => {
      setIsLoading(true);
      try {
        const student = await getStudentById(id);
        if (student) {
          setStudentData(student);
          form.reset({
            name: student.name,
            email: student.email || "",
            phone: student.phone,
            address: student.address,
          });
        } else {
          toast({ title: "Error", description: "Student not found.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load student data.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    if (studentId) {
      fetchStudentDetails(studentId);
    }
  }, [studentId, form, toast]);

  async function onSaveChanges(data: StudentEditFormValues) {
    if (!studentId || !studentData) return;
    setIsSaving(true);

    try {
      // Update Firestore profile data
      const profilePayload: Partial<Student> = {
        name: data.name,
        address: data.address,
      };
      await updateStudentProfile(studentId, profilePayload);
      
      // Update Firebase Auth details if they've changed
      const authPayload: { email?: string; phone?: string; password?: string } = {};
      if (data.email && data.email !== studentData.email) authPayload.email = data.email;
      if (data.phone && data.phone !== studentData.phone) authPayload.phone = data.phone;
      if (data.newPassword) authPayload.password = data.newPassword;

      if (Object.keys(authPayload).length > 0) {
        await updateUserAuthDetails(studentData.uid, authPayload);
      }

      toast({
        title: "Success",
        description: `${data.name}'s details have been updated successfully.`,
      });
      router.push('/students/list');
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
  
  if (isLoading) {
    return <div className="p-4"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!studentData) {
    return <div className="p-4 text-center">Student not found.</div>;
  }

  return (
    <>
      <PageTitle title={`Edit Student: ${studentData.name}`} description={`ID: ${studentId}`}>
        <Link href="/students/list">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        </Link>
      </PageTitle>
      <Card className="w-full md:max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSaveChanges)}>
            <CardHeader><CardTitle>Student Details</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
               <div className="space-y-2 pt-4 border-t">
                <FormLabel className="flex items-center"><KeyRound className="mr-2 h-4 w-4" />Update Password (Optional)</FormLabel>
                 <FormField control={form.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">New Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
