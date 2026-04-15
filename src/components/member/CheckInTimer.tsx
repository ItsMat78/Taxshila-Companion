"use client";

import * as React from 'react';
import { parseISO, differenceInHours, differenceInMinutes } from 'date-fns';

export const CheckInTimer = React.memo(({ checkInTime }: { checkInTime: string }) => {
  const [elapsed, setElapsed] = React.useState<string | null>(null);

  React.useEffect(() => {
    const updateElapsedTime = () => {
      const now = new Date();
      const time = parseISO(checkInTime);
      const hours = differenceInHours(now, time);
      const minutes = differenceInMinutes(now, time) % 60;
      setElapsed(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    };
    updateElapsedTime();
    const id = setInterval(updateElapsedTime, 30000);
    return () => clearInterval(id);
  }, [checkInTime]);

  return <span>{elapsed ?? '--:--'}</span>;
});
CheckInTimer.displayName = 'CheckInTimer';
