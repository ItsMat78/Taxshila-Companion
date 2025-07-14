
"use client";

import * as React from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Send, Megaphone, Info, AlertTriangle, Loader2, User, Users } from 'lucide-react';
import { sendGeneralAlert, sendAlertToStudent, getAllStudents } from '@/services/student-service';
import type { AlertItem } from '@/types/communication';
import type { Student } from '@/types/student';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


const alertFormSchema = z.object({
  audienceType: z.enum(["general", "targeted"], { required_error: "Please select an audience." }),
  studentId: z.string().optional(),
  studentName: z.string().optional(), // To display selected student name
  alertTitle: z.string().min(5, { message: "Title must be at least 5 characters." }).max(100, {message: "Title must not exceed 100 characters."}),
  alertMessage: z.string().min(10, { message: "Message must be at least 10 characters." }).max(500, {message: "Message must not exceed 500 characters."}),
  alertType: z.enum(["info", "warning", "closure"], { required_error: "Alert type is required."}),
}).refine(data => {
    if (data.audienceType === 'targeted') {
        return !!data.studentId && data.studentId.trim().length > 0;
    }
    return true;
}, {
    message: "A student must be selected for targeted alerts.",
    path: ["studentId"],
});


type AlertFormValues = z.infer<typeof alertFormSchema>;

const alertTypeOptions = [
  { value: "info" as AlertItem['type'], label: "General Info / Update", icon: <Info className="mr-2 h-4 w-4" /> },
  { value: "warning" as AlertItem['type'], label: "Warning / Maintenance", icon: <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" /> },
  { value: "closure" as AlertItem['type'], label: "Closure / Important Notice", icon: <Info className="mr-2 h-4 w-4 text-blue-500" /> },
];

interface StudentSelectionDialogProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  isLoading: boolean;
  onClose: () => void;
}

function StudentSelectionDialog({ students, onSelectStudent, isLoading, onClose }: StudentSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleStudentSelectedAndClose = (student: Student) => {
    onSelectStudent(student);
    onClose();
  }

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Select a Student</DialogTitle>
        <DialogDescription>Search for a student by name or ID and click 'Select' to choose them.</DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Input
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <div className="max-h-[60vh] overflow-y-auto border rounded-md">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleStudentSelectedAndClose(student)}>
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                   <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      No students found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  );
}


export default function AdminSendAlertPage() {
  const { toast } = useToast();
  const [isSending, setIsSending] = React.useState(false);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(true);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = React.useState(false);


  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      audienceType: "general",
      studentId: "",
      studentName: "",
      alertTitle: "",
      alertMessage: "",
      alertType: "info",
    },
  });

  const audienceType = form.watch("audienceType");

  React.useEffect(() => {
    async function fetchStudents() {
      try {
        const allStudents = await getAllStudents();
        const activeStudents = allStudents.filter(s => s.activityStatus === 'Active');
        setStudents(activeStudents);
      } catch (error) {
        toast({
          title: "Error Loading Students",
          description: "Could not fetch the student list.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingStudents(false);
      }
    }
    fetchStudents();
  }, [toast]);

  async function onSubmit(data: AlertFormValues) {
    setIsSending(true);
    try {
      if (data.audienceType === 'targeted' && data.studentId) {
        await sendAlertToStudent(data.studentId, data.alertTitle, data.alertMessage, data.alertType as AlertItem['type']);
        toast({
          title: `Targeted Alert Sent`,
          description: `"${data.alertTitle}" has been sent to student ${data.studentName} (${data.studentId}).`,
        });

      } else {
        await sendGeneralAlert(data.alertTitle, data.alertMessage, data.alertType as AlertItem['type']);
        toast({
          title: `General Alert Sent`,
          description: `"${data.alertTitle}" has been broadcasted to all members.`,
        });
      }
      form.reset({
        audienceType: "general",
        studentId: "",
        studentName: "",
        alertTitle: "",
        alertMessage: "",
        alertType: "info",
      });
    } catch (error) {
      toast({
        title: "Failed to Send Alert",
        description: "An error occurred while trying to send the alert. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to send alert:", error);
    } finally {
      setIsSending(false);
    }
  }
  
  const handleStudentSelect = (student: Student) => {
    form.setValue("studentId", student.studentId, { shouldValidate: true });
    form.setValue("studentName", student.name);
    // Manually trigger validation for the entire form to re-evaluate button state
    form.trigger();
  };


  return (
    <>
      <PageTitle title="Send Alert" description="Broadcast important messages or send a targeted announcement to a specific member." />
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Megaphone className="mr-2 h-5 w-5" />
             Compose Alert
          </CardTitle>
          <CardDescription>The message will be sent as a push notification and appear in the member's 'Alerts' tab.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              
              <FormField
                control={form.control}
                name="audienceType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Select Audience</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                        disabled={isSending}
                      >
                        <FormItem>
                           <RadioGroupItem value="general" id="r-general" className="peer sr-only" />
                           <Label
                            htmlFor="r-general"
                            className={cn(
                              "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            )}
                           >
                            <Users className="mr-2 h-4 w-4" />
                            General
                          </Label>
                        </FormItem>
                        <FormItem>
                           <RadioGroupItem value="targeted" id="r-targeted" className="peer sr-only" />
                           <Label
                            htmlFor="r-targeted"
                            className={cn(
                              "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            )}
                           >
                            <User className="mr-2 h-4 w-4" />
                            Targeted
                          </Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {audienceType === 'targeted' && (
                 <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Select Student</FormLabel>
                       <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" disabled={isSending || isLoadingStudents}>
                              {field.value ? `Selected: ${form.getValues("studentName")}` : "Select a Student"}
                            </Button>
                          </DialogTrigger>
                          <StudentSelectionDialog 
                            students={students}
                            onSelectStudent={handleStudentSelect}
                            isLoading={isLoadingStudents}
                            onClose={() => setIsStudentDialogOpen(false)}
                          />
                        </Dialog>
                      <FormMessage />
                    </FormItem>
                    )}
                />
              )}

              <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="alertTitle"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Alert Title</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Library Closure, Maintenance Update" {...field} disabled={isSending} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="alertType"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Alert Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSending}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select an alert type" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {alertTypeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center">
                                {React.cloneElement(option.icon, {className: "mr-2 h-4 w-4"})}
                                {option.label}
                                </div>
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="alertMessage"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Alert Message</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Type the full alert message here..."
                            className="min-h-[120px]"
                            {...field}
                            disabled={isSending}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>

            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSending || !form.formState.isValid}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSending ? "Sending..." : "Send Alert"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
