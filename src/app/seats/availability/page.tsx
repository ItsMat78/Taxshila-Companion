
"use client";

import * as React from 'react';
import Link from 'next/link';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Armchair, Users, UserCheck, Loader2, Circle, Sunrise, Sunset, Sun, Briefcase, Edit, UserCircle as UserProfileIcon, PhoneIcon } from 'lucide-react';
import { getAvailableSeatsFromList, getAllStudents } from '@/services/student-service';
import { ALL_SEAT_NUMBERS as serviceAllSeats } from '@/config/seats';
import type { Student, Shift } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ShiftView = Shift | 'fullday_occupied';
type SeatStatusKey = "available" | "morning" | "evening" | "fullday" | "split";

const SEAT_STYLES: Record<SeatStatusKey, { bgClass: string; textClass: string; borderClass: string; icon?: React.ElementType }> = {
  available: {
    bgClass: 'bg-seat-available hover:opacity-80',
    textClass: 'text-seat-available-foreground',
    borderClass: 'border-seat-available',
    icon: undefined
  },
  morning: {
    bgClass: 'bg-seat-morning hover:opacity-80',
    textClass: 'text-seat-morning-foreground',
    borderClass: 'border-seat-morning',
    icon: Sunrise
  },
  evening: {
    bgClass: 'bg-seat-evening hover:opacity-80',
    textClass: 'text-seat-evening-foreground',
    borderClass: 'border-seat-evening',
    icon: Sunset
  },
  fullday: {
    bgClass: 'bg-seat-fullday hover:opacity-80',
    textClass: 'text-seat-fullday-foreground',
    borderClass: 'border-seat-fullday',
    icon: Sun
  },
  split: {
    bgClass: 'bg-diagonal-split hover:opacity-80',
    textClass: 'text-seat-morning-foreground dark:text-seat-morning-foreground', // Keeping it consistent
    borderClass: 'border-t-seat-morning border-l-seat-morning border-b-seat-evening border-r-seat-evening',
    icon: Users
  },
};

export default function SeatAvailabilityPage() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedShiftView, setSelectedShiftView] = React.useState<ShiftView>('morning');
  
  const [occupiedMorningStudentsCount, setOccupiedMorningStudentsCount] = React.useState(0);
  const [occupiedEveningStudentsCount, setOccupiedEveningStudentsCount] = React.useState(0);
  const [occupiedFullDayStudentsCount, setOccupiedFullDayStudentsCount] = React.useState(0);
  
  const [availableMorningSlotsCount, setAvailableMorningSlotsCount] = React.useState(0);
  const [availableEveningSlotsCount, setAvailableEveningSlotsCount] = React.useState(0);
  const [availableForFullDayBookingCount, setAvailableForFullDayBookingCount] = React.useState(0);
  const [isLoadingOverallAvailableStats, setIsLoadingOverallAvailableStats] = React.useState(true);


  const [showOccupiedSeatsDialog, setShowOccupiedSeatsDialog] = React.useState(false);
  const [showAvailableSeatsDialog, setShowAvailableSeatsDialog] = React.useState(false);
  const [dialogOccupiedStudentList, setDialogOccupiedStudentList] = React.useState<Student[]>([]);
  const [dialogAvailableSeatList, setDialogAvailableSeatList] = React.useState<string[]>([]);
  const [isLoadingDialogSeats, setIsLoadingDialogSeats] = React.useState(false);

  const activeStudents = React.useMemo(() => allStudents.filter(s => s.activityStatus === "Active"), [allStudents]);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setIsLoadingOverallAvailableStats(true);
      try {
        const studentsData = await getAllStudents();
        setAllStudents(studentsData);

        const activeSeatHolders = studentsData.filter(s => s.activityStatus === "Active" && s.seatNumber);
        
        setOccupiedMorningStudentsCount(activeSeatHolders.filter(s => s.shift === 'morning').length);
        setOccupiedEveningStudentsCount(activeSeatHolders.filter(s => s.shift === 'evening').length);
        setOccupiedFullDayStudentsCount(activeSeatHolders.filter(s => s.shift === 'fullday').length);
        
        const [morningAvail, eveningAvail, fulldayAvail] = await Promise.all([
          getAvailableSeatsFromList('morning', studentsData),
          getAvailableSeatsFromList('evening', studentsData),
          getAvailableSeatsFromList('fullday', studentsData)
        ]);
        setAvailableMorningSlotsCount(morningAvail.length);
        setAvailableEveningSlotsCount(eveningAvail.length);
        setAvailableForFullDayBookingCount(fulldayAvail.length);
        
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast({
          title: "Error",
          description: "Could not load initial seat and student data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsLoadingOverallAvailableStats(false);
      }
    };
    fetchData();
  }, [toast]);

  const handleOpenOccupiedSeatsDialog = () => {
    let studentsToList: Student[];
    if (selectedShiftView === 'morning') {
      studentsToList = activeStudents.filter(s => s.seatNumber && (s.shift === 'morning' || s.shift === 'fullday'));
    } else if (selectedShiftView === 'evening') {
      studentsToList = activeStudents.filter(s => s.seatNumber && (s.shift === 'evening' || s.shift === 'fullday'));
    } else { // fullday_occupied
      studentsToList = activeStudents.filter(s => s.seatNumber && s.shift === 'fullday');
    }
    setDialogOccupiedStudentList(studentsToList.sort((a,b) => parseInt(a.seatNumber!) - parseInt(b.seatNumber!)));
    setShowOccupiedSeatsDialog(true);
  };
  
  const handleOpenAvailableSeatsDialog = async () => {
    setIsLoadingDialogSeats(true);
    setShowAvailableSeatsDialog(true);
    try {
      const targetShift = selectedShiftView === 'fullday_occupied' ? 'fullday' : selectedShiftView;
      const seats = await getAvailableSeatsFromList(targetShift, allStudents);
      setDialogAvailableSeatList(seats.sort((a,b) => parseInt(a) - parseInt(b)));
    } catch (e) {
      toast({ title: "Error", description: `Could not load available seats.`, variant: "destructive"});
      setDialogAvailableSeatList([]);
    } finally {
      setIsLoadingDialogSeats(false);
    }
  };

  const getSeatStatusKey = (seatNumber: string, view: ShiftView): SeatStatusKey => {
    const studentMorning = activeStudents.find(s => s.seatNumber === seatNumber && s.shift === 'morning');
    const studentEvening = activeStudents.find(s => s.seatNumber === seatNumber && s.shift === 'evening');
    const studentFullDay = activeStudents.find(s => s.seatNumber === seatNumber && s.shift === 'fullday');

    if (view === 'morning') {
        if (studentFullDay) return 'fullday';
        if (studentMorning) return 'morning';
    } else if (view === 'evening') {
        if (studentFullDay) return 'fullday';
        if (studentEvening) return 'evening';
    } else if (view === 'fullday_occupied') {
        if (studentFullDay) return 'fullday';
        if (studentMorning && studentEvening) return 'split';
        if (studentMorning) return 'morning';
        if (studentEvening) return 'evening';
    }

    return 'available';
  };
  
  const occupiedDialogTitle = React.useMemo(() => {
    if (selectedShiftView === 'morning') return "Students (Morning View)";
    if (selectedShiftView === 'evening') return "Students (Evening View)";
    if (selectedShiftView === 'fullday_occupied') return "Students (Full Day)";
    return "Occupied By";
  }, [selectedShiftView]);

  const availableDialogTitle = React.useMemo(() => {
    if (selectedShiftView === 'morning') return "Available Seats (Morning Shift)";
    if (selectedShiftView === 'evening') return "Available Seats (Evening Shift)";
    if (selectedShiftView === 'fullday_occupied') return "Available Seats (Full Day Booking)";
    return "Available Seats";
  }, [selectedShiftView]);

  const getShiftViewLabel = (view: ShiftView) => {
    switch(view) {
      case 'morning': return 'Morning Shift';
      case 'evening': return 'Evening Shift';
      case 'fullday_occupied': return 'Full Day Bookings';
      default: return 'Selected View';
    }
  };

  return (
    <>
      <PageTitle title="Seat Availability & Occupancy" description="Overall hall status and shift-specific seat layout." />
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Briefcase className="mr-2 h-4 w-4 flex-shrink-0" />
              Total Daily Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{serviceAllSeats.length * 2}</p>
            <p className="text-xs text-muted-foreground pt-1">Across morning & evening shifts</p>
          </CardContent>
        </Card>

        <Dialog open={showOccupiedSeatsDialog} onOpenChange={setShowOccupiedSeatsDialog}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow shadow-md" onClick={handleOpenOccupiedSeatsDialog}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Users className="mr-2 h-4 w-4 flex-shrink-0" />
                  Occupied Slots
                </CardTitle>
                <CardDescription className="text-xs">Click to view details for '{getShiftViewLabel(selectedShiftView)}'</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1 pt-2">
                {isLoading ? <div className="flex justify-center py-1"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
                  <>
                    <div className="flex justify-between"><span>Morning:</span> <span className="font-semibold">{occupiedMorningStudentsCount} students</span></div>
                    <div className="flex justify-between"><span>Evening:</span> <span className="font-semibold">{occupiedEveningStudentsCount} students</span></div>
                    <div className="flex justify-between"><span>Full Day:</span> <span className="font-semibold">{occupiedFullDayStudentsCount} students</span></div>
                  </>
                )}
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
              <DialogTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5" />{occupiedDialogTitle}</DialogTitle>
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
                  {dialogOccupiedStudentList.map((student) => (
                    <TableRow key={student.studentId} className={student.feeStatus === 'Overdue' ? "bg-destructive/5" : ""}>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.phone}</TableCell>
                      <TableCell>{student.seatNumber}</TableCell>
                      <TableCell className="capitalize">{student.shift}</TableCell>
                    </TableRow>
                  ))}
                  {dialogOccupiedStudentList.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
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
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Armchair className="mr-2 h-4 w-4 flex-shrink-0" />
                  Available Booking Slots
                </CardTitle>
                <CardDescription className="text-xs">Click to view details for '{getShiftViewLabel(selectedShiftView)}'</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1 pt-2">
                 {isLoadingOverallAvailableStats ? <div className="flex justify-center py-1"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
                  <>
                    <div className="flex justify-between"><span>Morning:</span> <span className="font-semibold">{availableMorningSlotsCount} slots</span></div>
                    <div className="flex justify-between"><span>Evening:</span> <span className="font-semibold">{availableEveningSlotsCount} slots</span></div>
                    <div className="flex justify-between"><span>Full Day:</span> <span className="font-semibold">{availableForFullDayBookingCount} slots</span></div>
                  </>
                )}
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
               <DialogTitle className="flex items-center"><Armchair className="mr-2 h-5 w-5" />
                 {availableDialogTitle}
               </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {isLoadingDialogSeats ? <div className="flex justify-center p-4"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></div> : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Seat Number</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {dialogAvailableSeatList.map((seat) => (
                    <TableRow key={seat}><TableCell className="font-medium">{seat}</TableCell></TableRow>
                  ))}
                  {dialogAvailableSeatList.length === 0 && (
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
          <CardDescription>Select a shift to see its specific occupancy in the layout below. Dialogs will also reflect this selection.</CardDescription>
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
              <CardTitle>Seat Layout ({getShiftViewLabel(selectedShiftView)})</CardTitle>
              <CardDescription>Visual representation of seat occupancy for the selected view. Click a seat for more details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-xs sm:text-sm">
                <div className="flex items-center flex-shrink-0">
                  <Circle className="h-4 w-4 flex-shrink-0 mr-1.5 fill-seat-available text-seat-available" />
                  <span>Available</span>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <Circle className="h-4 w-4 flex-shrink-0 mr-1.5 fill-seat-morning text-seat-morning" />
                  <span>Morning Shift</span>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <Circle className="h-4 w-4 flex-shrink-0 mr-1.5 fill-seat-evening text-seat-evening" />
                  <span>Evening Shift</span>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <Circle className="h-4 w-4 flex-shrink-0 mr-1.5 fill-seat-fullday text-seat-fullday" />
                  <span>Full Day</span>
                </div>
                <div className="flex items-center flex-shrink-0">
                  <div className="h-4 w-4 flex-shrink-0 mr-1.5 rounded-sm bg-diagonal-split border-2 border-muted" />
                  <span>Split Shift</span>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1 sm:gap-1.5">
                {serviceAllSeats.map((seatNum) => {
                  const seatStatusKey = getSeatStatusKey(seatNum, selectedShiftView);
                  const styles = SEAT_STYLES[seatStatusKey];
                  const ShiftIcon = styles.icon;
                  const studentsOnThisSeat = activeStudents.filter(s => s.seatNumber === seatNum);
                  const isFemaleOnly = (parseInt(seatNum) >= 18 && parseInt(seatNum) <= 27) || (parseInt(seatNum) >= 50 && parseInt(seatNum) <= 58) || (parseInt(seatNum) == 84);

                  return (
                    <Popover key={seatNum}>
                      <PopoverTrigger asChild>
                        <div
                          className={cn(
                            "relative flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 text-xs sm:text-sm rounded-md border-2 transition-colors font-medium cursor-pointer",
                            styles.bgClass,
                            styles.borderClass,
                            isFemaleOnly && "female-only-seat"
                          )}
                          title={studentsOnThisSeat.length > 0 ? `Seat ${seatNum} - Click for details` : `Seat ${seatNum} - Available`}
                        >
                          {ShiftIcon && <ShiftIcon className={cn("absolute top-1 right-1 h-3 w-3", styles.textClass)} />}
                          <span className={cn(styles.textClass)}>{seatNum}</span>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" side="top" align="center">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-md">Seat {seatNum}</h4>
                          {studentsOnThisSeat.length > 0 ? (
                            studentsOnThisSeat.map(student => (
                              <div key={student.studentId} className="border-b pb-2 last:border-b-0 last:pb-0">
                                <p className="text-sm font-medium">{student.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  Shift: {student.shift}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Phone: {student.phone}
                                </p>
                                <div className="mt-2 flex space-x-2">
                                  <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                                    <Button variant="outline" size="sm">
                                      <UserProfileIcon className="mr-1 h-3 w-3" /> Profile
                                    </Button>
                                  </Link>
                                  <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                                    <Button variant="outline" size="sm">
                                      <Edit className="mr-1 h-3 w-3" /> Edit
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              This seat is currently unassigned and fully available.
                            </p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
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
