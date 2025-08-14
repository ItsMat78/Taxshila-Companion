
"use client";

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { UserPlus, Loader2, Camera, Upload, Video, VideoOff } from 'lucide-react';
import { addStudent, getAvailableSeats, type AddStudentData } from '@/services/student-service';
import type { Shift } from '@/types/student';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useCallback } from 'react';
import { Label } from '@/components/ui/label';


const studentFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  phone: z.string()
    .length(10, { message: "Phone number must be exactly 10 digits." })
    .regex(/^\d+$/, { message: "Phone number must contain only digits." }),
  address: z.string(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  shift: z.enum(["morning", "evening", "fullday"], { required_error: "Shift selection is required." }),
  seatNumber: z.string().min(1, "Seat selection is required."),
  idCardFileName: z.string().optional(),
  profilePictureUrl: z.string().optional(), // Added for the profile picture
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

const shiftOptions = [
  { value: "morning" as Shift, label: "Morning Shift (7 AM - 2 PM)" },
  { value: "evening" as Shift, label: "Evening Shift (2 PM - 9:30 PM)" },
  { value: "fullday" as Shift, label: "Full Day (7 AM - 9:30 PM)" },
];

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});


export default function StudentRegisterPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availableSeatOptions, setAvailableSeatOptions] = React.useState<string[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = React.useState(false);
  
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isCameraDialogOpen, setIsCameraDialogOpen] = React.useState(false);
  const [hasCameraPermission, setHasCameraPermission] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      password: "",
      confirmPassword: "",
      shift: undefined,
      seatNumber: "",
      idCardFileName: "",
      profilePictureUrl: "",
    },
  });

  const selectedShift = form.watch("shift");

  React.useEffect(() => {
    const fetchSeatsForShift = async (shift: Shift) => {
      setIsLoadingSeats(true);
      setAvailableSeatOptions([]); 
      form.setValue("seatNumber", ""); 
      try {
        const seats = await getAvailableSeats(shift);
        setAvailableSeatOptions(seats);
      } catch (error) {
        console.error(`Failed to fetch available seats for ${shift} shift:`, error);
        toast({ title: "Error", description: `Could not load seats for ${shift} shift.`, variant: "destructive" });
        setAvailableSeatOptions([]);
      } finally {
        setIsLoadingSeats(false);
      }
    };

    if (selectedShift) {
      fetchSeatsForShift(selectedShift);
    } else {
      setAvailableSeatOptions([]); 
      setIsLoadingSeats(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShift, toast, form.setValue]);

  // Effect to handle camera stream when dialog opens/closes
  React.useEffect(() => {
    let stream: MediaStream | null = null;
    const videoElem = videoRef.current;

    if (isCameraDialogOpen) {
      const getCameraPermission = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error("Error accessing camera:", error);
          setHasCameraPermission(false);
          toast({
            variant: "destructive",
            title: "Camera Access Denied",
            description: "Please enable camera permissions in your browser settings to use this app.",
          });
          setIsCameraDialogOpen(false);
        }
      };
      getCameraPermission();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoElem) {
        videoElem.srcObject = null;
      }
    };
  }, [isCameraDialogOpen, toast]);


  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setPreviewUrl(dataUrl);
            form.setValue('profilePictureUrl', dataUrl, { shouldDirty: true });
        }
        setIsCameraDialogOpen(false); // This will trigger the useEffect cleanup
    }
  };


  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) { // 3MB limit
        toast({ title: "File Too Large", description: "Please select an image smaller than 3MB.", variant: "destructive" });
        return;
      }
      const base64 = await toBase64(file);
      setPreviewUrl(base64);
      form.setValue('profilePictureUrl', base64, { shouldDirty: true });
    }
  };


  async function onSubmit(data: StudentFormValues) {
    setIsSubmitting(true);
    try {
      const studentPayload: AddStudentData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        address: data.address,
        password: data.password,
        shift: data.shift,
        seatNumber: data.seatNumber,
        idCardFileName: data.idCardFileName,
        profilePictureUrl: data.profilePictureUrl, // Pass the base64 url
      };
      const newStudent = await addStudent(studentPayload);
      toast({
        title: "Student Registered Successfully",
        description: `${newStudent.name} (ID: ${newStudent.studentId}) has been registered with seat ${newStudent.seatNumber} for ${newStudent.shift} shift.`,
      });
      form.reset();
      setPreviewUrl(null); // Clear preview after successful submission
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
      setAvailableSeatOptions([]); 
    } catch (error: any) {
       toast({
        title: "Registration Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      if (selectedShift && error.message?.toLowerCase().includes("seat")) {
        setIsLoadingSeats(true);
        try {
            const seats = await getAvailableSeats(selectedShift);
            setAvailableSeatOptions(seats);
        } catch (e) { console.error(e); }
        finally { setIsLoadingSeats(false); }
      }
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <>
      <PageTitle title="Register New Student" description="Add a new student to the system." />
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Student Registration Form</CardTitle>
          <CardDescription>Fill in the details below. Student ID will be auto-generated.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              
              <FormItem>
                <FormLabel>Profile Picture (Optional)</FormLabel>
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border">
                        <AvatarImage src={previewUrl || undefined} alt="Profile preview" data-ai-hint="profile person"/>
                        <AvatarFallback><UserPlus /></AvatarFallback>
                    </Avatar>
                    <div className="flex-grow space-y-2">
                      <FormControl>
                        <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleProfilePictureChange}
                            disabled={isSubmitting}
                            ref={fileInputRef}
                        />
                      </FormControl>
                       <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                          <DialogTrigger asChild>
                              <Button type="button" variant="outline" className="w-full" disabled={isSubmitting}>
                                  <Camera className="mr-2 h-4 w-4" /> Open Camera
                              </Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>Capture Photo</DialogTitle>
                              </DialogHeader>
                              <div className="py-4">
                                  <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                                  { !hasCameraPermission && (
                                      <Alert variant="destructive">
                                          <AlertTitle>Camera Access Required</AlertTitle>
                                          <AlertDescription>
                                            Please allow camera access to use this feature.
                                          </AlertDescription>
                                      </Alert>
                                  )}
                                  <canvas ref={canvasRef} className="hidden" />
                              </div>
                              <DialogFooter>
                                  <Button type="button" onClick={handleCapture} disabled={!hasCameraPermission}>
                                      <Camera className="mr-2 h-4 w-4" /> Capture and Use
                                  </Button>
                              </DialogFooter>
                          </DialogContent>
                      </Dialog>
                      <FormDescription className="text-xs">
                          Select a file (max 3MB) or capture from camera.
                      </FormDescription>
                    </div>
                </div>
              </FormItem>

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter student's full name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="Enter 10-digit phone number" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input placeholder="Enter address" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Enter password (min 6 characters)" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="Re-enter password" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="shift" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Shift Selection</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2" disabled={isSubmitting}>
                      {shiftOptions.map(option => (
                        <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value={option.value} disabled={isSubmitting} /></FormControl>
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting || isLoadingSeats || !selectedShift}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedShift ? "Select shift first" : (isLoadingSeats ? "Loading seats..." : "Select an available seat")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!isLoadingSeats && !selectedShift && (
                            <p className="p-2 text-xs text-muted-foreground">Please select a shift to see available seats.</p>
                        )}
                        {!isLoadingSeats && selectedShift && availableSeatOptions.length === 0 && (
                            <p className="p-2 text-xs text-muted-foreground">No seats currently available for {selectedShift} shift.</p>
                        )}
                        {availableSeatOptions.map(seat => (
                          <SelectItem key={seat} value={seat}>
                            Seat {seat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isLoadingSeats || !selectedShift}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Registering..." : "Register Student"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}

    