
"use client";

import * as React from 'react';
import { isReviewerUser } from '@/lib/auth-utils';
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
import { Send, Megaphone, Info, AlertTriangle, Loader2, User, Users, X, CheckCircle2, XCircle, Smartphone, Globe, BellRing } from 'lucide-react';
import { sendAlertToStudent, getAllStudents } from '@/services/student-service';
import type { AlertItem, NotificationResult } from '@/types/communication';
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
import { useSearchParams } from 'next/navigation';


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
              <Loader2 role="status" aria-label="Loading" className="h-8 w-8 animate-spin" />
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


// --- Delivery summary ---------------------------------------------------------
type MemberRow = { studentId: string; name: string; result: NotificationResult | null };
type SendSummary =
  | { mode: 'general'; title: string; result: NotificationResult | null; memberCount: number; perMember?: MemberRow[] }
  | { mode: 'targeted'; title: string; deliveries: MemberRow[] };

/** Collapses a raw NotificationResult into the few numbers the UI cares about. */
function summarize(r: NotificationResult | null) {
  if (!r) {
    return { delivered: 0, failed: 0, devices: 0, confirmed: false, app: { sent: 0, failed: 0 }, web: { sent: 0, failed: 0 } };
  }
  return {
    delivered: r.fcm.sent + r.oneSignal.sent,
    failed: r.fcm.failed + r.oneSignal.failed,
    devices: r.recipients,
    confirmed: true,
    app: r.oneSignal, // OneSignal == native app push
    web: r.fcm,       // FCM == browser / PWA web push
  };
}

function MemberDeliveryBadge({ result }: { result: NotificationResult | null }) {
  const s = summarize(result);
  if (!s.confirmed) return <Badge variant="outline" className="text-muted-foreground">Unconfirmed</Badge>;
  if (s.devices === 0) return <Badge variant="outline" className="text-muted-foreground">No devices</Badge>;
  if (s.delivered === 0) return <Badge variant="destructive">Failed</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-600 text-white">Delivered</Badge>;
}

function StatBlock({ label, value, tone }: { label: string; value: number; tone: 'good' | 'bad' | 'muted' }) {
  const color = tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-destructive' : 'text-muted-foreground';
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-center">
      <div className={cn('text-2xl font-bold tabular-nums', color)}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function DeliverySummaryCard({ summary, onDismiss }: { summary: SendSummary; onDismiss: () => void }) {
  const results = summary.mode === 'general' ? [summary.result] : summary.deliveries.map(d => d.result);

  const agg = results.reduce(
    (acc, r) => {
      const s = summarize(r);
      return {
        delivered: acc.delivered + s.delivered,
        failed: acc.failed + s.failed,
        devices: acc.devices + s.devices,
        appSent: acc.appSent + s.app.sent,
        appFailed: acc.appFailed + s.app.failed,
        webSent: acc.webSent + s.web.sent,
        webFailed: acc.webFailed + s.web.failed,
        anyConfirmed: acc.anyConfirmed || s.confirmed,
      };
    },
    { delivered: 0, failed: 0, devices: 0, appSent: 0, appFailed: 0, webSent: 0, webFailed: 0, anyConfirmed: false }
  );

  // Per-member rows: explicit for targeted, server-provided for general broadcasts.
  const memberRows: MemberRow[] = summary.mode === 'targeted' ? summary.deliveries : (summary.perMember ?? []);
  const reachedMembers = memberRows.length > 0
    ? memberRows.filter(d => summarize(d.result).delivered > 0).length
    : null;

  return (
    <Card className="w-full md:max-w-2xl mx-auto mt-6 shadow-lg border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center">
              <BellRing className="mr-2 h-5 w-5" />
              Delivery Summary
            </CardTitle>
            <CardDescription className="mt-1">
              {summary.mode === 'general'
                ? <>&ldquo;{summary.title}&rdquo; was broadcast to {summary.memberCount} active member(s){reachedMembers !== null ? ` — reached ${reachedMembers}.` : '.'}</>
                : <>&ldquo;{summary.title}&rdquo; was sent to {summary.deliveries.length} member(s){reachedMembers !== null ? ` — reached ${reachedMembers}.` : '.'}</>}
            </CardDescription>
          </div>
          <Button size="icon" variant="ghost" onClick={onDismiss} aria-label="Dismiss summary">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!agg.anyConfirmed && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-600 shrink-0" />
            <span>Delivery could not be confirmed by the push service. The alert was still saved and will appear in members&apos; Alerts tab.</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <StatBlock label="Devices reached" value={agg.delivered} tone="good" />
          <StatBlock label="Failed" value={agg.failed} tone="bad" />
          <StatBlock label="Total devices" value={agg.devices} tone="muted" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border p-2.5 text-sm">
            <span className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-muted-foreground" /> App push (OneSignal)</span>
            <span className="tabular-nums">
              <span className="text-green-600 font-medium">{agg.appSent}</span> delivered
              <span className="text-muted-foreground"> · </span>
              <span className="text-destructive font-medium">{agg.appFailed}</span> failed
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md border p-2.5 text-sm">
            <span className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /> Web push (FCM)</span>
            <span className="tabular-nums">
              <span className="text-green-600 font-medium">{agg.webSent}</span> delivered
              <span className="text-muted-foreground"> · </span>
              <span className="text-destructive font-medium">{agg.webFailed}</span> failed
            </span>
          </div>
        </div>

        {memberRows.length > 0 && (
          <div className="border rounded-md max-h-72 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Devices</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.map((d) => {
                  const s = summarize(d.result);
                  return (
                    <TableRow key={d.studentId}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell><MemberDeliveryBadge result={d.result} /></TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {s.confirmed ? `${s.delivered}/${s.devices}` : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {agg.delivered > 0
            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            : <XCircle className="h-3.5 w-3.5 text-destructive" />}
          Counts are push devices, not members — a member may have several devices, and members with notifications off show as &ldquo;No devices&rdquo;.
        </p>
      </CardContent>
    </Card>
  );
}

function AdminSendAlertContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = React.useState(false);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = React.useState<Student[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(true);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = React.useState(false);
  const [sendSummary, setSendSummary] = React.useState<SendSummary | null>(null);

  const isReviewer = isReviewerUser(user?.email);

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

  // Read query params to pre-fill the form (e.g., from Fee Dues page "Send Alert to All")
  const searchParams = useSearchParams();
  React.useEffect(() => {
    const audience = searchParams.get('audience');
    const studentIdsParam = searchParams.get('studentIds');
    const titleParam = searchParams.get('title');
    const messageParam = searchParams.get('message');
    const typeParam = searchParams.get('type');

    if (audience === 'targeted' && studentIdsParam && students.length > 0) {
      const ids = studentIdsParam.split(',').filter(Boolean);
      const matched = students.filter(s => ids.includes(s.studentId));
      
      if (matched.length > 0) {
        form.setValue('audienceType', 'targeted');
        setSelectedStudents(matched);
        form.setValue('studentIds', matched.map(s => s.studentId), { shouldValidate: true });
      }
    }

    if (titleParam) {
      form.setValue('alertTitle', titleParam);
    }
    if (messageParam) {
      form.setValue('alertMessage', messageParam);
    }
    if (typeParam && ['info', 'warning', 'closure'].includes(typeParam)) {
      form.setValue('alertType', typeParam as AlertFormValues['alertType']);
    }

    if (audience || titleParam || messageParam || typeParam) {
      form.trigger();
    }
  }, [searchParams, students, form]);

  const handleReviewerSubmit = () => {
    toast({
      title: "Simulated Success!",
      description: "As a reviewer, this action is simulated and no alert was actually sent.",
    });
  };

  async function onSubmit(data: AlertFormValues) {
    setIsSending(true);
    setSendSummary(null);
    try {
      if (data.audienceType === 'targeted' && data.studentIds && data.studentIds.length > 0) {

        // Capture the name now, before we clear the selection below.
        const idToName = new Map(selectedStudents.map(s => [s.studentId, s.name]));

        const deliveries: MemberRow[] = await Promise.all(
          data.studentIds.map(async (studentId) => {
            const res = await sendAlertToStudent(studentId, data.alertTitle, data.alertMessage, data.alertType as AlertItem['type']);
            return { studentId, name: idToName.get(studentId) ?? studentId, result: res.deliveryResult ?? null };
          })
        );

        setSendSummary({ mode: 'targeted', title: data.alertTitle, deliveries });

        toast({
          title: `Targeted Alert Sent`,
          description: `"${data.alertTitle}" was sent to ${data.studentIds.length} member(s). See the delivery summary below.`,
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
        const res = await sendAlertToStudent('__GENERAL__', data.alertTitle, data.alertMessage, data.alertType as AlertItem['type']);

        setSendSummary({
          mode: 'general',
          title: data.alertTitle,
          result: res.deliveryResult ?? null,
          memberCount: students.length,
          perMember: res.deliveryResult?.perMember ?? undefined,
        });

        toast({
          title: `General Alert Sent`,
          description: `"${data.alertTitle}" was broadcast to all members. See the delivery summary below.`,
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
          <CardDescription>The message will be sent as a push notification and appear in the member&apos;s &apos;Alerts&apos; tab.</CardDescription>
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
                        value={field.value}
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSending}>
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
                  {isSending ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isSending ? "Sending..." : "Send Alert"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>

      {sendSummary && (
        <DeliverySummaryCard summary={sendSummary} onDismiss={() => setSendSummary(null)} />
      )}
    </>
  );
}

export default function AdminSendAlertPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AdminSendAlertContent />
    </React.Suspense>
  );
}
