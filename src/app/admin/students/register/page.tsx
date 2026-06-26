
"use client";

import * as React from 'react';
import { isReviewerUser } from '@/lib/auth-utils';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { UserPlus, Loader2, Camera, User, Lock, Armchair } from 'lucide-react';
import { addStudent, getAvailableSeats, type AddStudentData } from '@/services/student-service';
import { studentRegisterSchema, type StudentRegisterFormValues, SHIFT_OPTIONS } from '@/lib/schemas/student';
import type { Shift } from '@/types/student';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/contexts/auth-context';


// StudentRegisterFormValues and studentRegisterSchema imported from @/lib/schemas/student
// Local alias kept to avoid touching every form.handleSubmit call below
type StudentFormValues = StudentRegisterFormValues;

const MAX_IMAGE_DIMENSION = 500; // Max width/height in pixels

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
            resolve(canvas.toDataURL('image/jpeg', 0.9)); // Get JPEG with 90% quality
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
});


export default function StudentRegisterPage() {
  const { user } = useAuth();
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

  const isReviewer = isReviewerUser(user?.email);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      address: "",
      shift: undefined,
      seatNumber: "",
      idCardFileName: "",
      profilePictureUrl: "",
    },
  });

  const selectedShift = form.watch("shift");

  React.useEffect(() => {
    if (!selectedShift) {
      setAvailableSeatOptions([]);
      setIsLoadingSeats(false);
      return;
    }

    // Guard against out-of-order responses when the shift is switched quickly.
    let cancelled = false;
    const fetchSeatsForShift = async (shift: Shift) => {
      setIsLoadingSeats(true);
      setAvailableSeatOptions([]);
      form.setValue("seatNumber", "");
      try {
        const seats = await getAvailableSeats(shift);
        if (!cancelled) setAvailableSeatOptions(seats);
      } catch (error) {
        console.error(`Failed to fetch available seats for ${shift} shift:`, error);
        if (!cancelled) {
          toast({ title: "Error", description: `Could not load seats for ${shift} shift.`, variant: "destructive" });
          setAvailableSeatOptions([]);
        }
      } finally {
        if (!cancelled) setIsLoadingSeats(false);
      }
    };

    fetchSeatsForShift(selectedShift);
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShift, toast, form.setValue]);

  // Effect to handle camera stream when dialog opens/closes
  React.useEffect(() => {
    let stream: MediaStream | null = null;
    const videoElem = videoRef.current;

    if (isCameraDialogOpen) {
      setHasCameraPermission(true); // Reset so a previous denial doesn't flash on reopen
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
        let { videoWidth: width, videoHeight: height } = video;

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
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setPreviewUrl(dataUrl);
            form.setValue('profilePictureUrl', dataUrl, { shouldDirty: true });
        }
        setIsCameraDialogOpen(false); // This will trigger the useEffect cleanup
    }
  };


  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const resizedBase64 = await resizeImage(file);
        setPreviewUrl(resizedBase64);
        form.setValue('profilePictureUrl', resizedBase64, { shouldDirty: true });
      } catch (error) {
        toast({ title: "Image Processing Error", description: "Could not process the selected image.", variant: "destructive" });
      }
    }
  };

  const handleReviewerSubmit = () => {
    toast({
      title: "Simulated Success!",
      description: "As a reviewer, this action is simulated and no student was registered.",
    });
  };

  async function onSubmit(data: StudentFormValues) {
    setIsSubmitting(true);
    try {
      const studentPayload: AddStudentData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone,
        password: data.password,
        address: data.address,
        shift: data.shift,
        seatNumber: data.seatNumber,
        idCardFileName: data.idCardFileName,
        profilePictureUrl: data.profilePictureUrl,
      };
      const newStudent = await addStudent(studentPayload);
      toast({
        title: "Student Registered Successfully",
        description: `${newStudent.name} (ID: ${newStudent.studentId}) has been registered and their auth account is active.`,
      });
      form.reset();
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setAvailableSeatOptions([]);
    } catch (error: unknown) {
       toast({
        title: "Registration Failed",
        description: (error instanceof Error ? error.message : String(error)) || "An unexpected error occurred.",
        variant: "destructive",
      });
      if (selectedShift && (error instanceof Error ? error.message : String(error))?.toLowerCase().includes("seat")) {
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
      <PageTitle title="Register New Student" description="Add a new student to the system and create their login account." />
      <Card className="w-full md:max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Student Registration Form</CardTitle>
          <CardDescription>Fill in the details below. A student ID will be auto-generated and their login account will be created.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">

              {/* --- Profile picture --- */}
              <FormItem className="space-y-3">
                <FormLabel>Profile Picture (Optional)</FormLabel>
                <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center">
                    <Avatar className="h-24 w-24 self-center border sm:h-20 sm:w-20 sm:self-auto">
                        <AvatarImage src={previewUrl || undefined} alt="Profile preview" data-ai-hint="profile person"/>
                        <AvatarFallback><UserPlus /></AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-grow space-y-2">
                      <FormControl>
                        <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleProfilePictureChange}
                            disabled={isSubmitting || isReviewer}
                            ref={fileInputRef}
                            className="cursor-pointer"
                        />
                      </FormControl>
                       <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                          <DialogTrigger asChild>
                              <Button type="button" variant="outline" className="w-full" disabled={isSubmitting || isReviewer}>
                                  <Camera className="mr-2 h-4 w-4" /> Open Camera
                              </Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>Capture Photo</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-3 py-4">
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
                          Select a file or capture from camera. Images will be resized.
                      </FormDescription>
                    </div>
                </div>
              </FormItem>

              {/* --- Personal details --- */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4 text-primary" />
                  <span>Personal Details</span>
                </div>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter student's full name" {...field} disabled={isSubmitting || isReviewer} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Address (Optional)</FormLabel><FormControl><Input type="email" placeholder="student@example.com" {...field} disabled={isSubmitting || isReviewer} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" inputMode="numeric" placeholder="Enter 10-digit phone number" {...field} disabled={isSubmitting || isReviewer} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Address (Optional)</FormLabel><FormControl><Input placeholder="Enter address" {...field} disabled={isSubmitting || isReviewer} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              {/* --- Login credentials --- */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>Login Credentials</span>
                </div>
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter initial password (min. 6 characters)"
                        {...field}
                        disabled={isSubmitting || isReviewer}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Members can&apos;t change this themselves &mdash; only an admin can update it later from the student&apos;s profile.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* --- Seat assignment --- */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Armchair className="h-4 w-4 text-primary" />
                  <span>Seat Assignment</span>
                </div>
                <FormField control={form.control} name="shift" render={({ field }) => (
                  <FormItem className="space-y-3"><FormLabel>Shift Selection</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-1 gap-3" disabled={isSubmitting || isReviewer}>
                        {SHIFT_OPTIONS.map(option => (
                          <FormItem key={option.value} className="flex items-center space-x-3 space-y-0 rounded-md border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                            <FormControl><RadioGroupItem value={option.value} disabled={isSubmitting || isReviewer} /></FormControl>
                            <FormLabel className="font-normal cursor-pointer w-full">{option.label}</FormLabel>
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
                        disabled={isSubmitting || isLoadingSeats || !selectedShift || isReviewer}
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
              </div>
            </CardContent>
            <CardFooter>
              {isReviewer ? (
                <Button type="button" onClick={handleReviewerSubmit} className="w-full sm:w-auto">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register Student (For Reviewer)
                </Button>
              ) : (
                <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isLoadingSeats || !selectedShift}>
                  {isSubmitting ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  {isSubmitting ? "Registering..." : "Register Student"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </>
  );
}
