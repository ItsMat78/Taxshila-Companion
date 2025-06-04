
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Armchair, Briefcase, UserCheck, Loader2, Circle, Sunrise, Sunset, Sun, Users } from 'lucide-react';
import { getAllStudents, ALL_SEAT_NUMBERS as serviceAllSeats, getAvailableSeats } from '@/services/student-service';
import type { Student, Shift } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ShiftView = Shift | 'fullday_occupied'; 

export default function SeatAvailabilityPage() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedShiftView, setSelectedShiftView] = React.useState<ShiftView>('morning');
  
  const [showOccupiedSeatsDialog, setShowOccupiedSeatsDialog] = React.useState(false);
  const [showAvailableSeatsDialog, setShowAvailableSeatsDialog] = React.useState(false);
  const [dialogSeatList, setDialogSeatList] = React.useState<string[]>([]);
  const [isLoadingDialogSeats, setIsLoadingDialogSeats] = React.useState(false);
  const [availableForFullDayBookingCount, setAvailableForFullDayBookingCount] = React.useState(0);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const students = await getAllStudents();
        setAllStudents(students);
        // Pre-fetch available for full day count for initial display if needed, or do it on view change
        const fullDayAvailable = await getAvailableSeats('fullday');
        setAvailableForFullDayBookingCount(fullDayAvailable.length);

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

  React.useEffect(() => {
    const fetchFullDayAvailableIfNeeded = async () => {
      if (selectedShiftView === 'fullday_occupied' && !isLoading) { // only if not already loading initial data
        setIsLoadingDialogSeats(true); // Can reuse this for the stat card update
        try {
          const seats = await getAvailableSeats('fullday');
          setAvailableForFullDayBookingCount(seats.length);
        } catch (e) {
          toast({ title: "Error", description: "Could not load available seats for full day.", variant: "destructive"});
          setAvailableForFullDayBookingCount(0);
        } finally {
          setIsLoadingDialogSeats(false);
        }
      }
    };
    fetchFullDayAvailableIfNeeded();
  }, [selectedShiftView, isLoading, toast]);


  const activeStudents = allStudents.filter(s => s.activityStatus === "Active");

  const getSeatStatusForView = (seatNumber: string, view: ShiftView): { student?: Student, isAvailable: boolean, colorClass: string, shiftIcon?: React.ElementType } => {
    let studentOnSeat: Student | undefined;
    let isAvailable = true;
    let colorClass = 'bg-sky-200 border-sky-300 text-sky-800 hover:bg-sky-300'; 
    let shiftIcon;

    const studentMorning = activeStudents.find(s => s.seatNumber === seatNumber && s.shift === 'morning');
    const studentEvening = activeStudents.find(s => s.seatNumber === seatNumber && s.shift === 'evening');
    const studentFullDay = activeStudents.find(s => s.seatNumber === seatNumber && s.shift === 'fullday');

    if (view === 'morning') {
      if (studentFullDay) {
        studentOnSeat = studentFullDay;
        isAvailable = false;
        colorClass = 'bg-yellow-200 border-yellow-300 text-yellow-800 hover:bg-yellow-300';
        shiftIcon = Sun;
      } else if (studentMorning) {
        studentOnSeat = studentMorning;
        isAvailable = false;
        colorClass = 'bg-orange-200 border-orange-300 text-orange-800 hover:bg-orange-300';
        shiftIcon = Sunrise;
      }
    } else if (view === 'evening') {
      if (studentFullDay) {
        studentOnSeat = studentFullDay;
        isAvailable = false;
        colorClass = 'bg-yellow-200 border-yellow-300 text-yellow-800 hover:bg-yellow-300';
        shiftIcon = Sun;
      } else if (studentEvening) {
        studentOnSeat = studentEvening;
        isAvailable = false;
        colorClass = 'bg-purple-200 border-purple-300 text-purple-800 hover:bg-purple-300';
        shiftIcon = Sunset;
      }
    } else if (view === 'fullday_occupied') {
      if (studentFullDay) {
        studentOnSeat = studentFullDay;
        isAvailable = false; 
        colorClass = 'bg-yellow-200 border-yellow-300 text-yellow-800 hover:bg-yellow-300';
        shiftIcon = Sun;
      } else {
        // In "Full Day Occupancy" view, if not taken by a fullday student, it's "available" in terms of not being fullday-occupied.
        // Its actual availability for booking depends on morning/evening shifts.
        isAvailable = true; 
      }
    }
    return { student: studentOnSeat, isAvailable, colorClass, shiftIcon };
  };
  
  let studentsForDialog = activeStudents;
  let occupiedCountForView = 0;
  let availableCountForView = 0;
  let occupiedTitleSuffix = "Students";
  let availableTitleSuffix = "View";

  if (selectedShiftView === 'morning') {
    studentsForDialog = activeStudents.filter(s => s.shift === 'morning' || s.shift === 'fullday');
    occupiedCountForView = studentsForDialog.length;
    availableCountForView = serviceAllSeats.filter(seatNum => getSeatStatusForView(seatNum, 'morning').isAvailable).length;
    occupiedTitleSuffix = "Morning View";
    availableTitleSuffix = "Morning View";
  } else if (selectedShiftView === 'evening') {
    studentsForDialog = activeStudents.filter(s => s.shift === 'evening' || s.shift === 'fullday');
    occupiedCountForView = studentsForDialog.length;
    availableCountForView = serviceAllSeats.filter(seatNum => getSeatStatusForView(seatNum, 'evening').isAvailable).length;
    occupiedTitleSuffix = "Evening View";
    availableTitleSuffix = "Evening View";
  } else if (selectedShiftView === 'fullday_occupied') {
    studentsForDialog = activeStudents.filter(s => s.shift === 'fullday');
    occupiedCountForView = studentsForDialog.length;
    availableCountForView = availableForFullDayBookingCount; // Use the specifically fetched count
    occupiedTitleSuffix = "Full Day Students";
    availableTitleSuffix = "Full Day Booking";
  }

  const totalSeatsInLayout = serviceAllSeats.length;
  
  const handleOpenAvailableSeatsDialog = async () => {
    setIsLoadingDialogSeats(true);
    setShowAvailableSeatsDialog(true);
    try {
      const targetShift = selectedShiftView === 'fullday_occupied' ? 'fullday' : selectedShiftView;
      const seats = await getAvailableSeats(targetShift);
      setDialogSeatList(seats);
    } catch (e) {
      toast({ title: "Error", description: `Could not load available seats.`, variant: "destructive"});
      setDialogSeatList([]);
    } finally {
      setIsLoadingDialogSeats(false);
    }
  };


  return (
    <>
      <PageTitle title="Seat Availability & Occupancy" description="View seat status based on selected shift." />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Physical Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalSeatsInLayout}</p>
            <p className="text-xs text-muted-foreground pt-1">Capacity of study hall</p>
          </CardContent>
        </Card>

        <Dialog open={showOccupiedSeatsDialog} onOpenChange={setShowOccupiedSeatsDialog}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Occupied for {occupiedTitleSuffix}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">{occupiedCountForView}</p>
                 <p className="text-xs text-muted-foreground pt-1">Students in selected view</p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
              <DialogTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5" /> Students for {occupiedTitleSuffix}</DialogTitle>
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
                  {studentsForDialog.map((student) => (
                    <TableRow key={student.studentId} className={student.feeStatus === 'Overdue' ? "bg-destructive/5" : ""}>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>{student.seatNumber}</TableCell>
                      <TableCell className="capitalize">{student.shift}</TableCell>
                    </TableRow>
                  ))}
                  {studentsForDialog.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No students occupying seats for this view.
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
            <Card className="cursor-pointer hover:shadow-lg transition-shadow shadow-md" onClick={handleOpenAvailableSeatsDialog}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Armchair className="mr-2 h-4 w-4" />
                  Available for {availableTitleSuffix}
                  </CardTitle>
              </CardHeader>
              <CardContent>
                 <p className="text-3xl font-bold text-green-600">
                   {isLoadingDialogSeats && selectedShiftView === 'fullday_occupied' ? <Loader2 className="h-7 w-7 animate-spin inline-block" /> : availableCountForView}
                 </p>
                 <p className="text-xs text-muted-foreground pt-1">
                    {selectedShiftView === 'fullday_occupied' ? 'Seats available for full day booking' : `Seats available in ${selectedShiftView} shift`}
                 </p>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
               <DialogTitle className="flex items-center"><Armchair className="mr-2 h-5 w-5" />
                 Available Seats for {availableTitleSuffix}
               </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {isLoadingDialogSeats ? <div className="flex justify-center p-4"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div> : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Seat Number</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {dialogSeatList.map((seat) => (
                    <TableRow key={seat}><TableCell className="font-medium">{seat}</TableCell></TableRow>
                  ))}
                  {dialogSeatList.length === 0 && (
                      <TableRow><TableCell className="text-center text-muted-foreground">No seats available for this view.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle>Shift View Selector</CardTitle>
          <CardDescription>Select a shift to see its specific occupancy and availability.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedShiftView}
            onValueChange={(value) => setSelectedShiftView(value as ShiftView)}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="morning" id="morning-view" />
              <Label htmlFor="morning-view" className="flex items-center"><Sunrise className="mr-2 h-4 w-4 text-orange-500"/>Morning Shift View</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="evening" id="evening-view" />
              <Label htmlFor="evening-view" className="flex items-center"><Sunset className="mr-2 h-4 w-4 text-purple-500"/>Evening Shift View</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fullday_occupied" id="fullday-view" />
              <Label htmlFor="fullday-view" className="flex items-center"><Sun className="mr-2 h-4 w-4 text-yellow-500"/>Full Day Occupancy View</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading seat data...</p>
        </div>
      ) : (
        <>
          <Card className="mt-6 shadow-lg">
            <CardHeader>
              <CardTitle>Seat Layout ({selectedShiftView.replace('_occupied', '').replace(/^\w/, c => c.toUpperCase())} View)</CardTitle>
              <CardDescription>Visual representation of seat occupancy for the selected view.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center space-x-4 mb-4 text-xs sm:text-sm">
                <div className="flex items-center mr-2 mb-1 sm:mb-0">
                  <Circle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 fill-sky-200 text-sky-300" />
                  <span>Available for this view</span>
                </div>
                <div className="flex items-center mr-2 mb-1 sm:mb-0">
                  <Sunrise className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-orange-500" />
                  <Circle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 fill-orange-200 text-orange-300" />
                  <span>Morning Shift Occupied</span>
                </div>
                <div className="flex items-center mr-2 mb-1 sm:mb-0">
                  <Sunset className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-purple-500" />
                   <Circle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 fill-purple-200 text-purple-300" />
                  <span>Evening Shift Occupied</span>
                </div>
                <div className="flex items-center mb-1 sm:mb-0">
                  <Sun className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-yellow-500" />
                  <Circle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 fill-yellow-200 text-yellow-300" />
                  <span>Full Day Occupied</span>
                </div>
              </div>
              <div className="grid grid-cols-10 gap-2 sm:gap-3 md:grid-cols-12 lg:grid-cols-15 xl:grid-cols-17">
                {serviceAllSeats.map((seatNum) => {
                  const { student, colorClass } = getSeatStatusForView(seatNum, selectedShiftView);
                  return (
                    <Badge
                      key={seatNum}
                      variant="outline"
                      className={cn(
                        "flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 text-xs sm:text-sm rounded-md transition-colors font-medium",
                        colorClass,
                        "cursor-default" 
                      )}
                      title={student ? `${seatNum} - ${student.name} (${student.shift})` : `${seatNum} - Available for ${selectedShiftView.replace('_occupied','')} view`}
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

