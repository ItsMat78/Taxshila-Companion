
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
import { Send, Megaphone, Info, AlertTriangle, Loader2, User, Users, X } from 'lucide-react';
import { sendAlertToStudent, getAllStudents } from '@/services/student-service';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';


const alertFormSchema = z.object({
  audienceType: z.enum(["general", "targeted"], { required_error: "Please select an audience." }),
  studentIds: z.array(z.string()).optional(),
  alertTitle: z.string().min(5, { message: "Title must be at least 5 characters." }).max(100, {message: "Title must not exceed 100 characters."}),
  alertMessage: z.string().min(10, { message: "Message must be at least 10 characters." }).max(500, {message: "Message must not exceed 500 characters."}),
  alertType: z.enum(["info", "warning", "closure"], { required_error: "Alert type is required."}),
}).refine(data => {
    if (data.audienceType === 'targeted') {
        return !!data.studentIds && data.studentIds.length > 0;
    }
    return true;
}, {
    message: "At least one student must be selected for targeted alerts.",
    path: ["studentIds"],
});


type AlertFormValues = z.infer<typeof alertFormSchema>;

const alertTypeOptions = [
  { value: "info" as AlertItem['type'], label: "General Info / Update", icon: <Info className="mr-2 h-4 w-4" /> },
  { value: "warning" as AlertItem['type'], label: "Warning / Maintenance", icon: <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" /> },
  { value: "closure" as AlertItem['type'], label: "Closure / Important Notice", icon: <Info className="mr-2 h-4 w-4 text-blue-500" /> },
];

interface StudentSelectionDialogProps {
  students: Student[];
  onSelectStudents: (selectedStudents: Student[]) => void;
  isLoading: boolean;
  onClose: () => void;
  initiallySelectedStudents: Student[];
}

function StudentSelectionDialog({ students, onSelectStudents, isLoading, onClose, initiallySelectedStudents }: StudentSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedStudents, setSelectedStudents] = React.useState<Student[]>(initiallySelectedStudents);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleStudentToggle = (student: Student) => {
    setSelectedStudents(prev => {
        const isSelected = prev.some(s => s.studentId === student.studentId);
        if (isSelected) {
            return prev.filter(s => s.studentId !== student.studentId);
        } else {
            return [...prev, student];
        }
    });
  }

  const handleConfirmSelection = () => {
    onSelectStudents(selectedStudents);
    onClose();
  }

  return (
    <DialogContent className="sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Select Students</DialogTitle>
        <DialogDescription>Search for students and check the box to add them to the recipient list.</DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Input
          placeholder="Search students by name or ID..."
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
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                  <TableRow key={student.studentId}
                    data-state={selectedStudents.some(s => s.studentId === student.studentId) ? "selected" : ""}
                    onClick={() => handleStudentToggle(student)}
                    className="cursor-pointer"
                  >
                     <TableCell className="p-2">
                        <Checkbox
                            checked={selectedStudents.some(s => s.studentId === student.studentId)}
                            onCheckedChange={() => handleStudentToggle(student)}
                        />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.studentId}</TableCell>
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
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirmSelection}>
            Confirm ({selectedStudents.length})
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}


export default function AdminSendAlertPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = React.useState(false);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = React.useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(true);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = React.useState(false);

  const isReviewer = user?.email === 'guest-admin@taxshila-auth.com';

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertFormSchema),
    defaultValues: {
      audienceType: "general",
      studentIds: [],
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

  const handleReviewerSubmit = () => {
    toast({
      title: "Simulated Success!",
      description: "As a reviewer, this action is simulated and no alert was actually sent.",
    });
  };

  async function onSubmit(data: AlertFormValues) {
    setIsSending(true);
    try {
      if (data.audienceType === 'targeted' && data.studentIds && data.studentIds.length > 0) {
        
        await Promise.all(
          data.studentIds.map(studentId => 
            sendAlertToStudent(studentId, data.alertTitle, data.alertMessage, data.alertType as AlertItem['type'])
          )
        );

        toast({
          title: `Targeted Alert Sent`,
          description: `"${data.alertTitle}" has been sent to ${data.studentIds.length} student(s).`,
        });

         form.reset({
            audienceType: "targeted", // Keep on targeted view
            studentIds: [],
            alertTitle: "",
            alertMessage: "",
            alertType: "info",
        });
        setSelectedStudents([]);


      } else {
        await sendAlertToStudent('__GENERAL__', data.alertTitle, data.alertMessage, data.alertType as AlertItem['type']);
        toast({
          title: `General Alert Sent`,
          description: `"${data.alertTitle}" has been broadcasted to all members.`,
        });
        form.reset({
            audienceType: "general",
            studentIds: [],
            alertTitle: "",
            alertMessage: "",
            alertType: "info",
        });
        setSelectedStudents([]);
      }
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
  
  const handleStudentsSelect = (newSelectedStudents: Student[]) => {
    setSelectedStudents(newSelectedStudents);
    const studentIds = newSelectedStudents.map(s => s.studentId);
    form.setValue("studentIds", studentIds, { shouldValidate: true });
    form.trigger();
  };
  
  const handleRemoveStudent = (studentId: string) => {
    const newSelectedStudents = selectedStudents.filter(s => s.studentId !== studentId);
    handleStudentsSelect(newSelectedStudents);
  };


  return (
    <>
      <PageTitle title="Send Alert" description="Broadcast important messages or send a targeted announcement to specific members." />
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
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("studentIds", []); // Clear selection on switch
                            setSelectedStudents([]);
                        }}
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
                    name="studentIds"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Select Students ({selectedStudents.length})</FormLabel>
                       <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" disabled={isSending || isLoadingStudents}>
                              {selectedStudents.length > 0 ? `${selectedStudents.length} student(s) selected` : "Select Students"}
                            </Button>
                          </DialogTrigger>
                          <StudentSelectionDialog 
                            students={students}
                            onSelectStudents={handleStudentsSelect}
                            isLoading={isLoadingStudents}
                            onClose={() => setIsStudentDialogOpen(false)}
                            initiallySelectedStudents={selectedStudents}
                          />
                        </Dialog>
                        {selectedStudents.length > 0 && (
                            <div className="p-2 border rounded-md max-h-32 overflow-y-auto space-y-1">
                                {selectedStudents.map(s => (
                                    <Badge key={s.studentId} variant="secondary" className="mr-1">
                                        {s.name}
                                        <button type="button" onClick={() => handleRemoveStudent(s.studentId)} className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
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
              {isReviewer ? (
                <Button type="button" onClick={handleReviewerSubmit} className="w-full sm:w-auto">
                  <Send className="mr-2 h-4 w-4" />
                  Send Alert (For Reviewer)
                </Button>
              ) : (
                <Button type="submit" className="w-full sm:w-auto" disabled={isSending || !form.formState.isValid}>
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSending ? "Sending..." : "Send Alert"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
