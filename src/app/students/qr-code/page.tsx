"use client";

import * as React from 'react';
import Image from 'next/image';
import { PageTitle } from '@/components/shared/page-title';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Placeholder student data
const students = [
  { id: "TS001", name: "Aarav Sharma" },
  { id: "TS002", name: "Priya Patel" },
  { id: "TS003", name: "Rohan Mehta" },
];

export default function QrCodePage() {
  const [selectedStudent, setSelectedStudent] = React.useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string | null>(null);

  const generateQrCode = () => {
    if (selectedStudent) {
      // In a real app, you would generate a QR code based on studentId or some unique identifier
      // For now, using a placeholder
      setQrCodeUrl(`https://placehold.co/200x200.png`);
    } else {
      alert("Please select a student first.");
    }
  };

  return (
    <>
      <PageTitle title="Student QR Code" description="Generate QR codes for student identification and check-in." />
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Generate QR Code</CardTitle>
          <CardDescription>Select a student to generate their unique QR code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="student-select">Select Student</Label>
            <Select onValueChange={setSelectedStudent}>
              <SelectTrigger id="student-select">
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} ({student.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStudent && (
            <Button onClick={generateQrCode} className="w-full">
              Generate QR Code for {students.find(s => s.id === selectedStudent)?.name}
            </Button>
          )}

          {qrCodeUrl && selectedStudent && (
            <div className="mt-6 text-center p-4 border rounded-md bg-muted/30">
              <h3 className="text-lg font-semibold mb-2">
                QR Code for {students.find(s => s.id === selectedStudent)?.name}
              </h3>
              <div className="flex justify-center">
                <Image
                  src={qrCodeUrl}
                  alt={`QR Code for ${selectedStudent}`}
                  width={200}
                  height={200}
                  data-ai-hint="qr code"
                  className="rounded-md shadow-md"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Scan this QR code for check-in.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
