
"use client";

import * as React from 'react';
import NextImage from 'next/image';
import { PageTitle } from '@/components/shared/page-title';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getStudentByCustomId, updateProfilePicture, getAttendanceForDate } from '@/services/student-service'; 
import type { Student, PaymentRecord, AttendanceRecord } from '@/types/student'; 
import { UserCircle, UploadCloud, Save, Mail, Phone, BookOpen, MapPin, Receipt, Loader2, Camera, View, Video, VideoOff, History, Download, Briefcase, BadgeIndianRupee, LogIn, LogOut, Clock, CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from '@/lib/utils';
import { Calendar } from "@/components/ui/calendar";


const DEFAULT_PROFILE_PLACEHOLDER = "https://placehold.co/200x200.png";
const MAX_IMAGE_DIMENSION = 500;

// Helper to resize images
const resizeImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > height) {
                if (width > MAX_IMAGE_DIMENSION) {
                    height *= MAX_IMAGE_DIMENSION / width;
                    width = MAX_IMAGE_DIMENSION;
                }
            } else {
                if (height > MAX_IMAGE_DIMENSION) {
                    width *= MAX_IMAGE_DIMENSION / height;
                    height = MAX_IMAGE_DIMENSION;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context'));
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

// Helper to format names
const getInitials = (name?: string) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
}

// DateBox component from admin profile
const DateBox = ({ date, label }: { date?: string; label: string }) => {
  const parsedDate = date && isValid(parseISO(date)) ? parseISO(date) : null;
  if (!parsedDate) {
    return (
      <div className="flex-1 text-center p-2 rounded-md bg-muted/50 min-w-[70px]">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">N/A</div>
      </div>
    );
  }
  return (
    <div className="flex-1 text-center p-2 rounded-md bg-muted/50 min-w-[70px]">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{format(parsedDate, 'd')}</div>
      <div className="text-xs font-medium text-primary">{format(parsedDate, 'MMM')}</div>
    </div>
  );
};

// Payment history card for mobile from admin profile
const PaymentHistoryCardItem = ({ payment }: { payment: PaymentRecord }) => (
  <div className="p-3 border rounded-md bg-muted/30 shadow-sm">
    <div className="flex justify-between items-start mb-1">
      <div className="font-medium text-sm">{payment.amount}</div>
      <Badge variant="outline" className="text-xs capitalize">{payment.method}</Badge>
    </div>
    <div className="text-xs text-muted-foreground space-y-1">
      <p>Date: {payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'dd-MMM-yy') : 'N/A'}</p>
      <p>Transaction ID: {payment.transactionId}</p>
    </div>
    <div className="mt-2">
      <Button variant="outline" size="sm" disabled className="w-full">
        <Download className="mr-1 h-3 w-3" /> Invoice
      </Button>
    </div>
  </div>
);

export default function MemberProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [memberDetails, setMemberDetails] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingPicture, setIsSavingPicture] = React.useState(false);

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [isCameraDialogOpen, setIsCameraDialogOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const [showPaymentHistory, setShowPaymentHistory] = React.useState(false);
  const [showAttendance, setShowAttendance] = React.useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = React.useState<Date | undefined>(new Date());
  const [dailyAttendanceRecords, setDailyAttendanceRecords] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDailyAttendance, setIsLoadingDailyAttendance] = React.useState(false);


  React.useEffect(() => {
    setIsLoading(true);
    const fetchStudent = async () => {
      try {
        let student = null;
        if (user?.studentId) student = await getStudentByCustomId(user.studentId);
        else if (user?.email) student = await getStudentByEmail(user.email);

        if (student) {
          setMemberDetails(student);
          setPreviewUrl(student.profilePictureUrl || null);
        } else {
          toast({ title: "Error", description: "Could not load your profile data.", variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Error", description: "An error occurred while loading your profile.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    if (user) fetchStudent();
  }, [user, toast]);
  
  React.useEffect(() => {
    if (memberDetails?.studentId && selectedCalendarDate && showAttendance) {
      const fetchDailyData = async () => {
        setIsLoadingDailyAttendance(true);
        setDailyAttendanceRecords([]);
        try {
          const records = await getAttendanceForDate(memberDetails.studentId, format(selectedCalendarDate, 'yyyy-MM-dd'));
          setDailyAttendanceRecords(records.sort((a,b) => parseISO(a.checkInTime).getTime() - parseISO(b.checkInTime).getTime()));
        } catch (error) {
          console.error("Failed to fetch daily attendance records:", error);
          toast({ title: "Error", description: "Could not load attendance for selected date.", variant: "destructive" });
          setDailyAttendanceRecords([]);
        } finally {
          setIsLoadingDailyAttendance(false);
        }
      };
      fetchDailyData();
    }
  }, [memberDetails, selectedCalendarDate, showAttendance, toast]);


  React.useEffect(() => {
    let stream: MediaStream | null = null;
    const videoElem = videoRef.current;
    if (isCameraDialogOpen) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          stream = s;
          setHasCameraPermission(true);
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(error => {
          setHasCameraPermission(false);
          toast({ variant: "destructive", title: "Camera Access Denied"});
          setIsCameraDialogOpen(false);
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (videoElem) videoElem.srcObject = null;
    };
  }, [isCameraDialogOpen, toast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        let { videoWidth: width, videoHeight: height } = video;
        if (width > MAX_IMAGE_DIMENSION) { height *= MAX_IMAGE_DIMENSION / width; width = MAX_IMAGE_DIMENSION; } 
        else if (height > MAX_IMAGE_DIMENSION) { width *= MAX_IMAGE_DIMENSION / height; height = MAX_IMAGE_DIMENSION; }
        canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setPreviewUrl(dataUrl);
        }
        setIsCameraDialogOpen(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const resizedBase64 = await resizeImage(file);
        setPreviewUrl(resizedBase64);
      } catch(error) {
        toast({ title: "Image Processing Error", description: "Could not process image.", variant: "destructive" });
      }
    }
  };

  const handleSaveProfilePicture = async () => {
    if (!previewUrl || !previewUrl.startsWith('data:image') || !memberDetails || !memberDetails.firestoreId) {
      toast({ title: "No New Picture", description: "Please select a new picture to save.", variant: "destructive" });
      return;
    }
    setIsSavingPicture(true);
    try {
      const newUrl = await updateProfilePicture(memberDetails.firestoreId, 'member', previewUrl);
      setMemberDetails(prev => prev ? { ...prev, profilePictureUrl: newUrl } : null);
      setPreviewUrl(newUrl);
      updateUser({ profilePictureUrl: newUrl });
      toast({ title: "Success", description: "Your profile picture has been updated." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message || "Could not save your new picture.", variant: "destructive" });
    } finally {
      setIsSavingPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <>
        <PageTitle title="My Profile" description="Loading your details..." />
        <div className="flex justify-center items-center py-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      </>
    );
  }

  if (!memberDetails) {
     return (
      <>
        <PageTitle title="My Profile" description="Could not load your profile information." />
        <Card className="shadow-md"><CardContent className="pt-6 text-center text-muted-foreground">Please try again later or contact support.</CardContent></Card>
      </>
    );
  }

  const displayName = memberDetails.name || user?.email?.split('@')[0] || "Member";
  const hasUnsavedChanges = previewUrl && previewUrl !== memberDetails.profilePictureUrl;

  const getFeeStatusBadge = (studentData: Student) => {
    if (studentData.activityStatus === 'Left') return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">N/A (Left)</Badge>;
    switch (studentData.feeStatus) {
      case 'Overdue': return <Badge variant="destructive">Overdue</Badge>;
      case 'Due': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Due</Badge>;
      case 'Paid': return <Badge className="bg-green-100 text-green-700 border-green-300">Paid</Badge>;
      default: return <Badge variant="outline">{studentData.feeStatus}</Badge>;
    }
  };
  
  const getShiftColorClass = (shift: Student['shift'] | undefined) => {
    if (!shift) return 'bg-gray-100 text-gray-800 border-gray-300';
    switch (shift) {
      case 'morning': return 'bg-seat-morning text-seat-morning-foreground border-orange-300 dark:border-orange-700';
      case 'evening': return 'bg-seat-evening text-seat-evening-foreground border-purple-300 dark:border-purple-700';
      case 'fullday': return 'bg-seat-fullday text-seat-fullday-foreground border-yellow-300 dark:border-yellow-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <>
      <PageTitle title="My Profile" description="View and manage your details." />
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center gap-4">
                 <Dialog>
                    <DialogTrigger asChild>
                        <div className="cursor-pointer relative group flex-shrink-0">
                            <Avatar className="h-20 w-20 border-2 border-primary shadow-md">
                                <AvatarImage src={memberDetails.profilePictureUrl || undefined} alt={memberDetails.name} data-ai-hint="profile person"/>
                                <AvatarFallback className="text-3xl">{getInitials(memberDetails.name)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <View className="text-white h-8 w-8"/>
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-md w-auto p-2">
                        <NextImage src={memberDetails.profilePictureUrl || DEFAULT_PROFILE_PLACEHOLDER} alt="Profile Picture Full View" width={500} height={500} className="rounded-md object-contain max-h-[80vh] w-full h-auto" />
                    </DialogContent>
                </Dialog>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl break-words">{displayName}</CardTitle>
                  <CardDescription className="break-words">ID: {memberDetails.studentId}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm">
                <div className="flex items-start"><Mail className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Email</p><p className="font-medium break-words">{memberDetails.email || 'N/A'}</p></div></div>
                 <div className="flex items-start"><Phone className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium break-words">{memberDetails.phone}</p></div></div>
                <div className="flex items-center"><Briefcase className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0" /><div className="min-w-0 flex items-center gap-2"><p className="font-medium capitalize">{memberDetails.shift}</p><div className={cn("flex items-center justify-center h-8 w-8 text-sm rounded-md border-2 font-bold", getShiftColorClass(memberDetails.shift))}>{memberDetails.seatNumber || 'N/A'}</div></div></div>
                 <div className="flex items-start"><BadgeIndianRupee className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Fee Status</p><div className="font-medium">{getFeeStatusBadge(memberDetails)}</div></div></div>
                <div className="flex items-start"><UserCircle className="mr-3 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" /><div className="min-w-0"><p className="text-xs text-muted-foreground">Activity Status</p><Badge variant={memberDetails.activityStatus === "Active" ? "default" : "secondary"} className={cn("font-medium", memberDetails.activityStatus === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700")}>{memberDetails.activityStatus}</Badge></div></div>
                <div className="pt-2 border-t mt-4 flex flex-wrap gap-2"><DateBox date={memberDetails.registrationDate} label="Registered" /><DateBox date={memberDetails.lastPaymentDate} label="Last Paid" />{memberDetails.activityStatus === 'Left' ? (<DateBox date={memberDetails.leftDate} label="Date Left" />) : (<DateBox date={memberDetails.nextDueDate} label="Next Due" />)}</div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Update Profile Picture</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid w-full items-center gap-1.5">
                        <label htmlFor="picture" className="text-sm font-medium">Select File</label>
                        <input id="picture" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} disabled={isSavingPicture} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                    </div>
                     <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                        <DialogTrigger asChild><Button type="button" variant="outline" className="w-full" disabled={isSavingPicture}><Camera className="mr-2 h-4 w-4" /> Use Camera</Button></DialogTrigger>
                        <DialogContent><DialogHeader><DialogTitle>Capture Photo</DialogTitle></DialogHeader><div className="py-4"><video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />{!hasCameraPermission && (<Alert variant="destructive" className="mt-2"><AlertTitle>Camera Access Required</AlertTitle><AlertDescription>Please allow camera access.</AlertDescription></Alert>)}<canvas ref={canvasRef} className="hidden" /></div><DialogFooter><Button type="button" onClick={handleCapture} disabled={!hasCameraPermission}><Camera className="mr-2 h-4 w-4" /> Capture</Button></DialogFooter></DialogContent>
                    </Dialog>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveProfilePicture} disabled={isSavingPicture || !hasUnsavedChanges} className="w-full">
                        {isSavingPicture ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : <><Save className="mr-2 h-4 w-4"/>Save Picture</>}
                    </Button>
                </CardFooter>
            </Card>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center"><History className="mr-2 h-5 w-5" />Payment History</CardTitle>
                    <CardDescription>Record of all past payments.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!showPaymentHistory ? (
                        <div className="text-center py-6">
                            <Button onClick={() => setShowPaymentHistory(true)}>Show Payment History</Button>
                        </div>
                    ) : (memberDetails.paymentHistory && memberDetails.paymentHistory.length > 0) ? (
                        <>
                            <div className="md:hidden space-y-3 max-h-80 overflow-y-auto">
                            {memberDetails.paymentHistory.slice().reverse().map((payment: PaymentRecord) => (
                                <PaymentHistoryCardItem key={payment.paymentId} payment={payment} />
                            ))}
                            </div>
                            <div className="hidden md:block max-h-80 w-full overflow-y-auto overflow-x-auto">
                            <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Transaction ID</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                                <TableBody>
                                {memberDetails.paymentHistory.slice().reverse().map((payment: PaymentRecord) => (
                                    <TableRow key={payment.paymentId}>
                                    <TableCell className="whitespace-nowrap">{payment.date && isValid(parseISO(payment.date)) ? format(parseISO(payment.date), 'dd-MMM-yy') : 'N/A'}</TableCell>
                                    <TableCell className="whitespace-nowrap">{payment.amount}</TableCell>
                                    <TableCell className="capitalize whitespace-nowrap">{payment.method}</TableCell>
                                    <TableCell className="whitespace-nowrap">{payment.transactionId}</TableCell>
                                    <TableCell className="whitespace-nowrap"><Button variant="outline" size="sm" disabled><Download className="mr-1 h-3 w-3" /> Invoice</Button></TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                            </div>
                        </>
                    ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">No payment history found.</p>
                    )}
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5" />Attendance Overview</CardTitle>
                    <CardDescription>Select a date to view your check-in and check-out times.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!showAttendance ? (
                        <div className="text-center py-6">
                            <Button onClick={() => setShowAttendance(true)}>Show Attendance</Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-stretch gap-6 md:flex-row md:items-start">
                            <div className="w-full flex justify-center md:w-auto">
                                <Calendar
                                    mode="single"
                                    selected={selectedCalendarDate}
                                    onSelect={setSelectedCalendarDate}
                                    className="rounded-md border shadow-inner min-w-[280px] sm:min-w-[320px]"
                                />
                            </div>
                            <div className="w-full md:flex-1">
                                <h4 className="text-md font-semibold mb-2">
                                    Details for {selectedCalendarDate ? format(selectedCalendarDate, 'PPP') : 'selected date'}:
                                </h4>
                                {isLoadingDailyAttendance ? (
                                    <div className="flex items-center justify-center text-muted-foreground py-4">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading details...
                                    </div>
                                ) : dailyAttendanceRecords.length === 0 ? (
                                    <p className="text-muted-foreground py-4">No attendance records found for this day.</p>
                                ) : (
                                    <ul className="space-y-3 max-h-80 overflow-y-auto">
                                    {dailyAttendanceRecords.map(record => (
                                        <li key={record.recordId} className="p-3 border rounded-md bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                            <LogIn className="mr-2 h-4 w-4 text-green-600" />
                                            <span className="font-medium">Checked In:</span>
                                            </div>
                                            <span className="text-sm">
                                            {record.checkInTime && isValid(parseISO(record.checkInTime)) ? format(parseISO(record.checkInTime), 'p') : 'N/A'}
                                            </span>
                                        </div>
                                        {record.checkOutTime ? (
                                            <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center">
                                                <LogOut className="mr-2 h-4 w-4 text-red-600" />
                                                <span className="font-medium">Checked Out:</span>
                                            </div>
                                            <span className="text-sm">
                                                {isValid(parseISO(record.checkOutTime)) ? format(parseISO(record.checkOutTime), 'p') : 'N/A'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center">
                                                <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                                                <span className="font-medium">Status:</span>
                                            </div>
                                            <span className="text-sm text-yellow-600">Currently Checked In</span>
                                            </div>
                                        )}
                                        </li>
                                    ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </>
  );
}

    