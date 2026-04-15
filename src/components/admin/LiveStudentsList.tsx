"use client";

import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AlertCircle, Monitor, Sunrise, Moon, Sun, LogIn } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { CheckedInStudentInfo } from '@/types/student';

export interface LiveStudentsListProps {
  students: CheckedInStudentInfo[];
  isLoading: boolean;
  getInitials: (name?: string) => string;
  className?: string;
}

const ROW_HEIGHT = 68;

export const LiveStudentsList = React.memo(function LiveStudentsList({
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
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
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
