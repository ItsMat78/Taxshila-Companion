

"use client";

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link'; 
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getStudentByCustomId, updateProfilePicture } from '@/services/student-service'; 
import type { Student } from '@/types/student'; 
import { UserCircle, UploadCloud, Save, Mail, Phone, BookOpen, MapPin, Receipt, Loader2, Edit, SquareUser, IndianRupee, Camera, View, Video, VideoOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const DEFAULT_PROFILE_PLACEHOLDER = "https://placehold.co/200x200.png";
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


export default function MemberProfilePage() {
  const { user, updateUser } = useAuth(); // Get updateUser from context
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

  React.useEffect(() => {
    setIsLoading(true);
    const fetchStudent = async () => {
      try {
        let student = null;
        if (user?.studentId) {
          student = await getStudentByCustomId(user.studentId);
        } else if (user?.email) {
          student = await getStudentByEmail(user.email);
        }

        if (student) {
          setMemberDetails(student);
          setPreviewUrl(student.profilePictureUrl || null);
        } else {
          toast({ title: "Error", description: "Could not load your profile data.", variant: "destructive" });
        }
      } catch (error) {
        console.error("Failed to fetch member details:", error);
        toast({ title: "Error", description: "An error occurred while loading your profile.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchStudent();
    }
  }, [user, toast]);

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
            description: "Please enable camera permissions in your browser settings.",
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
        }
        setIsCameraDialogOpen(false); // This will trigger the useEffect cleanup
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const resizedBase64 = await resizeImage(file);
        setPreviewUrl(resizedBase64);
      } catch(error) {
        toast({ title: "Image Processing Error", description: "Could not process the selected image.", variant: "destructive" });
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
      updateUser({ profilePictureUrl: newUrl }); // Update the context
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
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!memberDetails) {
     return (
      <>
        <PageTitle title="My Profile" description="Could not load your profile information." />
        <Card className="shadow-md">
          <CardContent className="pt-6 text-center text-muted-foreground">
            Please try again later or contact support if the issue persists.
          </CardContent>
        </Card>
      </>
    );
  }

  const displayName = memberDetails.name || user?.email?.split('@')[0] || "Member";
  const hasUnsavedChanges = previewUrl && previewUrl !== memberDetails.profilePictureUrl;

  return (
    <>
      <PageTitle title="My Profile" description="View and manage your details." />
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">  
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your avatar.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Dialog>
                  <DialogTrigger asChild>
                      <div className="cursor-pointer relative group">
                          <Avatar className="h-32 w-32 border-2 border-primary shadow-md">
                              <AvatarImage src={previewUrl || DEFAULT_PROFILE_PLACEHOLDER} alt={displayName} data-ai-hint="profile person"/>
                              <AvatarFallback className="text-4xl">{displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                           <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <View className="text-white h-10 w-10"/>
                          </div>
                      </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-md w-auto p-2">
                      <Image
                          src={previewUrl || DEFAULT_PROFILE_PLACEHOLDER}
                          alt="Profile Picture Full View"
                          width={500}
                          height={500}
                          className="rounded-md object-contain max-h-[80vh] w-full h-auto"
                      />
                  </DialogContent>
              </Dialog>
              
              <div className="w-full space-y-2">
                <Label htmlFor="picture-upload">Change Picture</Label>
                <Input id="picture-upload" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} disabled={isSavingPicture} />
                <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
                    <DialogTrigger asChild>
                        <Button type="button" variant="outline" className="w-full" disabled={isSavingPicture}>
                            <Camera className="mr-2 h-4 w-4" /> Use Camera
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Capture Photo</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay playsInline muted />
                            { !hasCameraPermission && (
                                <Alert variant="destructive" className="mt-2">
                                    <AlertTitle>Camera Access Required</AlertTitle>
                                    <AlertDescription>Please allow camera access to use this feature.</AlertDescription>
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
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfilePicture} disabled={isSavingPicture || !hasUnsavedChanges} className="w-full">
                {isSavingPicture ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                {isSavingPicture ? 'Saving...' : 'Save Picture'}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <div className="flex items-center">
              <SquareUser className="mr-3 h-5 w-5 text-muted-foreground " />
              <CardTitle>My Details</CardTitle>
            </div>  
            <CardDescription>Your current information on record. Contact admin to change these details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <UserCircle className="mr-3 h-5 w-5 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium break-words">{displayName}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Mail className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="font-medium break-words">{memberDetails.email || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium break-words">{memberDetails.phone}</p>
              </div>
            </div>
             <div className="flex items-center">
              <BookOpen className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Shift</p>
                <p className="font-medium capitalize">{memberDetails.shift}</p>
              </div>
            </div>
             <div className="flex items-center">
              <MapPin className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Seat Number</p>
                <p className="font-medium">{memberDetails.seatNumber || "N/A (Not Assigned / Left)"}</p>
              </div>
            </div>
          </CardContent>
           <CardFooter>
             <Link href="/member/fees" passHref legacyBehavior>
                <Button variant="outline" size="sm">
                  <IndianRupee className="mr-2 h-4 w-4" /> View Payment History
                </Button>
              </Link>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
