
"use client";

import * as React from 'react';
import Image from 'next/image';
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
import { UserCircle, UploadCloud, Save, Mail, Phone, BookOpen, MapPin } from 'lucide-react';

// Placeholder for current member data - in a real app, this would come from useAuth or an API
const placeholderMemberData = {
  name: "Aarav Sharma",
  email: "aarav.sharma@example.com",
  phone: "9876543210",
  shift: "Morning",
  seatNumber: "A101",
  profilePictureUrl: "https://placehold.co/200x200.png", // Default placeholder
};

export default function MemberProfilePage() {
  const { user } = useAuth(); // We'll use this for email, but mostly rely on placeholder for demo
  const { toast } = useToast();

  const [currentProfilePicture, setCurrentProfilePicture] = React.useState(placeholderMemberData.profilePictureUrl);
  const [profilePicturePreview, setProfilePicturePreview] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfilePicture = () => {
    if (profilePicturePreview && selectedFile) {
      // Simulate API call to save the profile picture
      console.log("Saving profile picture:", selectedFile.name);
      setCurrentProfilePicture(profilePicturePreview);
      setProfilePicturePreview(null);
      setSelectedFile(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
      toast({
        title: "Profile Picture Updated (Simulated)",
        description: "Your new profile picture has been saved.",
      });
    }
  };

  const memberDisplayDetails = {
      name: user?.email === placeholderMemberData.email ? placeholderMemberData.name : (user?.email?.split('@')[0] || "Member"),
      email: user?.email || placeholderMemberData.email,
      phone: placeholderMemberData.phone,
      shift: placeholderMemberData.shift,
      seatNumber: placeholderMemberData.seatNumber,
  };


  return (
    <>
      <PageTitle title="My Profile" description="View your details and update your profile picture." />
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCircle className="mr-2 h-5 w-5" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-40 w-40 border-2 border-primary shadow-md">
              <AvatarImage src={profilePicturePreview || currentProfilePicture} alt={memberDisplayDetails.name} data-ai-hint="profile person" />
              <AvatarFallback className="text-4xl">{memberDisplayDetails.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            
            <Input
              id="picture"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/jpg"
              className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
             {profilePicturePreview && (
              <p className="text-xs text-muted-foreground truncate max-w-full px-2">
                Preview: {selectedFile?.name}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSaveProfilePicture} 
              disabled={!profilePicturePreview}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Profile Picture
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>My Details</CardTitle>
            <CardDescription>Your current information on record. Contact admin to change these details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <UserCircle className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{memberDisplayDetails.name}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Mail className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="font-medium">{memberDisplayDetails.email}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Phone className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">{memberDisplayDetails.phone}</p>
              </div>
            </div>
             <div className="flex items-center">
              <BookOpen className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Shift</p>
                <p className="font-medium capitalize">{memberDisplayDetails.shift}</p>
              </div>
            </div>
             <div className="flex items-center">
              <MapPin className="mr-3 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Seat Number</p>
                <p className="font-medium">{memberDisplayDetails.seatNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
