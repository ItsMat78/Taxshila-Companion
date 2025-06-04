
"use client";

import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SeatAvailabilityPage() {
  // Placeholder data for seat status
  const totalSeats = 100;
  const occupiedSeats = 75; // This would come from a real-time data source
  const availableSeats = totalSeats - occupiedSeats;

  return (
    <>
      <PageTitle title="Seat Availability" description="Check the current status of seat occupancy." />
      
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
            <p className="text-3xl font-bold text-green-600">{availableSeats}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
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
