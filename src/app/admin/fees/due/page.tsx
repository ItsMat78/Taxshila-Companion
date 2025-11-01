
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarClock, CheckCircle2, Loader2, User, IndianRupee, Edit, UserCheck, Eye, UserX, RefreshCw, Info, Calendar as CalendarIcon, WalletMinimal, Armchair, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getStudentsWithFeesDue, getAllAttendanceRecords, refreshAllStudentFeeStatuses } from '@/services/student-service';
import type { Student, Shift } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface StudentWithLastAttended extends Student {
  lastAttended?: string; // ISO string
}

const getInitials = (name?: string) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
}

const getShiftColorClass = (shift: Shift | undefined) => {
  if (!shift) return 'bg-gray-100 text-gray-800 border-gray-300';
  switch (shift) {
    case 'morning': return 'bg-seat-morning text-seat-morning-foreground border-orange-300 dark:border-orange-700';
    case 'evening': return 'bg-seat-evening text-seat-evening-foreground border-purple-300 dark:border-purple-700';
    case 'fullday': return 'bg-seat-fullday text-seat-fullday-foreground border-yellow-300 dark:border-yellow-700';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};


const getFeeStatusBadge = (student: Student, type: "icon-only" | "full" = "full") => {
    const baseClasses = "text-xs px-1.5 py-0.5 border-transparent";
    if (type === "icon-only") {
        if(student.feeStatus === "Overdue") {
            return (
              <div className="h-6 w-6 rounded-full flex items-center justify-center bg-destructive/10" title="Overdue">
                  <CalendarClock className="h-4 w-4 text-destructive" />
              </div>
            );
        }
        if(student.feeStatus === "Due") {
             return (
              <div className="h-6 w-6 rounded-full flex items-center justify-center bg-yellow-400/10" title="Due">
                <CalendarClock className="h-4 w-4 text-yellow-500" />
              </div>
            );
        }
    }
    
    switch (student.feeStatus) {
      case 'Overdue':
        return <Badge variant="destructive" className={cn(baseClasses, "capitalize")}><CalendarClock className="mr-1 h-3 w-3" />{student.feeStatus}</Badge>;
      case 'Due':
        return <Badge style={{ backgroundColor: 'hsl(var(--status-due-bg))', color: 'hsl(var(--status-due-text))' }} className={cn(baseClasses, "capitalize")}>Due</Badge>;
       case 'Paid':
        return <Badge style={{ backgroundColor: 'hsl(var(--status-paid-bg))', color: 'hsl(var(--status-paid-text))' }} className={cn(baseClasses, "capitalize")}>Paid</Badge>;
      default:
        return <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5")}>{student.feeStatus}</Badge>;
    }
};

const DateBox = ({ date, label }: { date?: string; label: string }) => {
  const parsedDate = date && isValid(parseISO(date)) ? parseISO(date) : null;
  
  if (!parsedDate) {
    return (
      <div className="flex-1 text-center p-2 rounded-md bg-muted/50">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">N/A</div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 text-center p-2 rounded-md bg-muted/50">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{format(parsedDate, 'd')}</div>
      <div className="text-xs font-medium text-primary">{format(parsedDate, 'MMM')}</div>
    </div>
  );
};


const FeeDueCardItem = ({ student }: { student: StudentWithLastAttended }) => {
  return (
    <Card className={cn("w-full shadow-md", student.feeStatus === "Overdue" ? "bg-destructive/5 border-destructive/30" : "")}>
        <CardHeader className="p-3">
             <div className="flex justify-between items-center gap-2 w-full">
                <div className="flex items-center gap-3 min-w-0">
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="cursor-pointer relative group flex-shrink-0">
                                <Avatar className="h-12 w-12 border-2 border-primary/50 shadow-sm">
                                    <AvatarImage src={student.profilePictureUrl || undefined} alt={student.name} data-ai-hint="profile person"/>
                                    <AvatarFallback className="text-xl">{getInitials(student.name)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye className="text-white h-6 w-6"/>
                                </div>
                            </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-md w-auto p-2">
                            <Image
                                src={student.profilePictureUrl || "https://placehold.co/400x400.png"}
                                alt={`${student.name}'s profile picture`}
                                width={400}
                                height={400}
                                className="rounded-md object-contain max-h-[70vh] w-full h-auto"
                            />
                        </DialogContent>
                    </Dialog>
                    <div className="min-w-0 text-left">
                        <h4 className="text-md font-semibold break-words">{student.name}</h4>
                        {getFeeStatusBadge(student, 'icon-only')}
                    </div>
                </div>
                {student.seatNumber && (
                  <div
                    className={cn(
                      'h-7 w-7 flex items-center justify-center rounded-md border text-xs font-bold flex-shrink-0',
                      getShiftColorClass(student.shift)
                    )}
                    title={`${student.shift.charAt(0).toUpperCase() + student.shift.slice(1)} Shift, Seat ${student.seatNumber}`}
                  >
                    {student.seatNumber}
                  </div>
                )}
            </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-3">
             <div className="flex justify-around items-stretch gap-2">
                <DateBox date={student.lastPaymentDate} label="Last Paid" />
                <DateBox date={student.nextDueDate} label="Next Due" />
                <DateBox date={student.lastAttended} label="Last Seen" />
             </div>
        </CardContent>
         <CardFooter className="p-3 border-t flex justify-end gap-2">
            <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-2 h-3 w-3" /> View
                </Button>
            </Link>
            <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="mr-2 h-3 w-3" /> Edit
                </Button>
            </Link>
        </CardFooter>
    </Card>
  );
};

export default function FeesDuePage() {
  const { toast } = useToast();
  const [feesDueStudents, setFeesDueStudents] = React.useState<StudentWithLastAttended[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Manual refresh handler
  const handleManualRefresh = async () => {
      setIsRefreshing(true);
      try {
        const result = await refreshAllStudentFeeStatuses();
        toast({
          title: "Fee Statuses Refreshed",
          description: `${result.updatedCount} student(s) had their fee status updated.`,
        });
        await fetchFeesDue(); // Re-fetch the list after manual refresh
      } catch (error: any) {
        console.error("Failed to refresh fee statuses:", error);
        toast({ title: "Error", description: error.message || "Could not refresh fee statuses.", variant: "destructive" });
      } finally {
        setIsRefreshing(false);
      }
  };

  const fetchFeesDue = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [dueStudentsData, allAttendance] = await Promise.all([
        getStudentsWithFeesDue(),
        getAllAttendanceRecords(),
      ]);

      const lastAttendedMap = new Map<string, string>();
      allAttendance.forEach(record => {
        const existing = lastAttendedMap.get(record.studentId);
        if (!existing || new Date(record.checkInTime) > new Date(existing)) {
          lastAttendedMap.set(record.studentId, record.checkInTime);
        }
      });

      const dueStudents = dueStudentsData
        .map(student => ({
          ...student,
          lastAttended: lastAttendedMap.get(student.studentId)
        }));

      dueStudents.sort((a, b) => {
        const statusOrder = (status: Student['feeStatus']) => status === "Overdue" ? 0 : 1;
        if (statusOrder(a.feeStatus) !== statusOrder(b.feeStatus)) {
          return statusOrder(a.feeStatus) - statusOrder(b.feeStatus);
        }
        try {
          const dateA = a.nextDueDate && isValid(parseISO(a.nextDueDate)) ? parseISO(a.nextDueDate) : new Date(0);
          const dateB = b.nextDueDate && isValid(parseISO(b.nextDueDate)) ? parseISO(b.nextDueDate) : new Date(0);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          return 0;
        }
      });

      setFeesDueStudents(dueStudents);
    } catch (error) {
      console.error("Failed to fetch fees due:", error);
      toast({ title: "Error", description: "Could not load fees due list.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch data on initial load
  React.useEffect(() => {
    fetchFeesDue();
  }, [fetchFeesDue]);
  
  const overdueCount = feesDueStudents.filter(s => s.feeStatus === 'Overdue').length;
  const dueCount = feesDueStudents.filter(s => s.feeStatus === 'Due').length;

  return (
    <>
      <PageTitle title="Student Fees Due">
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline"><HelpCircle className="mr-2 h-4 w-4" />Fee Guide</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Fee Status Guide</DialogTitle>
                    <DialogDescription>A simple guide to understanding the fee statuses.</DialogDescription>
                </DialogHeader>
                 <ul className="space-y-4 pt-2 text-sm">
                    <li className="flex items-start gap-3">
                      <Badge style={{ backgroundColor: 'hsl(var(--status-paid-bg))', color: 'hsl(var(--status-paid-text))' }} className="border-transparent mt-1">Paid</Badge>
                      <span>Your fees are up to date. No action needed.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge style={{ backgroundColor: 'hsl(var(--status-due-bg))', color: 'hsl(var(--status-due-text))' }} className="border-transparent mt-1">Due</Badge>
                      <span>Your payment is due soon or has recently passed its due date. Please pay at the desk.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Badge variant="destructive" className="mt-1">Overdue</Badge>
                      <span>Your payment is more than 5 days late. Your ability to check-in at the library is now suspended until payment is made.</span>
                    </li>
                </ul>
            </DialogContent>
        </Dialog>
         <Button onClick={handleManualRefresh} variant="outline" disabled={isRefreshing || isLoading}>
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
                <p className="text-xs text-muted-foreground">students with overdue fees</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Due</CardTitle>
                <CalendarClock className="h-4 w-4 text-yellow-500"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{dueCount}</div>
                <p className="text-xs text-muted-foreground">students with fees due soon</p>
            </CardContent>
        </Card>
      </div>

      <Card className="mb-6 shadow-md border-border bg-card hover:shadow-lg hover:border-primary/30 transition-shadow">
        <Link href="/admin/students/potential-left" className="block no-underline">
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="min-w-0">
                    <CardTitle className="text-base flex items-center">
                        <UserX className="mr-2 h-5 w-5" />
                        Absent Students
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                        View active students who have been absent for over 5 days.
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm">View List</Button>
            </CardHeader>
        </Link>
      </Card>


      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <IndianRupee className="mr-2 h-5 w-5 text-primary" />
            Fees Due List ({feesDueStudents.length})
          </CardTitle>
          <CardDescription>Students are ordered by overdue status, then by due date.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading student fee data...</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
                {feesDueStudents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6 sm:col-span-2">
                     <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-500" />
                    No outstanding fees at the moment.
                  </div>
                ) : (
                  feesDueStudents.map((student) => (
                    <FeeDueCardItem key={student.studentId} student={student} />
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Last Payment</TableHead>
                      <TableHead>Next Due Date</TableHead>
                      <TableHead>Last Attended</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feesDueStudents.map((student) => (
                      <TableRow key={student.studentId} className={student.feeStatus === "Overdue" ? "bg-destructive/10 hover:bg-destructive/15" : "hover:bg-muted/30"}>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <div className="cursor-pointer relative group flex-shrink-0">
                                            <Avatar className="h-9 w-9 border">
                                                <AvatarImage src={student.profilePictureUrl || undefined} alt={student.name} data-ai-hint="profile person"/>
                                                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Eye className="text-white h-4 w-4"/>
                                            </div>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md w-auto p-2">
                                        <Image
                                            src={student.profilePictureUrl || "https://placehold.co/400x400.png"}
                                            alt={`${student.name}'s profile picture`}
                                            width={400}
                                            height={400}
                                            className="rounded-md object-contain max-h-[70vh] w-full h-auto"
                                        />
                                    </DialogContent>
                                </Dialog>
                                <div>
                                    {student.name}
                                    <span className="block text-xs text-muted-foreground">{student.studentId}</span>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {student.lastPaymentDate && isValid(parseISO(student.lastPaymentDate))
                            ? format(parseISO(student.lastPaymentDate), 'MMM d, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {student.nextDueDate && isValid(parseISO(student.nextDueDate))
                            ? format(parseISO(student.nextDueDate), 'MMM d, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                           {student.lastAttended && isValid(parseISO(student.lastAttended))
                            ? format(parseISO(student.lastAttended), 'MMM d, yyyy')
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          {getFeeStatusBadge(student)}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                            <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                                <Button variant="outline" size="sm">
                                    <Eye className="mr-1 h-3 w-3" /> View
                                </Button>
                            </Link>
                            <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                                <Button variant="outline" size="sm">
                                    <Edit className="mr-1 h-3 w-3" /> Edit
                                </Button>
                            </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                    {feesDueStudents.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-500" />
                          No outstanding fees at the moment.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
