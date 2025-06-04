
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Armchair, Briefcase, UserCheck, Clock, AlertTriangle, Loader2, Circle } from 'lucide-react';
import { getAllStudents, ALL_SEAT_NUMBERS as serviceAllSeats } from '@/services/student-service';
import type { Student } from '@/types/student';
import { useToast } from '@/hooks/use-toast';

export default function SeatAvailabilityPage() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [showOccupiedSeatsDialog, setShowOccupiedSeatsDialog] = React.useState(false);
  const [showAvailableSeatsDialog, setShowAvailableSeatsDialog] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const students = await getAllStudents();
        setAllStudents(students);
      } catch (error) {
        console.error("Failed to fetch students:", error);
        toast({
          title: "Error",
          description: "Could not load student data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const activeStudents = allStudents.filter(s => s.activityStatus === "Active");
  const occupiedSeatNumbers = activeStudents.map(s => s.seatNumber).filter(Boolean) as string[];
  
  const totalSeats = serviceAllSeats.length;
  const occupiedSeatsCount = occupiedSeatNumbers.length;
  const availableSeatsCount = totalSeats - occupiedSeatsCount;

  const availableSeatObjects = serviceAllSeats
    .filter(seat => !occupiedSeatNumbers.includes(seat))
    .map(seatNumber => ({ seatNumber }));

  return (
    <>
      <PageTitle title="Seat Availability" description="Check the current status of seat occupancy and available seats." />
      
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading seat data...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
            <Card className="shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Seats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalSeats}</p>
              </CardContent>
            </Card>

            <Dialog open={showOccupiedSeatsDialog} onOpenChange={setShowOccupiedSeatsDialog}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
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
                    List of students currently checked in.
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
                        {/* <TableHead className="flex items-center"><Clock className="mr-1 h-4 w-4"/>Time In Library</TableHead> */}
                        {/* <TableHead>Status</TableHead> */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeStudents.map((student) => (
                        <TableRow key={student.studentId} className={student.feeStatus === 'Overdue' ? "bg-destructive/5" : ""}>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.phone}</TableCell>
                          <TableCell>{student.seatNumber}</TableCell>
                          {/* <TableCell>Placeholder Time</TableCell> */}
                          {/* <TableCell>
                            {student.feeStatus === 'Overdue' && ( // Example: Highlight overdue on active list
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                            )}
                          </TableCell> */}
                        </TableRow>
                      ))}
                      {activeStudents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                <Card className="cursor-pointer hover:shadow-lg transition-shadow shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
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
                      {availableSeatObjects.map((seat) => (
                        <TableRow key={seat.seatNumber}>
                          <TableCell className="font-medium">{seat.seatNumber}</TableCell>
                        </TableRow>
                      ))}
                      {availableSeatObjects.length === 0 && (
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

          <Card className="mt-6 shadow-lg">
            <CardHeader>
              <CardTitle>Seat Layout</CardTitle>
              <CardDescription>Visual representation of seat occupancy.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  <Circle className="h-4 w-4 mr-2 fill-green-500 text-green-500" />
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center">
                  <Circle className="h-4 w-4 mr-2 fill-destructive text-destructive" />
                  <span className="text-sm">Occupied</span>
                </div>
              </div>
              <div className="grid grid-cols-10 gap-2 sm:gap-3 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-17">
                {serviceAllSeats.map((seatNum) => {
                  const isOccupied = occupiedSeatNumbers.includes(seatNum);
                  return (
                    <Badge
                      key={seatNum}
                      variant="outline"
                      className={`flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 text-xs sm:text-sm rounded-md transition-colors
                        ${isOccupied 
                          ? 'bg-destructive/80 border-destructive text-destructive-foreground hover:bg-destructive' 
                          : 'bg-green-500/80 border-green-600 text-green-foreground hover:bg-green-600'
                        }
                        font-medium
                      `}
                    >
                      {seatNum}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

    