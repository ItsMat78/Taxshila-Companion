"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { saveProfilePictureUrl } from "@/services/profile-picture-service"; // Updated service
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ProfilePictureUploaderProps {
  studentFirestoreId: string;
  currentProfilePictureUrl?: string;
  onUploadSuccess: (newUrl: string) => void;
}

// Helper to convert file to Base64
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for Base64 to avoid large documents
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 1MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const base64Url = await toBase64(selectedFile);
      await saveProfilePictureUrl(studentFirestoreId, base64Url);

      setPreviewUrl(base64Url);
      setSelectedFile(null);
      onUploadSuccess(base64Url);
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Profile Picture Preview"
              width={150}
              height={150}
              className="rounded-full object-cover w-[150px] h-[150px]"
            />
          ) : (
             <div className="w-[150px] h-[150px] rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm text-muted-foreground">No Image</span>
            </div>
          )}
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="picture">Select Picture</Label>
            <Input
              id="picture"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        </div>
        <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
          {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : "Save Picture"}
        </Button>
      </CardContent>
    </Card>
  );
}
