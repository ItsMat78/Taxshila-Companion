
"use client";

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Armchair, Users, Loader2, Circle, Sunrise, Sunset, Sun, Edit, User, View, CheckCircle2 } from 'lucide-react';
import { getStudentSeatAssignments, getTodaysActiveAttendanceRecords, processCheckedInStudentsFromSnapshot } from '@/services/student-service';
import type { Student, Shift, StudentSeatAssignment, CheckedInStudentInfo } from '@/types/student';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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

const SeatLayout = [
    '10', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall',
    '11', '84', 'Gap', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall',
    '12', '23', 'Gap', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall',
    '13', '22', 'Gap', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', 'Wall', '40', '49',
    '14', '21', 'Gap', '24', '31', 'Gap', '32', '39', 'Gap', '41', '48',
    '15', '20', 'Gap', '25', '30', 'Gap', '33', '38', 'Gap', '42', '47',
    '16', '19', 'Gap', '26', '29', 'Gap', '34', '37', 'Gap', '43', '46',
    '17', '18', 'Gap', '27', '28', 'Gap', '35', '36', 'Gap', '44', '45',
    'Gap', 'Gap', 'Gap', 'Gap', 'Gap', 'Gap', 'Gap', 'Gap', 'Gap', 'Gap', 'Gap',
    'Gap', 'Gap', 'Gap', '58', '59', 'Gap', '68', '69', 'Gap', '78', '79',
    'Gap', '53', 'Gap', '57', '60', 'Gap', '67', '70', 'Gap', '77', '80',
    'Gap', '52', 'Gap', '56', '61', 'Gap', '66', '71', 'Gap', '76', '81',
    'Gap', '51', 'Gap', '55', '62', 'Gap', '65', '72', 'Gap', '75', '82',
    'Gap', '50', 'Gap', '54', '63', 'Gap', '64', '73', 'Gap', '74', '83'
];


export default function SeatAvailabilityPage() {
  const { toast } = useToast();
  const [seatAssignments, setSeatAssignments] = React.useState<StudentSeatAssignment[]>([]);
  const [checkedInStudents, setCheckedInStudents] = React.useState<CheckedInStudentInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const occupiedMorningStudentsCount = seatAssignments.filter(s => s.shift === 'morning').length;
  const occupiedEveningStudentsCount = seatAssignments.filter(s => s.shift === 'evening').length;
  const occupiedFullDayStudentsCount = seatAssignments.filter(s => s.shift === 'fullday').length;
  
  const occupiedSeatsMorning = new Set(seatAssignments.filter(s => s.seatNumber && (s.shift === 'morning' || s.shift === 'fullday')).map(s => s.seatNumber));
  const occupiedSeatsEvening = new Set(seatAssignments.filter(s => s.seatNumber && (s.shift === 'evening' || s.shift === 'fullday')).map(s => s.seatNumber));
  const allOccupiedSeatNumbers = new Set(seatAssignments.filter(s => s.seatNumber).map(s => s.seatNumber));
  
  const totalSeats = SeatLayout.flat().filter(s => s && !['Gap', 'Wall'].includes(s)).length;
  
  const availableMorningSlotsCount = totalSeats - occupiedSeatsMorning.size;
  const availableEveningSlotsCount = totalSeats - occupiedSeatsEvening.size;
  const availableForFullDayBookingCount = totalSeats - allOccupiedSeatNumbers.size;


  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [assignments, attendanceSnapshot] = await Promise.all([
          getStudentSeatAssignments(),
          getTodaysActiveAttendanceRecords()
        ]);
        setSeatAssignments(assignments);
        const checkedIn = await processCheckedInStudentsFromSnapshot(attendanceSnapshot, assignments);
        setCheckedInStudents(checkedIn);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
        toast({
          title: "Error",
          description: "Could not load seat and student data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);


  const getSeatStatusKey = (seatNumber: string): SeatStatusKey => {
    const studentMorning = seatAssignments.find(s => s.seatNumber === seatNumber && s.shift === 'morning');
    const studentEvening = seatAssignments.find(s => s.seatNumber === seatNumber && s.shift === 'evening');
    const studentFullDay = seatAssignments.find(s => s.seatNumber === seatNumber && s.shift === 'fullday');

    if (studentFullDay) return 'fullday';
    if (studentMorning && studentEvening) return 'split';
    if (studentMorning) return 'morning';
    if (studentEvening) return 'evening';

    return 'available';
  };

  const isSeatCurrentlyOccupied = (seatNumber: string): boolean => {
    return checkedInStudents.some(s => s.seatNumber === seatNumber);
  };
  
  const isStudentOnSeatCheckedIn = (studentId: string): boolean => {
    return checkedInStudents.some(s => s.studentId === studentId);
  };

  const renderSeat = (seatNum: string) => {
    const seatStatusKey = getSeatStatusKey(seatNum);
    const styles = SEAT_STYLES[seatStatusKey];
    const ShiftIcon = styles.icon;
    const studentsOnThisSeat = seatAssignments.filter(s => s.seatNumber === seatNum);
    const isFemaleOnly = (parseInt(seatNum) >= 18 && parseInt(seatNum) <= 27) || (parseInt(seatNum) >= 50 && parseInt(seatNum) <= 58) || (parseInt(seatNum) == 84);
    const isCurrentlyOccupied = isSeatCurrentlyOccupied(seatNum);

    return (
        <Popover key={seatNum}>
            <PopoverTrigger asChild disabled={studentsOnThisSeat.length === 0}>
            <div
                className={cn(
                "relative flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 text-xs sm:text-sm rounded-md border-2 transition-colors font-medium",
                studentsOnThisSeat.length > 0 ? "cursor-pointer" : "cursor-default",
                styles.bgClass,
                styles.borderClass,
                isFemaleOnly && "female-only-seat"
                )}
                title={studentsOnThisSeat.length > 0 ? `Seat ${seatNum} - Click for details` : `Seat ${seatNum} - Available`}
            >
                {isCurrentlyOccupied && <span className="absolute top-0.5 left-0.5 block h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" />}
                {ShiftIcon && <ShiftIcon className={cn("absolute top-1 right-1 h-3 w-3", styles.textClass)} />}
                <span className={cn(styles.textClass)}>{seatNum}</span>
            </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" side="top" align="center">
                <div className="p-3">
                    <h4 className="font-semibold text-md mb-2 border-b pb-2 text-center">Seat {seatNum}</h4>
                    <div className="space-y-3">
                        {studentsOnThisSeat.map(student => {
                            const isStudentCheckedIn = isStudentOnSeatCheckedIn(student.studentId);
                            return (
                                <div key={student.studentId} className="space-y-2 border-b pb-3 last:border-b-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <Dialog>
                                        <DialogTrigger asChild>
                                            <div className="cursor-pointer relative group flex-shrink-0">
                                            <Avatar className="h-10 w-10 border">
                                                <AvatarImage src={student.profilePictureUrl || undefined} alt={student.name} data-ai-hint="profile person" />
                                                <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                            </Avatar>
                                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <View className="text-white h-5 w-5"/>
                                            </div>
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md w-auto p-2">
                                            <Image
                                                src={student.profilePictureUrl || "https://placehold.co/400x400.png"}
                                                alt={`${student.name}'s profile picture`}
                                                width={400}
                                                height={400}
                                                className="rounded-md object-contain max-h-[70vh] w-full h-auto"
                                            />
                                        </DialogContent>
                                        </Dialog>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                            {isStudentCheckedIn && <span className="block h-2 w-2 rounded-full bg-green-500" title="Currently Checked In"></span>}
                                            <p className="text-sm font-medium truncate">{student.name}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground capitalize truncate">
                                                Shift: {student.shift}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link href={`/students/profiles/${student.studentId}`} passHref legacyBehavior>
                                            <Button variant="outline" size="sm" className="flex-1">
                                                <User className="mr-1 h-3 w-3" /> Profile
                                            </Button>
                                        </Link>
                                        <Link href={`/admin/students/edit/${student.studentId}`} passHref legacyBehavior>
                                            <Button variant="outline" size="sm" className="flex-1">
                                                <Edit className="mr-1 h-3 w-3" /> Edit
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
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
                <p className="text-xl font-bold">{totalSeats * 2}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Occupied (M/E/FD)</p>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto mt-1" /> : (
                  <p className="text-xl font-bold text-foreground">
                    {occupiedMorningStudentsCount} / {occupiedEveningStudentsCount} / {occupiedFullDayStudentsCount}
                  </p>
                )}
            </div>
            <div className="p-2 rounded-lg bg-muted/50 col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Available Slots (M/E/FD)</p>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto mt-1" /> : (
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
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mr-1.5 text-green-500" />
                  <span>Currently In</span>
                </div>
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
              <div className="overflow-x-auto w-full">
                <div className="grid grid-cols-11 gap-1.5 min-w-[600px] pb-4">
                    {SeatLayout.map((item, index) => {
                        if (item === 'Gap' || item === 'Wall') {
                            return <div key={`wall-${index}`} className="h-10 w-10 sm:h-12 sm:w-12 bg-muted/40 rounded-sm"></div>;
                        }
                        if (item === null) {
                            return null; 
                        }
                        return renderSeat(item);
                    })}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
