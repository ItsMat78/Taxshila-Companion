"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { uploadProfilePicture } from "@/services/profile-picture-service";
import Image from "next/image";
import { useState } from "react";

interface ProfilePictureUploaderProps {
  studentFirestoreId: string;
  currentProfilePictureUrl?: string;
  onUploadSuccess: (newUrl: string) => void;
}

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
      const downloadURL = await uploadProfilePicture(
        studentFirestoreId,
        selectedFile
      );
      setPreviewUrl(downloadURL);
      setSelectedFile(null);
      onUploadSuccess(downloadURL); // Callback on success
      toast({
        title: "Upload successful",
        description: "Profile picture has been updated.",
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload the profile picture. Please try again.",
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
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>
        </div>
        <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
          {isUploading ? "Uploading..." : "Save Picture"}
        </Button>
      </CardContent>
    </Card>
  );
}
