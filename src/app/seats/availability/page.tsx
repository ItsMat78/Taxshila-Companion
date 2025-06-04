
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
import { Armchair, Briefcase, UserCheck, Clock, AlertTriangle, Loader2, Circle, Sunrise, Sunset, Sun } from 'lucide-react';
import { getAllStudents, ALL_SEAT_NUMBERS as serviceAllSeats } from '@/services/student-service';
import type { Student, Shift } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const occupiedSeatMap = new Map<string, Student>();
  activeStudents.forEach(student => {
    if (student.seatNumber) {
      occupiedSeatMap.set(student.seatNumber, student);
    }
  });

  const occupiedSeatNumbers = Array.from(occupiedSeatMap.keys());
  
  const totalSeats = serviceAllSeats.length;
  const occupiedSeatsCount = occupiedSeatNumbers.length;
  const availableSeatsCount = totalSeats - occupiedSeatsCount;

  const occupiedMorningCount = activeStudents.filter(s => s.shift === 'morning').length;
  const occupiedEveningCount = activeStudents.filter(s => s.shift === 'evening').length;
  const occupiedFullDayCount = activeStudents.filter(s => s.shift === 'fullday').length;

  const availableSeatObjects = serviceAllSeats
    .filter(seat => !occupiedSeatMap.has(seat))
    .map(seatNumber => ({ seatNumber }));

  const getSeatBadgeClass = (seatNumber: string): string => {
    const student = occupiedSeatMap.get(seatNumber);
    if (student) {
      switch (student.shift) {
        case 'morning':
          return 'bg-orange-200 border-orange-300 text-orange-800 hover:bg-orange-300';
        case 'evening':
          return 'bg-purple-200 border-purple-300 text-purple-800 hover:bg-purple-300';
        case 'fullday':
          return 'bg-yellow-200 border-yellow-300 text-yellow-800 hover:bg-yellow-300';
        default:
          return 'bg-destructive/80 border-destructive text-destructive-foreground hover:bg-destructive'; // Fallback for occupied
      }
    }
    return 'bg-sky-200 border-sky-300 text-sky-800 hover:bg-sky-300'; // Available
  };

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
                <p className="text-xs text-muted-foreground pt-1">Capacity of study hall</p>
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
                     <p className="text-xs text-muted-foreground pt-1">
                      M: {occupiedMorningCount}, E: {occupiedEveningCount}, F: {occupiedFullDayCount}
                    </p>
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
                        <TableHead>Shift</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeStudents.map((student) => (
                        <TableRow key={student.studentId} className={student.feeStatus === 'Overdue' ? "bg-destructive/5" : ""}>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.phone}</TableCell>
                          <TableCell>{student.seatNumber}</TableCell>
                          <TableCell className="capitalize">{student.shift}</TableCell>
                        </TableRow>
                      ))}
                      {activeStudents.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                     <p className="text-xs text-muted-foreground pt-1">Currently vacant seats</p>
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
              <CardDescription>Visual representation of seat occupancy by shift.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center space-x-4 mb-4 text-xs sm:text-sm">
                <div className="flex items-center mr-2 mb-1 sm:mb-0">
                  <Circle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 fill-sky-200 text-sky-300" />
                  <span>Available</span>
                </div>
                <div className="flex items-center mr-2 mb-1 sm:mb-0">
                  <Sunrise className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-orange-500" /> 
                  <span className="mr-0.5">Morning:</span>
                  <Circle className="h-3 w-3 sm:h-4 sm:w-4 fill-orange-200 text-orange-300" />
                </div>
                <div className="flex items-center mr-2 mb-1 sm:mb-0">
                  <Sunset className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-purple-500" />
                  <span className="mr-0.5">Evening:</span>
                   <Circle className="h-3 w-3 sm:h-4 sm:w-4 fill-purple-200 text-purple-300" />
                </div>
                <div className="flex items-center mb-1 sm:mb-0">
                  <Sun className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-yellow-500" />
                  <span className="mr-0.5">Full Day:</span>
                  <Circle className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-200 text-yellow-300" />
                </div>
              </div>
              <div className="grid grid-cols-10 gap-2 sm:gap-3 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-17">
                {serviceAllSeats.map((seatNum) => {
                  return (
                    <Badge
                      key={seatNum}
                      variant="outline"
                      className={cn(
                        "flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 text-xs sm:text-sm rounded-md transition-colors font-medium",
                        getSeatBadgeClass(seatNum)
                      )}
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

