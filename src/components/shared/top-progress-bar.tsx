
"use client";

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TopProgressBarProps {
  isLoading: boolean;
}

export function TopProgressBar({ isLoading }: TopProgressBarProps) {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 h-[3px] z-[9999] overflow-hidden bg-primary/20"
      )}
    >
      <div
        className={cn(
          "h-full bg-accent animate-top-progress-bar"
        )}
      />
    </div>
  );
}

// Add a simple progress animation to globals.css or tailwind.config.ts
// For now, I'll define it here and then add to globals.css
// @keyframes top-progress-bar-animation {
//   0% { transform: translateX(-100%); }
//   50% { transform: translateX(0%); } /* Simulates progress */
//   100% { transform: translateX(100%); } /* Moves off screen */
// }
// .animate-top-progress-bar {
//   animation: top-progress-bar-animation 1s linear infinite;
// }
// A simpler pulse animation for now.
// The animation will be handled in globals.css using a simple pulse on the accent color.
