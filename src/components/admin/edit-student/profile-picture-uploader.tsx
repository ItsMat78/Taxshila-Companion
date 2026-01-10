
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateProfilePicture } from '@/services/student-service';
import { Loader2, Camera, Video, VideoOff, View, Save } from "lucide-react";
import NextImage from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


interface ProfilePictureUploaderProps {
  studentFirestoreId: string;
  currentProfilePictureUrl?: string;
  onUploadSuccess: (newUrl: string) => void;
  onPictureSelect: () => void;
  isReviewer: boolean;
}

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


export function ProfilePictureUploader({
  studentFirestoreId,
  currentProfilePictureUrl,
  onUploadSuccess,
  onPictureSelect,
  isReviewer,
}: ProfilePictureUploaderProps) {
  const [base64Preview, setBase64Preview] = useState<string | null>(currentProfilePictureUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    setBase64Preview(currentProfilePictureUrl || null);
  }, [currentProfilePictureUrl]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const videoElem = videoRef.current;

    if (isCameraDialogOpen) {
      const getCameraPermission = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (error) {
          console.error("Error accessing camera:", error);
          setHasCameraPermission(false);
          toast({ variant: "destructive", title: "Camera Access Denied" });
          setIsCameraDialogOpen(false);
        }
      };
      getCameraPermission();
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
            setBase64Preview(dataUrl);
            onPictureSelect();
        }
        setIsCameraDialogOpen(false);
    }
  };


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const resizedBase64 = await resizeImage(file);
        setBase64Preview(resizedBase64);
        onPictureSelect();
      } catch(error) {
         toast({ title: "Image Processing Error", description: "Could not process the selected image.", variant: "destructive" });
      }
    }
  };

  const handleUpload = async () => {
    if (isReviewer) {
      toast({
        title: "Simulated Success!",
        description: "As a reviewer, the profile picture update was simulated.",
      });
      return;
    }
    if (!base64Preview || !base64Preview.startsWith('data:image')) {
       toast({ title: "No New Image", description: "Please select or capture a new photo.", variant: "destructive" });
      return;
    }
    
    setIsUploading(true);
    try {
      const newUrl = await updateProfilePicture(studentFirestoreId, 'member', base64Preview);
      onUploadSuccess(newUrl);
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message || "Could not save the picture.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const hasUnsavedChanges = base64Preview && base64Preview !== currentProfilePictureUrl;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
        <CardDescription>Click the image to view it. Use the buttons to change it.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <Dialog>
            <DialogTrigger asChild>
                <div className="cursor-pointer relative group">
                    <NextImage
                        src={base64Preview || "https://placehold.co/150x150.png"}
                        alt="Profile Picture Preview"
                        width={150}
                        height={150}
                        className="rounded-full object-cover w-[150px] h-[150px] border-2 border-muted"
                        data-ai-hint="profile person"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <View className="text-white h-8 w-8"/>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-md w-auto p-2">
                <NextImage
                    src={base64Preview || "https://placehold.co/400x400.png"}
                    alt="Profile Picture Full View"
                    width={500}
                    height={500}
                    className="rounded-md object-contain max-h-[80vh] w-full h-auto"
                />
            </DialogContent>
          </Dialog>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="picture">Select File</Label>
            <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} disabled={isUploading || isReviewer} ref={fileInputRef}/>
          </div>

           <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full max-w-sm" disabled={isUploading || isReviewer}>
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
          <Button onClick={handleUpload} disabled={isUploading || !hasUnsavedChanges || isReviewer} className="w-full">
            {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : <><Save className="mr-2 h-4 w-4"/>Save Picture {isReviewer && "(For Reviewer)"}</>}
          </Button>
      </CardFooter>
    </Card>
  );
}
