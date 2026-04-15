"use client";

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAuth } from '@/contexts/auth-context';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import {
   Users,
   CalendarDays,
   CreditCard,
   Monitor,
   Send as SendIcon,
   Inbox,
   UserPlus,
   Armchair,
   LogIn,
   IndianRupee,
   MoreHorizontal,
   TrendingUp,
   TrendingDown,
   AlertCircle,
   FileWarning,
   Sunrise,
   Moon,
   Sun,
   Activity,
   UserMinus,
   History as HistoryIcon
} from 'lucide-react';
import {
   getStudentSeatAssignments,
   getTodaysActiveAttendanceRecords,
   calculateMonthlyRevenue,
   processCheckedInStudentsFromSnapshot,
   getAllStudents,
   getMonthlyRevenueHistory,
   getAttendanceRecordsForDateRangeAll
} from '@/services/student-service';
import type { StudentSeatAssignment, CheckedInStudentInfo } from '@/types/student';
import { format, parseISO, subDays, startOfMonth, endOfMonth, isSameMonth, subMonths, getDaysInMonth } from 'date-fns';
import { ALL_SEAT_NUMBERS as serviceAllSeats } from '@/config/seats';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger
} from "@/components/ui/dialog";

const ChartLoadingTiny = () => <div className="h-[50px] animate-pulse bg-gray-100/50 dark:bg-white/5 rounded" />;
const ChartLoadingArea = () => <div className="h-[70px] animate-pulse bg-gray-100/50 dark:bg-white/5 rounded" />;
const ChartLoadingHero = () => <div className="h-[200px] animate-pulse bg-gray-100/50 dark:bg-white/5 rounded" />;

const TinyMovementChart = dynamic(
   () => import('@/components/admin/dashboard-charts').then(m => ({ default: m.TinyMovementChart })),
   { ssr: false, loading: ChartLoadingTiny }
);
const TinyAreaChart = dynamic(
   () => import('@/components/admin/dashboard-charts').then(m => ({ default: m.TinyAreaChart })),
   { ssr: false, loading: ChartLoadingArea }
);
const TinyBarChart = dynamic(
   () => import('@/components/admin/dashboard-charts').then(m => ({ default: m.TinyBarChart })),
   { ssr: false, loading: ChartLoadingTiny }
);
const TinyLineChart = dynamic(
   () => import('@/components/admin/dashboard-charts').then(m => ({ default: m.TinyLineChart })),
   { ssr: false, loading: ChartLoadingArea }
);
const HeroAttendanceChart = dynamic(
   () => import('@/components/admin/dashboard-charts').then(m => ({ default: m.HeroAttendanceChart })),
   { ssr: false, loading: ChartLoadingHero }
);
const HeadcountOverTimeChart = dynamic(
   () => import('@/components/admin/dashboard-charts').then(m => ({ default: m.HeadcountOverTimeChart })),
   { ssr: false, loading: ChartLoadingHero }
);

const GlassCard = React.memo(({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
   <div onClick={onClick} className={`bg-white/40 dark:bg-slate-900/60 backdrop-blur-md md:backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-[0_4px_16px_rgb(0,0,0,0.04)] dark:shadow-xl rounded-lg overflow-hidden ${onClick ? 'cursor-pointer hover:bg-white/50 dark:hover:bg-slate-800/60 transition-all active:scale-[0.99]' : ''} ${className}`}>
      {children}
   </div>
));
GlassCard.displayName = 'GlassCard';

// Moved data fetcher outside to be utilized cleanly by React Query
const fetchDashboardData = async () => {
   const now = new Date();
   const monthStart = startOfMonth(now);
   const weekAgo = subDays(now, 7);
   const weekAgoStr = format(weekAgo, 'yyyy-MM-dd');
   const todayStr = format(now, 'yyyy-MM-dd');

   const [allStudentsData, snapshots, rev, revHistory, recentAttendance] = await Promise.all([
      getAllStudents(),
      getTodaysActiveAttendanceRecords(),
      calculateMonthlyRevenue(),
      getMonthlyRevenueHistory(),
      getAttendanceRecordsForDateRangeAll(weekAgoStr, todayStr)
   ]);

   const activeStudents = allStudentsData.filter(s => s.activityStatus === "Active");
   const activeStudentsMap = new Map(activeStudents.map(s => [s.studentId, s]));

   const assignments: StudentSeatAssignment[] = activeStudents.map(s => ({
      studentId: s.studentId, name: s.name, shift: s.shift, seatNumber: s.seatNumber || null, activityStatus: s.activityStatus, profilePictureUrl: s.profilePictureUrl
   }));

   const checkedIn = await processCheckedInStudentsFromSnapshot(snapshots, activeStudents);

   const occupiedMorning = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'morning' || s.shift === 'fullday')).map(s => s.seatNumber));
   const occupiedEvening = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'evening' || s.shift === 'fullday')).map(s => s.seatNumber));
   const occupiedFullday = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'fullday')).map(s => s.seatNumber));

   const defaulters = activeStudents.filter(s => s.feeStatus === 'Due' || s.feeStatus === 'Overdue');
   const defaultersCount = defaulters.length;

   const rd = revHistory.slice(0, 6).reverse().map(r => ({
      name: r.monthDisplay.substring(0, 3),
      value: r.revenue
   }));

   let pastMonthRev = "Rs. 0";
   if (revHistory.length > 1) {
      pastMonthRev = `Rs. ${revHistory[1].revenue.toLocaleString('en-IN')}`;
   }

   const daysInMonthTotal = getDaysInMonth(now);
   const regData = Array.from({ length: daysInMonthTotal }).map((_, i) => {
      const day = i + 1;
      const count = activeStudents.filter(s => {
         if (!s.registrationDate) return false;
         const parseDate = parseISO(s.registrationDate);
         if (isNaN(parseDate.getTime())) return false;
         return isSameMonth(parseDate, now) && parseDate.getDate() === day;
      }).length;
      return { name: day.toString(), value: count };
   });

   const pdData = [
      { name: 'Morning', value: defaulters.filter(s => s.shift === 'morning').length },
      { name: 'Evening', value: defaulters.filter(s => s.shift === 'evening').length },
      { name: 'Full Day', value: defaulters.filter(s => s.shift === 'fullday').length },
   ];

   const last7DaysStrings = Array.from({ length: 7 }).map((_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd'));
   
   // Headcount over last 12 months (no extra reads — derived from allStudentsData)
   const headcountData = Array.from({ length: 12 }).map((_, i) => {
      const targetMonth = subMonths(now, 11 - i);
      const monthEnd = endOfMonth(targetMonth);
      const monthStart = startOfMonth(targetMonth);
      const count = allStudentsData.filter(s => {
         if (!s.registrationDate) return false;
         const regDate = parseISO(s.registrationDate);
         if (isNaN(regDate.getTime()) || regDate > monthEnd) return false;
         if (s.activityStatus === 'Left' && s.leftDate) {
            const leftDate = parseISO(s.leftDate);
            if (!isNaN(leftDate.getTime()) && leftDate < monthStart) return false;
         }
         return true;
      }).length;
      return { name: format(targetMonth, 'MMM yy'), value: count };
   });

   // Pre-group attendance by date for O(1) daily lookup
   const attendanceByDate = new Map<string, (typeof recentAttendance)[0][]>();
   recentAttendance.forEach(rec => {
      const recs = attendanceByDate.get(rec.date) || [];
      recs.push(rec);
      attendanceByDate.set(rec.date, recs);
   });

   const attData = last7DaysStrings.map(dayStr => {
      const dailyRecs = attendanceByDate.get(dayStr) || [];
      let morning = 0, evening = 0, fullday = 0;
      dailyRecs.forEach(r => {
         const s = activeStudentsMap.get(r.studentId);
         if (s) {
            if (s.shift === 'morning') morning++;
            else if (s.shift === 'evening') evening++;
            else if (s.shift === 'fullday') fullday++;
         }
      });
      return { day: format(parseISO(dayStr), 'EEE'), morning, evening, fullday };
   });

   let joinedTotalThisMonth = 0;
   let leftTotalThisMonth = 0;
   const movementData = Array.from({ length: daysInMonthTotal }).map((_, i) => {
      const day = i + 1;
      const joined = allStudentsData.filter(s => {
         if (!s.registrationDate) return false;
         const parseDate = parseISO(s.registrationDate);
         if (isNaN(parseDate.getTime())) return false;
         return isSameMonth(parseDate, now) && parseDate.getDate() === day;
      }).length;
      const left = allStudentsData.filter(s => {
         if (s.activityStatus !== "Left" || !s.leftDate) return false;
         const parseDate = parseISO(s.leftDate);
         if (isNaN(parseDate.getTime())) return false;
         return isSameMonth(parseDate, now) && parseDate.getDate() === day;
      }).length;
      joinedTotalThisMonth += joined;
      leftTotalThisMonth += left;
      return { name: day.toString(), Joined: joined, Left: left };
   });

   return {
      stats: {
         totalStudents: activeStudents.length,
         activeCheckIns: checkedIn.length,
         revenue: rev || "Rs. 0",
         lastMonthRevenue: pastMonthRev,
         morningSlots: serviceAllSeats.length - occupiedMorning.size,
         eveningSlots: serviceAllSeats.length - occupiedEvening.size,
         fulldaySlots: serviceAllSeats.length - occupiedFullday.size,
         defaultersCount,
         joinedThisMonth: joinedTotalThisMonth,
         leftThisMonth: leftTotalThisMonth,
         loading: false
      },
      graphs: {
         revenueData: rd,
         registrationData: regData,
         pendingFeesData: pdData,
         attendanceWeeklyData: attData,
         movementData: movementData,
         headcountData: headcountData
      },
      liveStudents: checkedIn
   };
};

export default function GlassAdminDashboard() {
   const { user } = useAuth();

   const { data: dashboardData, isLoading, error } = useQuery({
      queryKey: ['dashboardAnalyticsData'],
      queryFn: fetchDashboardData,
      staleTime: 120000 // 2 minutes of instant visual cache
   });

   const getInitials = React.useCallback((name?: string): string => {
      if (!name) return 'U';
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
   }, []);

   const loadingFallback = {
      totalStudents: 0, activeCheckIns: 0, revenue: "Rs. 0", lastMonthRevenue: "Rs. 0",
      morningSlots: 0, eveningSlots: 0, fulldaySlots: 0, defaultersCount: 0, joinedThisMonth: 0, leftThisMonth: 0, loading: true
   };

   const fallbackGraphs = { revenueData: [], registrationData: [], pendingFeesData: [], attendanceWeeklyData: [], movementData: [], headcountData: [] };

   const stats = dashboardData?.stats || loadingFallback;
   const graphs = dashboardData?.graphs || fallbackGraphs;
   const liveStudents = dashboardData?.liveStudents || [];

   const isRevenueTrendingUp = graphs.revenueData.length > 1 && graphs.revenueData[graphs.revenueData.length - 1].value >= graphs.revenueData[graphs.revenueData.length - 2].value;

   return (
      <ErrorBoundary>
      <div className="w-full bg-transparent font-headline text-gray-800 dark:text-gray-100 pb-8 rounded-b-2xl">
         {/* Welcome Area */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 pt-2 gap-3">
            <div className="md:mb-4">
               <h1 className="text-3xl md:text-4xl font-light tracking-tight mb-1 text-gray-900 dark:text-white leading-none">Welcome Back, {user?.identifierForDisplay?.split(' ')[0] || 'Admin'}</h1>
               <p className="text-gray-500 dark:text-gray-400 font-body text-xs md:text-sm">Management control room - prioritized metrics.</p>
            </div>

            {/* Mobile-only Live Toggle */}
            <div className="lg:hidden w-full sm:w-auto">
               <Dialog>
                  <DialogTrigger asChild>
                     <Button variant="outline" className="w-full sm:w-auto bg-white/20 dark:bg-white/5 backdrop-blur-lg border-white/40 dark:border-white/10 hover:bg-white/40 group">
                        <Activity className="mr-2 h-4 w-4 text-teal-500 animate-pulse" />
                        Live: {stats.activeCheckIns} Active
                     </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-white/20">
                     <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                           Live in Library
                        </DialogTitle>
                     </DialogHeader>
                     <LiveStudentsList
                        students={liveStudents}
                        isLoading={stats.loading}
                        getInitials={getInitials}
                        className="mt-4 px-1 max-h-[60vh] overflow-y-auto custom-scrollbar"
                     />
                  </DialogContent>
               </Dialog>
            </div>
         </div>



         <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left Main Content */}
            <div className="lg:col-span-9 space-y-3">

               {/* Main Crucial Metrics (Large Sizes) */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Revenue (High Priority) */}
                  <GlassCard className="p-3 md:p-5 flex flex-col justify-between h-full shadow-[0_12px_40px_rgba(234,179,8,0.06)]">
                        <div>
                           <div className="flex justify-between items-start mb-1 md:mb-2">
                              <span className="text-gray-500 dark:text-gray-400 font-medium tracking-wide text-[10px] md:text-sm uppercase md:normal-case">Monthly Revenue</span>
                              <Link href="/admin/fees/revenue-history" className="bg-yellow-100 dark:bg-yellow-900/50 p-1 md:p-1.5 rounded-full hover:scale-110 transition-transform flex items-center justify-center"><IndianRupee size={14} className="text-yellow-600 md:size-[18px]" /></Link>
                           </div>
                           <div className="flex flex-col gap-0.5 mb-1 mt-1 md:mt-2">
                              <div className="flex items-end gap-2 md:gap-3">
                                 <span className="text-2xl md:text-4xl font-light tracking-tight leading-none">{stats.loading ? '-' : stats.revenue.replace('Rs. ', '₹')}</span>
                                 {!stats.loading && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center ${isRevenueTrendingUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                       {isRevenueTrendingUp ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                                    </span>
                                 )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-body">
                                 Prev: <span className="font-semibold text-gray-500 dark:text-gray-300">{stats.loading ? '-' : stats.lastMonthRevenue.replace('Rs', '₹')}</span>
                              </div>
                           </div>
                        </div>
                        <div className="mt-4 md:mt-6 -mx-3 md:-mx-4 -mb-3 md:-mb-4">
                           {stats.loading ? (
                              <div className="h-[50px] md:h-[70px] w-full animate-pulse bg-gray-100/50 dark:bg-white/5 rounded-b-2xl"></div>
                           ) : (
                              <TinyAreaChart data={graphs.revenueData} color="#eab308" dataKey="value" />
                           )}
                        </div>
                     </GlassCard>

                  {/* Defaulters / Pending Fees (High Priority) */}
                  <GlassCard className="p-3 md:p-5 flex flex-col justify-between h-full shadow-[0_12px_40px_rgba(239,68,68,0.06)] relative">
                        <div>
                           <div className="flex justify-between items-start mb-1 md:mb-2">
                              <span className="text-gray-500 dark:text-gray-400 font-medium tracking-wide text-[10px] md:text-sm uppercase md:normal-case">Payment Defaulters</span>
                              <Link href="/admin/fees/due" className="bg-red-100 dark:bg-red-900/50 p-1 md:p-1.5 rounded-full text-red-500 hover:scale-110 transition-transform flex items-center justify-center"><FileWarning size={14} className="md:size-[18px]" /></Link>
                           </div>
                           <div className="flex items-end gap-2 md:gap-3 mb-1 mt-1 md:mt-2 leading-none">
                              <span className="text-2xl md:text-4xl font-light tracking-tight text-red-600">{stats.loading ? '-' : stats.defaultersCount}</span>
                              <span className="text-gray-400 text-[10px] md:text-sm font-body mb-0.5">Defaulters</span>
                           </div>
                        </div>
                        <div className="mt-4 md:mt-8 -mx-3 md:-mx-4 -mb-3 md:-mb-4">
                           {stats.loading ? (
                              <div className="h-[50px] md:h-[70px] w-full animate-pulse bg-gray-100/50 dark:bg-white/5 rounded-b-2xl"></div>
                           ) : (
                              <div className="px-3 md:px-4">
                                 <TinyBarChart data={graphs.pendingFeesData} color="#ef4444" dataKey="value" />
                                 <div className="flex justify-between mt-1 text-[8px] md:text-[10px] text-gray-400 font-body px-1 md:px-2">
                                    <span>M</span><span>E</span><span>F</span>
                                 </div>
                              </div>
                           )}
                        </div>
                     </GlassCard>
               </div>

               {/* Quick Actions Integrated Row */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Link href="/admin/students/register">
                     <GlassCard className="p-3 md:p-4 flex flex-col items-center justify-center text-center gap-1 md:gap-2 hover:bg-indigo-600/10 dark:hover:bg-indigo-500/10 border-indigo-200 dark:border-indigo-900/30 group">
                        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1.5 md:p-2 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                           <UserPlus size={16} className="md:size-5" />
                        </div>
                        <span className="text-[10px] md:text-sm font-semibold text-indigo-700 dark:text-indigo-300">Register</span>
                     </GlassCard>
                  </Link>
                  <Link href="/attendance/calendar">
                     <GlassCard className="p-3 md:p-4 flex flex-col items-center justify-center text-center gap-1 md:gap-2 hover:bg-teal-600/10 dark:hover:bg-teal-500/10 border-teal-200 dark:border-teal-900/30 group">
                        <div className="bg-teal-100 dark:bg-teal-900/50 p-1.5 md:p-2 rounded-xl text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                           <CalendarDays size={16} className="md:size-5" />
                        </div>
                        <span className="text-[10px] md:text-sm font-semibold text-teal-700 dark:text-teal-300">Attendance</span>
                     </GlassCard>
                  </Link>
                  <Link href="/admin/fees/payments-history">
                     <GlassCard className="p-3 md:p-4 flex flex-col items-center justify-center text-center gap-1 md:gap-2 hover:bg-blue-600/10 dark:hover:bg-blue-500/10 border-blue-200 dark:border-blue-900/30 group">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 md:p-2 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                           <HistoryIcon size={16} className="md:size-5" />
                        </div>
                        <span className="text-[10px] md:text-sm font-semibold text-blue-700 dark:text-blue-300">Payments</span>
                     </GlassCard>
                  </Link>
                  <Link href="/admin/feedback">
                     <GlassCard className="p-3 md:p-4 flex flex-col items-center justify-center text-center gap-1 md:gap-2 hover:bg-yellow-600/10 dark:hover:bg-yellow-500/10 border-yellow-200 dark:border-yellow-900/30 group">
                        <div className="bg-yellow-100 dark:bg-yellow-900/50 p-1.5 md:p-2 rounded-xl text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform">
                           <Inbox size={16} className="md:size-5" />
                        </div>
                        <span className="text-[10px] md:text-sm font-semibold text-yellow-700 dark:text-yellow-300">Feedback</span>
                     </GlassCard>
                  </Link>
               </div>

               {/* Secondary Operational Metrics (Smaller Grid) */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {/* Total Students */}
                  <GlassCard className="p-3 md:p-4 flex flex-col justify-between h-full border-white">
                        <div>
                           <div className="flex justify-between items-start mb-1">
                              <span className="text-gray-500 dark:text-gray-400 text-[10px] md:text-sm font-medium">Headcount</span>
                              <Link href="/students/list" className="hover:scale-110 transition-transform"><Users size={14} className="text-blue-500 md:size-4" /></Link>
                           </div>
                           <div className="flex items-end gap-1.5 md:gap-2 mb-1 mt-1 leading-none">
                              <span className="text-2xl md:text-3xl font-light">{stats.loading ? '-' : stats.totalStudents}</span>
                           </div>
                        </div>
                        <div className="mt-2 md:mt-4 -mx-2 -mb-2">
                           <TinyBarChart data={graphs.registrationData} color="#3b82f6" dataKey="value" height={40} labelFormatter={(label) => `Day ${label}`} />
                        </div>
                     </GlassCard>

                  {/* Seat Availability */}
                  <GlassCard className="p-3 md:p-4 flex flex-col justify-between h-full relative overflow-hidden border-white">
                        <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 bg-orange-200 blur-2xl opacity-30 rounded-full pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
                        <div>
                           <div className="flex justify-between items-start mb-1">
                              <span className="text-gray-500 dark:text-gray-400 text-[10px] md:text-sm font-medium">Vacant</span>
                              <Link href="/seats/availability" className="hover:scale-110 transition-transform"><Armchair size={14} className="text-orange-500 md:size-4" /></Link>
                           </div>
                           <div className="space-y-1 mt-1.5 text-[8px] md:text-xs text-gray-700 dark:text-gray-300 font-body border-t border-gray-200/50 dark:border-white/5 pt-1.5">
                              <div className="flex justify-between items-center bg-white/30 dark:bg-white/5 px-1.5 py-0.5 rounded border border-white/50 dark:border-white/5">
                                 <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><Sunrise size={10} className="text-blue-500" /> M</span>
                                 <span className="font-semibold">{stats.loading ? '-' : stats.morningSlots}</span>
                              </div>
                              <div className="flex justify-between items-center bg-white/30 dark:bg-white/5 px-1.5 py-0.5 rounded border border-white/50 dark:border-white/5">
                                 <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><Moon size={10} className="text-purple-500" /> E</span>
                                 <span className="font-semibold">{stats.loading ? '-' : stats.eveningSlots}</span>
                              </div>
                              <div className="flex justify-between items-center bg-white/30 dark:bg-white/5 px-1.5 py-0.5 rounded border border-white/50 dark:border-white/5">
                                 <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><Sun size={10} className="text-yellow-600" /> F</span>
                                 <span className="font-semibold">{stats.loading ? '-' : stats.fulldaySlots}</span>
                              </div>
                           </div>
                        </div>
                     </GlassCard>

                  {/* Student Movement Card (Full width on mobile below the pair) */}
                  <GlassCard className="p-3 md:p-4 flex flex-col justify-between h-full relative border-white col-span-2">
                        <div className="flex justify-between items-start mb-1">
                           <span className="text-gray-500 dark:text-gray-400 text-[10px] md:text-sm font-medium uppercase md:normal-case">Movement History</span>
                           <Link href="/admin/students/movement" className="hover:scale-110 transition-transform"><Activity size={14} className="text-teal-500 md:size-4" /></Link>
                        </div>

                        <div className="flex h-full w-full items-center justify-between text-xs md:text-sm font-headline pr-2 md:pr-4">
                           <div className="flex flex-col">
                              <span className="flex items-center gap-1 text-green-600 mb-0.5 mt-0.5 text-[10px]">
                                 <UserPlus size={12} /> Joined
                              </span>
                              <span className="text-xl md:text-2xl font-light leading-none">{stats.loading ? '-' : stats.joinedThisMonth}</span>
                           </div>
                           <div className="w-px h-6 bg-gray-200/50"></div>
                           <div className="flex flex-col text-right">
                              <span className="flex items-center justify-end gap-1 text-red-500 mb-0.5 mt-0.5 text-[10px]">
                                 <UserMinus size={12} /> Left
                              </span>
                              <span className="text-xl md:text-2xl font-light leading-none">{stats.loading ? '-' : stats.leftThisMonth}</span>
                           </div>
                        </div>

                        <div className="mt-2 -mx-2 -mb-2">
                           {stats.loading ? (
                              <div className="h-[30px] md:h-[40px] w-full animate-pulse bg-gray-100/50 rounded-lg mx-2"></div>
                           ) : (
                              <TinyMovementChart data={graphs.movementData} />
                           )}
                        </div>
                     </GlassCard>
               </div>

            {/* Large Hero Chart Area Width Expansion */}
            <GlassCard className="p-4 flex flex-col shadow-[0_4px_20px_rgb(0,0,0,0.02)] border-white">
               <div className="flex justify-between items-end mb-4">
                  <div>
                     <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Weekly Attendance Volume</h3>
                     <div className="flex items-center gap-3">
                        <span className="text-base font-medium text-gray-700 dark:text-gray-300">Active Check-ins</span>
                     </div>
                  </div>
                  <div className="flex gap-4 text-xs font-semibold font-body bg-white/40 border border-white/60 p-2 px-3 rounded-full">
                     <div className="flex items-center gap-1.5"><Sunrise size={12} className="text-blue-500" /> Morning</div>
                     <div className="flex items-center gap-1.5"><Moon size={12} className="text-purple-500" /> Evening</div>
                     <div className="flex items-center gap-1.5"><Sun size={12} className="text-yellow-500" /> Full Day</div>
                  </div>
               </div>

               <div className="w-full mt-2 h-[200px]">
                  <HeroAttendanceChart data={graphs.attendanceWeeklyData} />
               </div>
            </GlassCard>

            {/* Headcount vs Time */}
            <GlassCard className="p-4 flex flex-col shadow-[0_4px_20px_rgb(0,0,0,0.02)] border-white">
               <div className="flex justify-between items-center mb-3">
                  <div>
                     <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Headcount vs Time</h3>
                     <p className="text-[10px] text-gray-400 font-body mt-0.5">Net active students — last 12 months</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold font-body bg-white/40 border border-white/60 py-1 px-2.5 rounded-full">
                     <Users size={11} className="text-indigo-500" /> All Time
                  </div>
               </div>
               <div className="w-full h-[180px]">
                  {stats.loading ? (
                     <div className="h-full w-full animate-pulse bg-gray-100/50 dark:bg-white/5 rounded"></div>
                  ) : (
                     <HeadcountOverTimeChart data={graphs.headcountData} />
                  )}
               </div>
            </GlassCard>

         </div>

         {/* Right Sidebar - Live Stream (Remains Constant) */}
         <div className="hidden lg:block lg:col-span-3">
            <GlassCard className="h-[calc(100vh-120px)] sticky top-24 p-5 flex flex-col shadow-[0_8px_30px_rgba(45,212,191,0.06)] relative overflow-hidden border-white/60">
               <div className="absolute -top-10 -right-10 w-48 h-48 bg-teal-200 blur-3xl opacity-10 rounded-full pointer-events-none"></div>

               <div className="flex items-center gap-2 mb-6 relative z-10 border-b border-gray-200/40 dark:border-white/5 pb-4">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <h3 className="font-medium text-gray-800 dark:text-gray-100">Live In Library</h3>
                  <div className="ml-auto bg-white/60 dark:bg-white/10 backdrop-blur font-semibold text-teal-700 dark:text-teal-400 text-xs px-2.5 py-0.5 rounded-full border border-white/80 dark:border-white/10 shadow-sm">{stats.activeCheckIns}</div>
               </div>

               <LiveStudentsList
                  students={liveStudents}
                  isLoading={stats.loading}
                  getInitials={getInitials}
                  className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10"
               />
            </GlassCard>
         </div>
      </div>
      </div>
      </ErrorBoundary>
  );
}

interface LiveStudentsListProps {
   students: CheckedInStudentInfo[];
   isLoading: boolean;
   getInitials: (name?: string) => string;
   /** className applied to the scroll container div */
   className?: string;
}

// Estimated height per row (p-2.5 padding + avatar + text + 8px gap)
const ROW_HEIGHT = 68;

const LiveStudentsList = React.memo(function LiveStudentsList({
   students,
   isLoading,
   getInitials,
   className = "max-h-[60vh] overflow-y-auto",
}: LiveStudentsListProps) {
   const parentRef = React.useRef<HTMLDivElement>(null);

   const rowVirtualizer = useVirtualizer({
      count: students.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => ROW_HEIGHT,
      overscan: 5,
   });

   if (isLoading) {
      return (
         <div className={className}>
            <div className="space-y-2">
               {Array(4).fill(0).map((_, i) => (
                  <div className="animate-pulse bg-white/30 dark:bg-white/10 h-14 rounded-xl w-full" key={i} />
               ))}
            </div>
         </div>
      );
   }

   if (students.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400 font-body text-sm">
            <Monitor size={32} strokeWidth={1} className="mb-3 opacity-30 text-gray-500" />
            Nobody checked in.
         </div>
      );
   }

   return (
      <div ref={parentRef} className={className}>
         <div
            style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
         >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
               const student = students[virtualItem.index];
               return (
                  <div
                     key={student.studentId || virtualItem.index}
                     style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                        paddingBottom: '8px',
                     }}
                  >
                     <div className="group bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 rounded-xl p-2.5 transition-all border border-white/50 dark:border-white/5 hover:border-white dark:hover:border-white/20 h-full">
                        <div className="flex items-center gap-3">
                           <Avatar className="h-9 w-9 border border-white/60 dark:border-white/10 shadow-sm shrink-0">
                              <AvatarImage src={student.profilePictureUrl || undefined} alt={student.name} />
                              <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-slate-900 text-indigo-700 dark:text-indigo-300 font-semibold text-xs">{getInitials(student.name)}</AvatarFallback>
                           </Avatar>
                           <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                 <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate pr-2 leading-none mb-1">{student.name}</span>
                                 <span className="text-[10px] bg-white/80 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-100 dark:border-white/5 font-mono font-bold leading-none">{student.seatNumber || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-body">
                                 <span className={`${student.shift === 'morning' ? 'text-blue-500' : student.shift === 'evening' ? 'text-purple-500' : 'text-yellow-600'} capitalize font-bold tracking-wide flex items-center gap-1`}>
                                    {student.shift === 'morning' && <Sunrise size={10} />}
                                    {student.shift === 'evening' && <Moon size={10} />}
                                    {student.shift === 'fullday' && <Sun size={10} />}
                                    {student.shift}
                                 </span>
                                 <span className="text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
                                    <LogIn size={10} className="text-green-500" /> {format(parseISO(student.checkInTime), 'p')}
                                 </span>
                              </div>
                           </div>
                           <div className="flex items-center">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Warn Student">
                                 <AlertCircle size={14} />
                              </Button>
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })}
         </div>
      </div>
   );
});

// Ensure custom scrollbar exists locally if needed
const customScrollbarStyle = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(0,0,0,0.1);
    border-radius: 20px;
  }
`;

if (typeof document !== 'undefined') {
   const style = document.createElement('style');
   style.innerHTML = customScrollbarStyle;
   document.head.appendChild(style);
}
