
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { saveProfilePictureUrl } from "@/services/profile-picture-service";
import { Loader2, Camera, Video, VideoOff, View } from "lucide-react";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


interface ProfilePictureUploaderProps {
  studentFirestoreId: string;
  currentProfilePictureUrl?: string;
  onUploadSuccess: (newUrl: string) => void;
}

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});


export function ProfilePictureUploader({
  studentFirestoreId,
  currentProfilePictureUrl,
  onUploadSuccess,
}: ProfilePictureUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentProfilePictureUrl || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Effect to handle camera stream when dialog opens/closes
  useEffect(() => {
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
            setSelectedFile(null); // Clear file selection if capturing from camera
        }
        setIsCameraDialogOpen(false); // This will trigger the useEffect cleanup
    }
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) { // 3MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 3MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    let base64UrlToUpload: string | null = null;
    
    if (selectedFile) {
      base64UrlToUpload = await toBase64(selectedFile);
    } else if (previewUrl && previewUrl.startsWith('data:image')) {
      base64UrlToUpload = previewUrl;
    }
    
    if (!base64UrlToUpload) {
       toast({
        title: "No new image selected",
        description: "Please select a file or capture a new photo to upload.",
        variant: "destructive",
      });
      return;
    }
    

    setIsUploading(true);
    try {
      await saveProfilePictureUrl(studentFirestoreId, base64UrlToUpload);

      setPreviewUrl(base64UrlToUpload);
      setSelectedFile(null);
      onUploadSuccess(base64UrlToUpload);
      toast({
        title: "Upload successful",
        description: "Profile picture has been updated.",
      });
    } catch (error) {
      console.error("Error saving profile picture:", error);
      toast({
        title: "Upload failed",
        description: "Could not save the profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
                    <Image
                        src={previewUrl || "/path/to/placeholder.png"}
                        alt="Profile Picture Preview"
                        width={150}
                        height={150}
                        className="rounded-full object-cover w-[150px] h-[150px] border-2 border-muted"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <View className="text-white h-8 w-8"/>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-md w-auto p-2">
                <Image
                    src={previewUrl || "/path/to/placeholder.png"}
                    alt="Profile Picture Full View"
                    width={500}
                    height={500}
                    className="rounded-md object-contain max-h-[80vh] w-full h-auto"
                />
            </DialogContent>
          </Dialog>

          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="picture">Select File</Label>
            <Input
              id="picture"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>

           <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full max-w-sm" disabled={isUploading}>
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

        </div>
        <Button onClick={handleUpload} disabled={isUploading || (!selectedFile && !previewUrl?.startsWith('data:image'))}>
          {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : "Save Picture"}
        </Button>
      </CardContent>
    </Card>
  );
}

    