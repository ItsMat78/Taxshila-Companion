import * as React from 'react';
import { useTheme } from 'next-themes';
import {
   Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
   Line, LineChart, Area, AreaChart
} from "recharts";

// Shared, theme-aware chart styling so grids, cursors and tooltips read correctly in dark mode.
function useChartTheme() {
   const { resolvedTheme } = useTheme();
   const isDark = resolvedTheme === 'dark';
   return React.useMemo(() => {
      const tooltip: React.CSSProperties = {
         borderRadius: '8px',
         border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.6)',
         boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.08)',
         backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.9)',
         backdropFilter: 'blur(8px)',
         padding: '4px 8px',
         fontSize: '12px',
         color: isDark ? '#e2e8f0' : '#334155',
      };
      return {
         isDark,
         grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
         cursorFill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
         axisTick: isDark ? '#94a3b8' : '#9ca3af',
         tooltipContentStyle: tooltip,
         tooltipLabelStyle: { color: isDark ? '#f1f5f9' : '#0f172a', fontWeight: 600 } as React.CSSProperties,
         tooltipItemStyle: { color: isDark ? '#e2e8f0' : '#334155' } as React.CSSProperties,
      };
   }, [isDark]);
}

export const TinyMovementChart = React.memo(({ data }: { data: Array<{ name: string; Joined: number; Left: number }> }) => {
   const t = useChartTheme();
   return (
      <ResponsiveContainer width="100%" height={50}>
         <LineChart data={data}>
            <RechartsTooltip cursor={{ stroke: t.cursorFill }} contentStyle={t.tooltipContentStyle} labelStyle={t.tooltipLabelStyle} itemStyle={t.tooltipItemStyle} labelFormatter={(label: string | number) => `Day ${label}`} />
            <Line type="monotone" dataKey="Joined" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="Left" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
         </LineChart>
      </ResponsiveContainer>
   );
});
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

export const TinyBarChart = React.memo(({ data, color, dataKey, height = 50, labelFormatter }: { data: Array<{ name: string; [key: string]: unknown }>; color: string; dataKey: string; height?: number; labelFormatter?: (label: string | number) => string }) => {
   const t = useChartTheme();
   return (
      <ResponsiveContainer width="100%" height={height}>
         <BarChart data={data}>
            <RechartsTooltip cursor={{ fill: t.cursorFill }} contentStyle={t.tooltipContentStyle} labelStyle={t.tooltipLabelStyle} itemStyle={t.tooltipItemStyle} labelFormatter={labelFormatter} />
            <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
         </BarChart>
      </ResponsiveContainer>
   );
});
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

export const HeroAttendanceChart = React.memo(({ data }: { data: Array<{ day: string; morning: number; evening: number; fullday: number }> }) => {
   const t = useChartTheme();
   return (
      <ResponsiveContainer width="100%" height="100%">
         <BarChart data={data} barSize={28} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.grid} />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: t.axisTick, fontSize: 12 }} dy={10} />
            <RechartsTooltip
               cursor={{ fill: t.cursorFill }}
               contentStyle={t.tooltipContentStyle}
               labelStyle={t.tooltipLabelStyle}
               itemStyle={t.tooltipItemStyle}
            />
            <Bar dataKey="morning" stackId="a" fill="#3b82f6" radius={[0, 0, 6, 6]} />
            <Bar dataKey="evening" stackId="a" fill="#a855f7" />
            <Bar dataKey="fullday" stackId="a" fill="#eab308" radius={[6, 6, 0, 0]} />
         </BarChart>
      </ResponsiveContainer>
   );
});
HeroAttendanceChart.displayName = 'HeroAttendanceChart';

export const HeadcountOverTimeChart = React.memo(({ data }: { data: Array<{ name: string; value: number }> }) => {
   const t = useChartTheme();
   return (
      <ResponsiveContainer width="100%" height="100%">
         <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
               <linearGradient id="colorHeadcount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
               </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.grid} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: t.axisTick, fontSize: 11 }} dy={8} interval="preserveStartEnd" />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: t.axisTick, fontSize: 11 }} width={36} />
            <RechartsTooltip
               cursor={{ fill: t.cursorFill }}
               contentStyle={t.tooltipContentStyle}
               labelStyle={t.tooltipLabelStyle}
               itemStyle={t.tooltipItemStyle}
            />
            <Area type="monotone" dataKey="value" name="Students" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorHeadcount)" dot={false} activeDot={{ r: 4 }} />
         </AreaChart>
      </ResponsiveContainer>
   );
});
HeadcountOverTimeChart.displayName = 'HeadcountOverTimeChart';
