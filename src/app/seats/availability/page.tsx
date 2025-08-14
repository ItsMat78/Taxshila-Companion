
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
import { Label } from "@/components/ui/label";
import { Armchair, Users, UserCheck, Loader2, Circle, Sunrise, Sunset, Sun, Briefcase, Edit, UserCircle as UserProfileIcon, PhoneIcon } from 'lucide-react';
import { getAvailableSeatsFromList, getAllStudents } from '@/services/student-service';
import { ALL_SEAT_NUMBERS as serviceAllSeats } from '@/config/seats';
import type { Student, Shift } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


type ShiftView = Shift | 'fullday_occupied';
type SeatStatusKey = "available" | "morning" | "evening" | "fullday" | "split";

const SEAT_STYLES: Record<SeatStatusKey, { bgClass: string; textClass: string; borderClass: string; icon?: React.ElementType }> = {
  available: {
    bgClass: 'bg-seat-available',
    textClass: 'text-seat-available-foreground',
    borderClass: 'border-sky-300 dark:border-sky-700',
    icon: undefined
  },
  morning: {
    bgClass: 'bg-seat-morning',
    textClass: 'text-seat-morning-foreground',
    borderClass: 'border-orange-300 dark:border-orange-700',
    icon: Sunrise
  },
  evening: {
    bgClass: 'bg-seat-evening',
    textClass: 'text-seat-evening-foreground',
    borderClass: 'border-purple-300 dark:border-purple-700',
    icon: Sunset
  },
  fullday: {
    bgClass: 'bg-seat-fullday',
    textClass: 'text-seat-fullday-foreground',
    borderClass: 'border-yellow-300 dark:border-yellow-700',
    icon: Sun
  },
  split: {
    bgClass: 'bg-diagonal-split hover:opacity-80',
    textClass: 'text-seat-morning-foreground', // A specific case for split view text
    borderClass: 'border-t-orange-300 dark:border-t-orange-700 border-l-orange-300 dark:border-l-orange-700 border-b-purple-300 dark:border-b-purple-700 border-r-purple-300 dark:border-r-purple-700',
    icon: Users
  },
};

const getInitials = (name?: string) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
}


export default function SeatAvailabilityPage() {
  const { toast } = useToast();
  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const selectedShiftView: ShiftView = 'fullday_occupied';
  
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
      
      <Card className="mb-6 shadow-md">
        <CardHeader>
            <CardTitle className="text-lg">Hall Statistics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total Daily Slots</p>
                <p className="text-xl font-bold">{serviceAllSeats.length * 2}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Occupied Students</p>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto mt-1" /> : (
                  <>
                    <p className="text-xl font-bold">{activeStudents.length}</p>
                    <p className="text-xs text-muted-foreground">M: {occupiedMorningStudentsCount}, E: {occupiedEveningStudentsCount}, FD: {occupiedFullDayStudentsCount}</p>
                  </>
                )}
            </div>
            <div className="p-2 rounded-lg bg-muted/50 col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Available Slots (M/E/FD)</p>
                {isLoadingOverallAvailableStats ? <Loader2 className="h-5 w-5 animate-spin mx-auto mt-1" /> : (
                    <p className="text-xl font-bold">
                        {availableMorningSlotsCount} / {availableEveningSlotsCount} / {availableForFullDayBookingCount}
                    </p>
                )}
            </div>
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
              <CardTitle>Seat Layout</CardTitle>
              <CardDescription>Visual representation of seat occupancy. Click a seat for more details.</CardDescription>
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
                  const seatStatusKey = getSeatStatusKey(seatNum, 'fullday_occupied');
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
                                <div className="flex items-center gap-3 mb-2">
                                  <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={student.profilePictureUrl || undefined} alt={student.name} data-ai-hint="profile person" />
                                    <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{student.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      Shift: {student.shift}
                                    </p>
                                  </div>
                                </div>
                                
                                <p className="text-xs text-muted-foreground flex items-center">
                                  <PhoneIcon className="mr-1.5 h-3 w-3" /> {student.phone}
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
