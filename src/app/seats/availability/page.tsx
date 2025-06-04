
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Armchair, Briefcase, UserCheck, Clock, AlertTriangle } from 'lucide-react';

// Placeholder data for seat status
const totalSeats = 84; // 85 total minus the excluded 17 = 84 usable seats


// Placeholder data for active students (same as dashboard) - now includes shift, overstayed status, seatNumber, and phone
const placeholderActiveStudents = [
  { id: "TS001", name: "Aarav Sharma", timeIn: "2 hours 30 minutes", shift: "morning", hasOverstayed: false, seatNumber: "1", phone: "9876543210" },
  { id: "TS002", name: "Priya Patel", timeIn: "7 hours 15 minutes", shift: "morning", hasOverstayed: true, seatNumber: "20", phone: "9876543211" },
  { id: "TS004", name: "Vikram Singh", timeIn: "4 hours 5 minutes", shift: "evening", hasOverstayed: false, seatNumber: "40", phone: "9876543213" },
  { id: "TS005", name: "Neha Reddy", timeIn: "0 hours 45 minutes", shift: "fullday", hasOverstayed: false, seatNumber: "50", phone: "9876543214" },
  { id: "TS008", name: "Kavita Singh", timeIn: "8 hours 0 minutes", shift: "morning", hasOverstayed: true, seatNumber: "10", phone: "9876543217" },
];
const occupiedSeatsCount = placeholderActiveStudents.length;
const availableSeatsCount = totalSeats - occupiedSeatsCount;


// Placeholder data for available seats (same as dashboard)
const placeholderAvailableSeats = [
  { seatNumber: "2" },
  { seatNumber: "22" },
  { seatNumber: "38" },
  { seatNumber: "55" },
  { seatNumber: "70" },
];


export default function SeatAvailabilityPage() {
  const [showOccupiedSeatsDialog, setShowOccupiedSeatsDialog] = React.useState(false);
  const [showAvailableSeatsDialog, setShowAvailableSeatsDialog] = React.useState(false);

  return (
    <>
      <PageTitle title="Seat Availability" description="Check the current status of seat occupancy and available seats." />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalSeats}</p>
          </CardContent>
        </Card>

        <Dialog open={showOccupiedSeatsDialog} onOpenChange={setShowOccupiedSeatsDialog}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Occupied Seats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">{occupiedSeatsCount}</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
              <DialogTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5" /> Active Students in Library</DialogTitle>
              <DialogDescription>
                List of students currently checked in. Overstayed students are highlighted.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead className="flex items-center"><Clock className="mr-1 h-4 w-4"/>Time In Library</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placeholderActiveStudents.map((student) => (
                    <TableRow key={student.id} className={student.hasOverstayed ? "bg-destructive/10" : ""}>
                      <TableCell>{student.id}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>{student.seatNumber}</TableCell>
                      <TableCell>{student.timeIn}</TableCell>
                      <TableCell>
                        {student.hasOverstayed && (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {placeholderActiveStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No students currently active in the library.
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAvailableSeatsDialog} onOpenChange={setShowAvailableSeatsDialog}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Armchair className="mr-2 h-4 w-4" />
                  Available Seats
                  </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{availableSeatsCount}</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center"><Armchair className="mr-2 h-5 w-5" /> Available Seats</DialogTitle>
              <DialogDescription>
                List of currently available seat numbers.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seat Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {placeholderAvailableSeats.map((seat) => (
                    <TableRow key={seat.seatNumber}>
                      <TableCell className="font-medium">{seat.seatNumber}</TableCell>
                    </TableRow>
                  ))}
                  {placeholderAvailableSeats.length === 0 && (
                      <TableRow>
                        <TableCell className="text-center text-muted-foreground">
                          No seats currently available.
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Seat Layout (Placeholder)</CardTitle>
          <CardDescription>Visual representation of seat status will be shown here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[300px] flex items-center justify-center bg-muted rounded-md">
            <p className="text-muted-foreground">Seat layout visualization coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
