
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
import { Loader2, BarChart3, Clock, LogIn, LogOut, TrendingUp, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { getStudentByEmail, calculateMonthlyStudyHours, getAttendanceForDate, getAttendanceRecordsByStudentId, getStudentByCustomId } from '@/services/student-service';
import type { Student, AttendanceRecord } from '@/types/student';
import { format, parseISO, isValid, differenceInMilliseconds, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWithinInterval, isAfter } from 'date-fns';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar } from 'recharts';


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

// New component for the animated number
const AnimatedNumber = ({ value }: { value: number | null }) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    if (value === null) {
      setDisplayValue(0);
      return;
    }
    
    let start = 0;
    const end = value;
    const duration = 1000; // 1 second animation
    const range = end - start;
    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      const current = start + easedProgress * range;
      setDisplayValue(current);
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };
    
    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  if (value === null) return <span className="text-4xl font-bold">N/A</span>;

  const hours = Math.floor(displayValue);
  const decimals = value % 1 !== 0 ? Math.max(0, Math.min(2, (value.toString().split('.')[1] || '').length)) : 0;
  
  return <span className="text-4xl font-bold">{displayValue.toFixed(decimals)}</span>;
};


export default function MemberAttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  
  const [currentStudent, setCurrentStudent] = React.useState<Student | null>(null);
  const [attendanceForDay, setAttendanceForDay] = React.useState<AttendanceRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [monthlyStudyHours, setMonthlyStudyHours] = React.useState<number | null>(null);
  const [isLoadingStudyHours, setIsLoadingStudyHours] = React.useState(true);
  const [isLoadingActiveCheckIn, setIsLoadingActiveCheckIn] = React.useState(true);
  const [monthlyStudyData, setMonthlyStudyData] = React.useState<{ date: string; hours: number }[]>([]);
  const [isLoadingMonthlyStudyData, setIsLoadingMonthlyStudyData] = React.useState(true);
  
  const [viewedMonth, setViewedMonth] = React.useState(new Date());
  const [showMonthlyStudyTime, setShowMonthlyStudyTime] = React.useState(false);
  const [showAttendanceOverview, setShowAttendanceOverview] = React.useState(false);

    const handlePrevMonth = () => {
        setViewedMonth((prev) => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setViewedMonth((prev) => addMonths(prev, 1));
    };

  const fetchStudentData = React.useCallback(async () => {
    if (user?.studentId || user?.email) {
      setIsLoadingStudyHours(true);
      setIsLoadingActiveCheckIn(true);
      try {
        let student = null;
        if (user.studentId) {
          student = await getStudentByCustomId(user.studentId);
        } else if (user.email) {
          student = await getStudentByEmail(user.email);
        }

        if (student) {
          setCurrentStudent(student);
        } else {
          toast({
            title: "Student Record Not Found",
            description: "Could not find a student record associated with your email.",
            variant: "destructive",
          });
          setCurrentStudent(null);
        }
      } catch (error: any) {
        console.error("Error fetching student data (Attendance Page):", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch student details or session status.",
          variant: "destructive",
        });
        setCurrentStudent(null);
      } finally {
        setIsLoadingStudyHours(false);
        setIsLoadingActiveCheckIn(false);
      }
    } else {
      setIsLoadingStudyHours(false);
      setIsLoadingActiveCheckIn(false);
      setCurrentStudent(null);
    }
  }, [user, toast]);
  
  const handleShowMonthlyStudyTime = React.useCallback(async () => {
    if (!currentStudent?.studentId) {
        if (!user) await fetchStudentData();
        if (!currentStudent) return;
    };

    setShowMonthlyStudyTime(true);
    setIsLoadingStudyHours(true);
    try {
        const hours = await calculateMonthlyStudyHours(currentStudent.studentId);
        setMonthlyStudyHours(hours);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setMonthlyStudyHours(0);
    } finally {
        setIsLoadingStudyHours(false);
    }
  }, [currentStudent, toast, user, fetchStudentData]);

  React.useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

    const getDailyStudyDataForMonth = React.useCallback(async (studentId: string, month: Date) => {
      setIsLoadingMonthlyStudyData(true);
      try {
          const startDate = startOfMonth(month);
          const endDate = endOfMonth(month);
          const allDays = eachDayOfInterval({ start: startDate, end: endDate });

          // Fetch all records for the student once
          const allRecordsForStudent = await getAttendanceRecordsByStudentId(studentId);

          const recordsForMonth = allRecordsForStudent.filter(rec => {
              const recDate = parseISO(rec.date);
              return isWithinInterval(recDate, { start: startDate, end: endDate });
          });

          const recordsByDate = new Map<string, AttendanceRecord[]>();

          recordsForMonth.forEach(rec => {
              const dateKey = format(parseISO(rec.checkInTime), 'yyyy-MM-dd');
              const dayRecords = recordsByDate.get(dateKey) || [];
              dayRecords.push(rec);
              recordsByDate.set(dateKey, dayRecords);
          });

          const studyData: { date: string; hours: number }[] = allDays.map(day => {
              const dateString = format(day, 'yyyy-MM-dd');
              const records = recordsByDate.get(dateString) || [];
              const dailyHours = calculateDailyStudyTime(records).totalHours;
              return { date: dateString, hours: dailyHours };
          });

          setMonthlyStudyData(studyData);
      } catch (error) {
          console.error("Error fetching daily study data:", error);
          setMonthlyStudyData([]);
      } finally {
          setIsLoadingMonthlyStudyData(false);
      }
  }, []);

  React.useEffect(() => {
    if (currentStudent?.studentId && showMonthlyStudyTime) {
      getDailyStudyDataForMonth(currentStudent.studentId, viewedMonth);
    }
  }, [currentStudent, viewedMonth, getDailyStudyDataForMonth, showMonthlyStudyTime]);

  const calculateDailyStudyTime = (records: AttendanceRecord[]) => {
    let totalMilliseconds = 0;
    const now = new Date();
    records.forEach(record => {
      if (record.checkInTime && isValid(parseISO(record.checkInTime))) {
        const checkInTime = parseISO(record.checkInTime);
        let sessionEndTime;

        if (record.checkOutTime && isValid(parseISO(record.checkOutTime))) {
            sessionEndTime = parseISO(record.checkOutTime);
        } else {
            const isTodayRecord = format(checkInTime, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
            if (isTodayRecord) {
                sessionEndTime = now;
            } else {
                sessionEndTime = new Date(checkInTime);
                sessionEndTime.setHours(21, 30, 0, 0); // Cap at 9:30 PM for past days
            }
        }
        
        if (isAfter(sessionEndTime, checkInTime)) {
          totalMilliseconds += differenceInMilliseconds(sessionEndTime, checkInTime);
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

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Clock className="mr-2 h-5 w-5" />
              Total Hours this month
            </CardTitle>
            <CardDescription>Your total study performance for the current month.</CardDescription>
          </CardHeader>
          <CardContent>
            {!showMonthlyStudyTime ? (
                 <Button onClick={handleShowMonthlyStudyTime}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Show
                </Button>
            ) : isLoadingStudyHours ? (
                <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
              <div className="flex items-end gap-2">
                <AnimatedNumber value={monthlyStudyHours} />
                <span className="text-lg font-normal text-muted-foreground pb-1"> hours</span>
              </div>
            )}
          </CardContent>
        </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="shadow-lg w-full overflow-hidden">
            <CardHeader>
                <CardTitle className="flex items-center text-base sm:text-lg">
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Hours every day
                </CardTitle>
                <CardDescription className="mt-1 text-xs">Hours studied per day for the selected month.</CardDescription>
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
                        <div className="min-h-[300px] w-full">
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
                <BarChart3 className="mr-2 h-5 w-5" />
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
                                Total study time: {(() => { const { hours, minutes } = calculateDailyStudyTime(attendanceForDay); return `${hours} hr ${minutes} min`; })()}
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
