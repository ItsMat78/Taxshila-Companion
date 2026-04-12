"use client";

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
   Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
   Line, LineChart, Area, AreaChart
} from "recharts";
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
   getAllAttendanceRecords
} from '@/services/student-service';
import type { StudentSeatAssignment, CheckedInStudentInfo } from '@/types/student';
import { format, parseISO, subDays, differenceInDays, startOfMonth, startOfDay, endOfDay, isSameMonth, subMonths, getDaysInMonth } from 'date-fns';
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

const TinyMovementChart = ({ data }: any) => (
   <ResponsiveContainer width="100%" height={50}>
      <LineChart data={data}>
         <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 8px', fontSize: '12px' }} />
         <Line type="monotone" dataKey="Joined" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
         <Line type="monotone" dataKey="Left" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
   </ResponsiveContainer>
);

const GlassCard = ({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
   <div onClick={onClick} className={`bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl rounded-2xl overflow-hidden ${onClick ? 'cursor-pointer hover:bg-white/50 dark:hover:bg-slate-800/60 transition-all active:scale-[0.99]' : ''} ${className}`}>
      {children}
   </div>
);

const TinyAreaChart = ({ data, color, dataKey }: any) => (
   <ResponsiveContainer width="100%" height={70}>
      <AreaChart data={data}>
         <defs>
            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor={color} stopOpacity={0.4} />
               <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
         </defs>
         <RechartsTooltip cursor={false} contentStyle={{ display: 'none' }} />
         <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#color${dataKey})`} />
      </AreaChart>
   </ResponsiveContainer>
);

const TinyBarChart = ({ data, color, dataKey, height = 50 }: any) => (
   <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
         <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 8px', fontSize: '12px' }} />
         <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
   </ResponsiveContainer>
);

const TinyLineChart = ({ data, color, dataKey }: any) => (
   <ResponsiveContainer width="100%" height={70}>
      <LineChart data={data}>
         <RechartsTooltip cursor={false} contentStyle={{ display: 'none' }} />
         <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
   </ResponsiveContainer>
);

// Moved data fetcher outside to be utilized cleanly by React Query
const fetchDashboardData = async () => {
   const [allStudentsData, snapshots, rev, revHistory, allAttendanceRecords] = await Promise.all([
      getAllStudents(),
      getTodaysActiveAttendanceRecords(),
      calculateMonthlyRevenue(),
      getMonthlyRevenueHistory(),
      getAllAttendanceRecords()
   ]);

   const activeStudents = allStudentsData.filter(s => s.activityStatus === "Active");
   const assignments: StudentSeatAssignment[] = activeStudents.map(s => ({
      studentId: s.studentId, name: s.name, shift: s.shift, seatNumber: s.seatNumber || null, activityStatus: s.activityStatus, profilePictureUrl: s.profilePictureUrl
   }));

   const checkedIn = await processCheckedInStudentsFromSnapshot(snapshots, assignments);

   const occupiedMorning = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'morning' || s.shift === 'fullday')).map(s => s.seatNumber));
   const occupiedEvening = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'evening' || s.shift === 'fullday')).map(s => s.seatNumber));
   const occupiedFullday = new Set(activeStudents.filter(s => s.seatNumber && (s.shift === 'fullday')).map(s => s.seatNumber));

   const defaulters = activeStudents.filter(s => s.feeStatus === 'Due' || s.feeStatus === 'Overdue');
   const defaultersCount = defaulters.length;

   const now = new Date();

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
   const attData = last7DaysStrings.map(dayStr => {
      const dailyRecs = allAttendanceRecords.filter(r => r.date === dayStr);
      let morning = 0, evening = 0, fullday = 0;
      dailyRecs.forEach(r => {
         const s = activeStudents.find(st => st.studentId === r.studentId);
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
         movementData: movementData
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

   const getInitials = (name?: string) => {
      if (!name) return 'U';
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
   };

   const loadingFallback = {
      totalStudents: 0, activeCheckIns: 0, revenue: "Rs. 0", lastMonthRevenue: "Rs. 0",
      morningSlots: 0, eveningSlots: 0, fulldaySlots: 0, defaultersCount: 0, joinedThisMonth: 0, leftThisMonth: 0, loading: true
   };

   const fallbackGraphs = { revenueData: [], registrationData: [], pendingFeesData: [], attendanceWeeklyData: [], movementData: [] };

   const stats = dashboardData?.stats || loadingFallback;
   const graphs = dashboardData?.graphs || fallbackGraphs;
   const liveStudents = dashboardData?.liveStudents || [];

   const isRevenueTrendingUp = graphs.revenueData.length > 1 && graphs.revenueData[graphs.revenueData.length - 1].value >= graphs.revenueData[graphs.revenueData.length - 2].value;

   return (
      <div className="w-full bg-transparent font-headline text-gray-800 dark:text-gray-100 pb-8 rounded-b-2xl">
         {/* Welcome Area */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pt-4 gap-4">
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
                     <div className="mt-4 px-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <LiveStudentsList students={liveStudents} isLoading={stats.loading} getInitials={getInitials} />
                     </div>
                  </DialogContent>
               </Dialog>
            </div>
         </div>



         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Main Content */}
            <div className="lg:col-span-9 space-y-4">

               {/* Main Crucial Metrics (Large Sizes) */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Revenue (High Priority) */}
                  <Link href="/admin/fees/revenue-history" className="block">
                     <GlassCard className="p-3 md:p-5 flex flex-col justify-between h-full hover:-translate-y-0.5 transition-transform shadow-[0_12px_40px_rgba(234,179,8,0.06)]">
                        <div>
                           <div className="flex justify-between items-start mb-1 md:mb-2">
                              <span className="text-gray-500 dark:text-gray-400 font-medium tracking-wide text-[10px] md:text-sm uppercase md:normal-case">Monthly Revenue</span>
                              <div className="bg-yellow-100 dark:bg-yellow-900/50 p-1 md:p-1.5 rounded-full"><IndianRupee size={14} className="text-yellow-600 md:size-[18px]" /></div>
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
                  </Link>

                  {/* Defaulters / Pending Fees (High Priority) */}
                  <Link href="/admin/fees/due" className="block">
                     <GlassCard className="p-3 md:p-5 flex flex-col justify-between h-full hover:-translate-y-0.5 transition-transform shadow-[0_12px_40px_rgba(239,68,68,0.06)] relative">
                        <div>
                           <div className="flex justify-between items-start mb-1 md:mb-2">
                              <span className="text-gray-500 dark:text-gray-400 font-medium tracking-wide text-[10px] md:text-sm uppercase md:normal-case">Payment Defaulters</span>
                              <div className="bg-red-100 dark:bg-red-900/50 p-1 md:p-1.5 rounded-full text-red-500"><FileWarning size={14} className="md:size-[18px]" /></div>
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
                  </Link>
               </div>

               {/* Quick Actions Integrated Row */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
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
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                  {/* Total Students */}
                  <Link href="/students/list" className="block">
                     <GlassCard className="p-3 md:p-4 flex flex-col justify-between h-full hover:bg-white/50 transition border-white">
                        <div>
                           <div className="flex justify-between items-start mb-1">
                              <span className="text-gray-500 dark:text-gray-400 text-[10px] md:text-sm font-medium">Headcount</span>
                              <Users size={14} className="text-blue-500 md:size-4" />
                           </div>
                           <div className="flex items-end gap-1.5 md:gap-2 mb-1 mt-1 leading-none">
                              <span className="text-2xl md:text-3xl font-light">{stats.loading ? '-' : stats.totalStudents}</span>
                           </div>
                        </div>
                        <div className="mt-2 md:mt-4 -mx-2 -mb-2">
                           <TinyBarChart data={graphs.registrationData} color="#3b82f6" dataKey="value" height={40} />
                        </div>
                     </GlassCard>
                  </Link>

                  {/* Seat Availability (Moved up on mobile for row flow) */}
                  <Link href="/seats/availability" className="block">
                     <GlassCard className="p-3 md:p-4 flex flex-col justify-between h-full hover:bg-white/50 transition relative overflow-hidden border-white">
                        <div className="absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 bg-orange-200 blur-2xl opacity-30 rounded-full pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
                        <div>
                           <div className="flex justify-between items-start mb-1">
                              <span className="text-gray-500 dark:text-gray-400 text-[10px] md:text-sm font-medium">Vacant</span>
                              <Armchair size={14} className="text-orange-500 md:size-4" />
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
                  </Link>

                  {/* Student Movement Card (Full width on mobile below the pair) */}
                  <Link href="/students/list" className="block col-span-2">
                     <GlassCard className="p-3 md:p-4 flex flex-col justify-between h-full hover:-translate-y-0.5 transition relative border-white">
                        <div className="flex justify-between items-start mb-1">
                           <span className="text-gray-500 dark:text-gray-400 text-[10px] md:text-sm font-medium uppercase md:normal-case">Movement History</span>
                           <Activity size={14} className="text-teal-500 md:size-4" />
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
                  </Link>
               </div>

            {/* Large Hero Chart Area Width Expansion */}
            <GlassCard className="p-5 flex flex-col mt-4 shadow-[0_4px_20px_rgb(0,0,0,0.02)] border-white">
               <div className="flex justify-between items-end mb-4">
                  <div>
                     <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Weekly Attendance Volume</h3>
                     <div className="flex items-center gap-3">
                        <span className="text-3xl font-light tracking-tight">Active Check-ins</span>
                     </div>
                  </div>
                  <div className="flex gap-4 text-xs font-semibold font-body bg-white/40 border border-white/60 p-2 px-3 rounded-full">
                     <div className="flex items-center gap-1.5"><Sunrise size={12} className="text-blue-500" /> Morning</div>
                     <div className="flex items-center gap-1.5"><Moon size={12} className="text-purple-500" /> Evening</div>
                     <div className="flex items-center gap-1.5"><Sun size={12} className="text-yellow-500" /> Full Day</div>
                  </div>
               </div>

               <div className="w-full mt-2 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={graphs.attendanceWeeklyData} barSize={28} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                        <RechartsTooltip
                           cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                           contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)' }}
                        />
                        <Bar dataKey="morning" stackId="a" fill="#3b82f6" radius={[0, 0, 6, 6]} />
                        <Bar dataKey="evening" stackId="a" fill="#a855f7" />
                        <Bar dataKey="fullday" stackId="a" fill="#eab308" radius={[6, 6, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
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

               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                  <LiveStudentsList students={liveStudents} isLoading={stats.loading} getInitials={getInitials} />
               </div>
            </GlassCard>
         </div>
      </div>
      </div>
  );
}

function LiveStudentsList({ students, isLoading, getInitials }: any) {
   return (
   <div className="space-y-2">
      {students.length === 0 && !isLoading && (
         <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400 font-body text-sm">
            <Monitor size={32} strokeWidth={1} className="mb-3 opacity-30 text-gray-500" />
            Nobody checked in.
         </div>
      )}
      {students.map((student: any, i: number) => (
         <div key={student.studentId || i} className="group bg-white/40 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 rounded-xl p-2.5 transition-all border border-white/50 dark:border-white/5 hover:border-white dark:hover:border-white/20">
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
      ))}
      {isLoading && (
         Array(4).fill(0).map((_, i) => (
            <div className="animate-pulse bg-white/30 dark:bg-white/10 h-14 rounded-xl w-full" key={i}></div>
         ))
      )}
   </div>
   );
}

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
