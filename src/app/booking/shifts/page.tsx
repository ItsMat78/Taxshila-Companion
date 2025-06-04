"use client";

import * as React from 'react';
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const shiftOptions = [
  { id: "morning", label: "Morning Shift (8 AM - 2 PM)" },
  { id: "evening", label: "Evening Shift (3 PM - 9 PM)" },
  { id: "fullday", label: "Full Day (8 AM - 9 PM)" },
];

export default function ShiftSelectionPage() {
  const { toast } = useToast();
  const [selectedShift, setSelectedShift] = React.useState<string | undefined>(undefined);

  const handleConfirmBooking = () => {
    if (!selectedShift) {
      toast({
        title: "No Shift Selected",
        description: "Please select a shift before confirming.",
        variant: "destructive",
      });
      return;
    }
    // In a real app, you would handle the booking logic here
    const shiftLabel = shiftOptions.find(s => s.id === selectedShift)?.label || selectedShift;
    toast({
      title: "Booking Confirmed!",
      description: `You have selected the ${shiftLabel}.`,
    });
  };

  return (
    <>
      <PageTitle title="Select Your Shift" description="Choose your preferred study shift." />
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Choose a Shift</CardTitle>
          <CardDescription>Select one of the available shifts for your study session.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup onValueChange={setSelectedShift} value={selectedShift} className="space-y-2">
            {shiftOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="font-normal text-base cursor-pointer flex-1">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter>
          <Button onClick={handleConfirmBooking} className="w-full" disabled={!selectedShift}>
            Confirm Booking
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
