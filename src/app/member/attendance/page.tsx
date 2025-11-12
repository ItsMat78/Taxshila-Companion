
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Calendar as CalendarIconComponent } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BarChart3, Clock, LogIn, LogOut, TrendingUp, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid3x3 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, getAttendanceForDate, getStudentByCustomId, getAttendanceForDateRange } from '@/services/student-service';
import type { Student, AttendanceRecord } from '@/types/student';
import { format, parseISO, isValid, differenceInMilliseconds, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isAfter, isToday, getHours, getMinutes, getDay, addDays } from 'date-fns';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar } from 'recharts';
import {
  Tooltip as ShadcnTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from '@/lib/utils';


const ChartTooltipContent = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const hours = payload[0].value;
    const minutes = Math.round((hours % 1) * 60);
    return (
      <div className="p-2 bg-popover text-popover-foreground border rounded-md shadow-md text-sm">
        <p className="font-semibold">{format(parseISO(label), 'PP')}</p>
        <p>
          {payload[0].name}: {Math.floor(hours)} hr {minutes} min
        </p>
      </div>
    );
  }

  return null;
};

// New Component for GitHub-style grid
const StudyGrid = ({ data }: { data: { date: string; hours: number }[] }) => {
    if (!data.length) return null;

    const getIntensityClass = (hours: number) => {
        if (hours <= 0) return 'bg-muted/30';
        if (hours < 3) return 'bg-primary/20';
        if (hours < 6) return 'bg-primary/50';
        if (hours < 9) return 'bg-primary/70';
        return 'bg-primary';
    };

    const firstDayOfMonth = getDay(parseISO(data[0].date)); // 0=Sun, 1=Mon, ...
    const emptyCells = Array.from({ length: firstDayOfMonth }).map((_, i) => (
        <div key={`empty-${i}`} className="h-4 w-4 rounded-sm" />
    ));

    return (
         <TooltipProvider>
            <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex justify-center">
                    <div className="grid grid-flow-col grid-rows-7 grid-cols-[repeat(auto-fill,minmax(1rem,1fr))] gap-1 items-center">
                        {emptyCells}
                        {data.map(({ date, hours }) => (
                            <ShadcnTooltip key={date}>
                                <TooltipTrigger asChild>
                                    <div className={cn("h-4 w-4 rounded-sm", getIntensityClass(hours))} />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-sm font-semibold">{format(parseISO(date), 'MMM d, yyyy')}</p>
                                    <p className="text-xs">
                                        {Math.floor(hours)} hr {Math.round((hours % 1) * 60)} min
                                    </p>
                                </TooltipContent>
                            </ShadcnTooltip>
                        ))}
                    </div>
                </div>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Less</span>
                    <div className="h-3 w-3 rounded-sm bg-muted/30" />
                    <div className="h-3 w-3 rounded-sm bg-primary/20" />
                    <div className="h-3 w-3 rounded-sm bg-primary/50" />
                    <div className="h-3 w-3 rounded-sm bg-primary/70" />
                    <div className="h-3 w-3 rounded-sm bg-primary" />
                    <span>More</span>
                </div>
            </div>
        </TooltipProvider>
    );
};


export default function MemberAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  
  const [currentStudent, setCurrentStudent] = React.useState<Student | null>(null);
  const [attendanceForDay, setAttendanceForDay] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [isLoadingActiveCheckIn, setIsLoadingActiveCheckIn] = React.useState(true);
  const [monthlyStudyData, setMonthlyStudyData] = React.useState<{ date: string; hours: number }[]>([]);
  const [isLoadingMonthlyStudyData, setIsLoadingMonthlyStudyData] = React.useState(true);
  
  const [viewedMonth, setViewedMonth] = React.useState(new Date());
  const [showMonthlyStudyTime, setShowMonthlyStudyTime] = React.useState(false);
  const [showAttendanceOverview, setShowAttendanceOverview] = React.useState(false);
  const [monthlyViewMode, setMonthlyViewMode] = React.useState<'chart' | 'grid'>('chart');


    const handlePrevMonth = () => {
        setViewedMonth((prev) => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setViewedMonth((prev) => addMonths(prev, 1));
    };

  const fetchStudentData = React.useCallback(async () => {
    if (user?.studentId || user?.email) {
      try {
        let student = null;
        if (user.studentId) {
          student = await getStudentByCustomId(user.studentId);
        } else if (user.email) {
          student = await getStudentByEmail(user.email);
        }

        if (student) {
          setCurrentStudent(student);
          return student; // Return the fetched student
        } else {
          toast({
            title: "Student Record Not Found",
            description: "Could not find a student record associated with your account.",
            variant: "destructive",
          });
          setCurrentStudent(null);
          return null;
        }
      } catch (error: any) {
        console.error("Error fetching student data (Attendance Page):", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch student details.",
          variant: "destructive",
          });
        setCurrentStudent(null);
        return null;
      }
    }
    return null;
  }, [user, toast]);
  

  React.useEffect(() => {
    fetchStudentData().finally(() => {
        setIsLoadingActiveCheckIn(false);
    });
  }, [fetchStudentData]);

  const getDailyStudyDataForMonth = React.useCallback(async (student: Student, month: Date) => {
    setIsLoadingMonthlyStudyData(true);
    try {
        const startDate = startOfMonth(month);
        const endDate = endOfMonth(month);
        
        const recordsForMonth = await getAttendanceForDateRange(student.studentId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
        const dailyHoursMap = new Map<string, number>();

        recordsForMonth.forEach(record => {
             if (!record || !record.checkInTime) return;

            const checkInDate = parseISO(record.checkInTime);
            if (!isValid(checkInDate)) return;
            
            let totalMilliseconds = 0;
            let sessionEndDate: Date;
            const now = new Date();

            if (record.checkOutTime && isValid(parseISO(record.checkOutTime))) {
                sessionEndDate = parseISO(record.checkOutTime);
            } else {
                 let shiftEndHour = 21;
                 let shiftEndMinute = 30;

                 if (student.shift === 'morning') {
                     shiftEndHour = 14;
                     shiftEndMinute = 0;
                 }
                
                const shiftEndTimeOnDate = new Date(checkInDate);
                shiftEndTimeOnDate.setHours(shiftEndHour, shiftEndMinute, 0, 0);

                if (isToday(checkInDate)) {
                    sessionEndDate = isAfter(now, shiftEndTimeOnDate) ? shiftEndTimeOnDate : now;
                } else {
                    sessionEndDate = shiftEndTimeOnDate;
                }
            }
            if (isAfter(sessionEndDate, checkInDate)) {
              totalMilliseconds += differenceInMilliseconds(sessionEndDate, checkInDate);
            }
            const dateKey = format(checkInDate, 'yyyy-MM-dd');
            dailyHoursMap.set(dateKey, (dailyHoursMap.get(dateKey) || 0) + totalMilliseconds);
        });

        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        const studyData = allDays.map(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            const totalMilliseconds = dailyHoursMap.get(dateString) || 0;
            const totalHours = totalMilliseconds / (1000 * 60 * 60);
            return { date: dateString, hours: totalHours };
        });
        setMonthlyStudyData(studyData);
    } catch (error) {
        console.error("Error fetching daily study data:", error);
        toast({ title: "Chart Error", description: "Could not load monthly study data.", variant: "destructive" });
    } finally {
        setIsLoadingMonthlyStudyData(false);
    }
}, [toast]);


  React.useEffect(() => {
    if (currentStudent?.studentId && showMonthlyStudyTime) {
      getDailyStudyDataForMonth(currentStudent, viewedMonth);
    }
  }, [currentStudent, viewedMonth, getDailyStudyDataForMonth, showMonthlyStudyTime]);

  const calculateDailyStudyTime = (records: AttendanceRecord[], studentShift: Student['shift']) => {
    let totalMilliseconds = 0;
    records.forEach(record => {
      if (record.checkInTime && isValid(parseISO(record.checkInTime))) {
        const checkInTime = parseISO(record.checkInTime);
        let checkOutTimeCalc: Date;

        if (record.checkOutTime && isValid(parseISO(record.checkOutTime))) {
            checkOutTimeCalc = parseISO(record.checkOutTime);
        } else {
            let shiftEndHour = 21, shiftEndMinute = 30;
            if (studentShift === 'morning') {
                shiftEndHour = 14; shiftEndMinute = 0;
            }
            
            const now = new Date();
            const shiftEndTimeOnDate = new Date(checkInTime);
            shiftEndTimeOnDate.setHours(shiftEndHour, shiftEndMinute, 0, 0);

            if(isToday(checkInTime)) {
                checkOutTimeCalc = isAfter(now, shiftEndTimeOnDate) ? shiftEndTimeOnDate : now;
            } else {
                checkOutTimeCalc = shiftEndTimeOnDate;
            }
        }
        
        if (isAfter(checkOutTimeCalc, checkInTime)) {
          totalMilliseconds += differenceInMilliseconds(checkOutTimeCalc, checkInTime);
        }
      }
    });

    const totalHours = totalMilliseconds / (1000 * 60 * 60);
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    return { hours, minutes, totalHours };
  };

  const fetchAttendanceForSelectedDate = React.useCallback(async () => {
    if (currentStudent?.studentId && date && showAttendanceOverview) {
      setIsLoadingDetails(true);
      try {
        const records = await getAttendanceForDate(currentStudent.studentId, format(date, 'yyyy-MM-dd'));
        setAttendanceForDay(records);
      } catch (error: any) {
        console.error("Error fetching attendance for date (Attendance Page):", error);
        toast({
          title: "Error Fetching Attendance",
          description: error.message || "Could not load attendance for the selected date.",
          variant: "destructive",
        });
        setAttendanceForDay([]);
      } finally {
        setIsLoadingDetails(false);
      }
    }
  }, [currentStudent, date, showAttendanceOverview, toast]);

  React.useEffect(() => {
    fetchAttendanceForSelectedDate();
  }, [fetchAttendanceForSelectedDate]);

  return (
    <>
      <PageTitle
        title="My Attendance"
        description="View your calendar and track your study hours"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="shadow-lg w-full overflow-hidden">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <div>
                        <CardTitle className="flex items-center text-base sm:text-lg">
                            <TrendingUp className="mr-2 h-5 w-5" />
                            Hours every day
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">Hours studied per day for the selected month.</CardDescription>
                    </div>
                    {showMonthlyStudyTime && (
                       <ToggleGroup
                            type="single"
                            variant="outline"
                            value={monthlyViewMode}
                            onValueChange={(value: 'chart' | 'grid') => { if(value) setMonthlyViewMode(value) }}
                            size="sm"
                        >
                            <ToggleGroupItem value="chart" aria-label="Chart view">
                                <BarChart3 className="h-4 w-4" />
                            </ToggleGroupItem>
                            <ToggleGroupItem value="grid" aria-label="Grid view">
                                <Grid3x3 className="h-4 w-4" />
                            </ToggleGroupItem>
                        </ToggleGroup>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {!showMonthlyStudyTime ? (
                    <Button
                        onClick={() => setShowMonthlyStudyTime(true)}
                        className="h-24 w-full text-lg flex flex-col gap-2"
                        variant="outline"
                    >
                        <BarChart3 className="h-8 w-8" />
                        <span className="text-sm font-medium">Show Chart</span>
                    </Button>
                ) : isLoadingMonthlyStudyData ? (
                    <div className="flex items-center justify-center h-[300px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                    </div>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center space-x-2 justify-center mb-4">
                        <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isLoadingMonthlyStudyData}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium w-32 text-center">{format(viewedMonth, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoadingMonthlyStudyData}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    {monthlyStudyData.length > 0 && monthlyStudyData.some(d => d.hours > 0) ? (
                         <div className="min-h-[300px] w-full flex items-center justify-center">
                            {monthlyViewMode === 'chart' ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={monthlyStudyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tickFormatter={(date) => format(parseISO(date), 'dd')} tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            width={50}
                                            tickFormatter={(value) => `${value}h`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                                            content={<ChartTooltipContent />}
                                        />
                                        <Bar dataKey="hours" name="Hours Studied" fill="hsl(var(--primary))" radius={4} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <StudyGrid data={monthlyStudyData} />
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-10 h-[300px] flex items-center justify-center">No study history data available for this month.</p>
                    )}
                  </div>
                )}
            </CardContent>
        </Card>
      
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center text-base sm:text-lg">
                <CalendarIcon className="mr-2 h-5 w-5" />
                Daily Check-in/out time
                </CardTitle>
                <CardDescription className="text-xs">Select a date on the calendar to view your check-in and check-out times for that day.</CardDescription>
            </CardHeader>
            <CardContent>
                {!showAttendanceOverview ? (
                    <Button
                        onClick={() => setShowAttendanceOverview(true)}
                        className="h-24 w-full text-lg flex flex-col gap-2"
                        variant="outline"
                    >
                        <CalendarIcon className="h-8 w-8" />
                        <span className="text-sm font-medium">Show Calendar</span>
                    </Button>
                ) : (
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="w-full md:w-auto flex justify-center">
                            <CalendarIconComponent
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border shadow-inner"
                                modifiers={{ today: new Date() }}
                                modifiersStyles={{ today: { color: 'hsl(var(--accent-foreground))', backgroundColor: 'hsl(var(--accent))' } }}
                                disabled={!currentStudent?.studentId}
                            />
                        </div>
                        <div className="w-full md:flex-1">
                            <h4 className="text-md font-semibold mb-2">Details for {date ? format(date, 'PPP') : 'selected date'}:</h4>
                            {isLoadingDetails ? (
                            <div className="flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading details...</div>
                            ) : (
                            <>
                                <div className="mb-4 text-lg font-semibold text-primary">
                                Total study time: {(() => { const { hours, minutes } = calculateDailyStudyTime(attendanceForDay, currentStudent?.shift); return `${hours} hr ${minutes} min`; })()}
                                </div>

                                {attendanceForDay.length === 0 ? (
                                <p className="text-muted-foreground">No attendance records found for this day.</p>
                                ) : (
                                <ul className="space-y-3">
                                    {attendanceForDay.map(record => (
                                    <li key={record.recordId} className="p-3 border rounded-md bg-muted/30">
                                        <div className="flex items-center justify-between">
                                        <div className="flex items-center"><LogIn className="mr-2 h-4 w-4 text-green-600" /><span className="font-medium">Checked In:</span></div>
                                        <span className="text-sm">{record.checkInTime && isValid(parseISO(record.checkInTime)) ? format(parseISO(record.checkInTime), 'p') : 'N/A'}</span>
                                        </div>
                                        {record.checkOutTime && isValid(parseISO(record.checkOutTime)) ? (
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center"><LogOut className="mr-2 h-4 w-4 text-red-600" /><span className="font-medium">Checked Out:</span></div>
                                            <span className="text-sm">{format(parseISO(record.checkOutTime), 'p')}</span>
                                        </div>
                                        ) : (
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center"><Clock className="mr-2 h-4 w-4 text-yellow-500" /><span className="font-medium">Status:</span></div>
                                            <span className="text-sm text-yellow-600">Currently Checked In</span>
                                        </div>
                                        )}
                                    </li>
                                    ))}
                                </ul>
                                )}
                            </>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}

    