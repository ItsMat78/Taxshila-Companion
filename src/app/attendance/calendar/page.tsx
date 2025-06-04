
"use client";

import * as React from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/page-title';
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, Loader2, XCircle, UserCheck, List } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Placeholder type for student data - ensure this matches the registration form structure
type StudentData = {
  studentId: string;
  name: string;
  email: string;
  phone?: string;
  shift: "morning" | "evening" | "fullday";
  seatNumber?: string;
};

// Placeholder data for existing students - this would come from an API or state management in a real app
const placeholderStudents: StudentData[] = [
  { studentId: "TS001", name: "Aarav Sharma", email: "aarav.sharma@example.com", phone: "9876543210", shift: "morning", seatNumber: "A101" },
  { studentId: "TS002", name: "Priya Patel", email: "priya.patel@example.com", phone: "9876543211", shift: "evening", seatNumber: "B203" },
  { studentId: "TS003", name: "Rohan Mehta", email: "rohan.mehta@example.com", phone: "9876543212", shift: "fullday", seatNumber: "C007" },
];


export default function AttendanceCalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isProcessingQr, setIsProcessingQr] = React.useState(false);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<StudentData | null>(null);

  React.useEffect(() => {
    const getCameraPermission = async () => {
      if (isScannerOpen && user?.role === 'member') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
          setIsScannerOpen(false); 
        }
      } else {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    getCameraPermission();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScannerOpen, toast, user?.role]);

  const handleScanButtonClick = () => {
    setIsScannerOpen(true);
    setHasCameraPermission(null); 
  };

  const handleCancelScan = () => {
    setIsScannerOpen(false);
  };

  const simulateQrScan = async () => {
    setIsProcessingQr(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessingQr(false);
    setIsScannerOpen(false);
    toast({
      title: "Attendance Marked!",
      description: `${user?.email || 'Your'} attendance has been recorded at ${new Date().toLocaleTimeString()}.`,
    });
  };

  const handleStudentSelect = (student: StudentData) => {
    setSelectedStudent(student);
    setDate(new Date()); // Reset date for the new student's calendar view
  };

  return (
    <>
      <PageTitle 
        title={user?.role === 'admin' ? "Student Attendance Overview" : "Attendance Calendar"}
        description={user?.role === 'admin' ? "Select a student to view their attendance calendar." : "View your attendance and mark your presence."} 
      />
      
      {user?.role === 'member' && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
              <CardDescription>Scan the QR code at your desk to check-in or check-out.</CardDescription>
            </CardHeader>
            <CardContent>
              {!isScannerOpen ? (
                <Button onClick={handleScanButtonClick} className="w-full sm:w-auto">
                  <Camera className="mr-2 h-4 w-4" />
                  Scan QR Code for Check-in/Check-out
                </Button>
              ) : (
                <div className="space-y-4">
                  {hasCameraPermission === false && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>Camera Access Denied</AlertTitle>
                      <AlertDescription>
                        Camera access is required to scan QR codes. Please enable it in your browser settings and try again.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                  </div>
                  
                  {hasCameraPermission === null && !videoRef.current?.srcObject && (
                       <div className="flex items-center justify-center text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Requesting camera access...
                      </div>
                  )}

                  {hasCameraPermission && (
                       <div className="flex flex-col sm:flex-row gap-2">
                          <Button onClick={simulateQrScan} className="w-full sm:flex-1" disabled={isProcessingQr}>
                            {isProcessingQr && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isProcessingQr ? "Processing..." : "Simulate Scan & Submit"}
                          </Button>
                          <Button variant="outline" onClick={handleCancelScan} className="w-full sm:w-auto" disabled={isProcessingQr}>
                            Cancel
                          </Button>
                      </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Monthly Overview</CardTitle>
              <CardDescription>Select a date to view details or navigate through months.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border shadow-inner"
                modifiers={{ today: new Date() }}
                modifiersStyles={{ today: { color: 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } }}
              />
            </CardContent>
          </Card>
          {date && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Your Details for {date.toLocaleDateString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No specific bookings or attendance records for this day (placeholder).
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {user?.role === 'admin' && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center"><List className="mr-2 h-5 w-5" />Registered Students</CardTitle>
              <CardDescription>Click on a student to view their attendance calendar.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placeholderStudents.map((student) => (
                    <TableRow key={student.studentId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleStudentSelect(student)}>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell className="capitalize">{student.shift}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleStudentSelect(student); }}>
                          View Calendar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {placeholderStudents.length === 0 && (
                <p className="py-4 text-center text-muted-foreground">No students registered yet.</p>
              )}
            </CardContent>
          </Card>

          {selectedStudent && (
            <Card>
              <CardHeader>
                <CardTitle>{selectedStudent.name}'s Attendance</CardTitle>
                <CardDescription>Monthly overview for {selectedStudent.name}. Select a date to view details.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md border shadow-inner"
                  // In a real app, modifiers would highlight attendance for selectedStudent
                  modifiers={{ today: new Date() }}
                  modifiersStyles={{ today: { color: 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } }}
                />
              </CardContent>
            </Card>
          )}
          {selectedStudent && date && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Details for {selectedStudent.name} on {date.toLocaleDateString()}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No specific attendance records for {selectedStudent.name} on this day (placeholder).
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}
