import * as React from 'react';
import {
   Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
   Line, LineChart, Area, AreaChart
} from "recharts";

export const TinyMovementChart = React.memo(({ data }: { data: Array<{ name: string; Joined: number; Left: number }> }) => (
   <ResponsiveContainer width="100%" height={50}>
      <LineChart data={data}>
         <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 8px', fontSize: '12px' }} />
         <Line type="monotone" dataKey="Joined" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
         <Line type="monotone" dataKey="Left" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
   </ResponsiveContainer>
));
TinyMovementChart.displayName = 'TinyMovementChart';

export const TinyAreaChart = React.memo(({ data, color, dataKey }: { data: Array<{ name: string; value: number }>; color: string; dataKey: string }) => (
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
));
TinyAreaChart.displayName = 'TinyAreaChart';

export const TinyBarChart = React.memo(({ data, color, dataKey, height = 50 }: { data: Array<{ name: string; [key: string]: unknown }>; color: string; dataKey: string; height?: number }) => (
   <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
         <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '4px 8px', fontSize: '12px' }} />
         <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
   </ResponsiveContainer>
));
TinyBarChart.displayName = 'TinyBarChart';

export const TinyLineChart = React.memo(({ data, color, dataKey }: { data: Array<{ name: string; [key: string]: unknown }>; color: string; dataKey: string }) => (
   <ResponsiveContainer width="100%" height={70}>
      <LineChart data={data}>
         <RechartsTooltip cursor={false} contentStyle={{ display: 'none' }} />
         <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
   </ResponsiveContainer>
));
TinyLineChart.displayName = 'TinyLineChart';

export const HeroAttendanceChart = React.memo(({ data }: { data: Array<{ day: string; morning: number; evening: number; fullday: number }> }) => (
   <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={28} barGap={4}>
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
));
HeroAttendanceChart.displayName = 'HeroAttendanceChart';

export const HeadcountOverTimeChart = React.memo(({ data }: { data: Array<{ name: string; value: number }> }) => (
   <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
         <defs>
            <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
               <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
               <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
         </defs>
         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} dy={8} interval="preserveStartEnd" />
         <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} width={36} />
         <RechartsTooltip
            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
            contentStyle={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', fontSize: '12px' }}
         />
         <Area type="monotone" dataKey="value" name="Students" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorHeadcount)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
   </ResponsiveContainer>
));
HeadcountOverTimeChart.displayName = 'HeadcountOverTimeChart';
