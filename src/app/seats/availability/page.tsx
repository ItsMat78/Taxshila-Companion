
"use client";

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
import { Armchair } from 'lucide-react';

// Placeholder data for seat status
const totalSeats = 100;
const occupiedSeats = 75; // This would come from a real-time data source
const availableSeatsCount = totalSeats - occupiedSeats;

// Placeholder data for available seats (same as dashboard for now)
const placeholderAvailableSeats = [
  { seatNumber: "A102" },
  { seatNumber: "B204" },
  { seatNumber: "C008" },
  { seatNumber: "D110" },
  { seatNumber: "E055" },
  // Add more or fetch dynamically later
];


export default function SeatAvailabilityPage() {
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
        <Card>
          <CardHeader>
            <CardTitle>Occupied Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{occupiedSeats}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Available Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{availableSeatsCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Armchair className="mr-2 h-5 w-5" />
            List of Available Seats
            </CardTitle>
          <CardDescription>The following seats are currently available for booking or assignment.</CardDescription>
        </CardHeader>
        <CardContent>
          {placeholderAvailableSeats.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto border rounded-md">
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
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="min-h-[200px] flex items-center justify-center bg-muted rounded-md">
              <p className="text-muted-foreground">No seats currently available.</p>
            </div>
          )}
        </CardContent>
      </Card>

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

