
"use client";

import { toast } from "@/hooks/use-toast";

// A simple client-side logger that shows a toast only if in the Median app.
class MedianDebugLogger {
  private logs: string[] = [];
  private isMedianApp: boolean = false;
  private logTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // This check will only work on the client-side
    if (typeof window !== 'undefined' && (window as any).median) {
      this.isMedianApp = true;
    }
  }

  log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(`MedianLogger: ${logMessage}`); // Always log to console

    if (!this.isMedianApp) {
      return;
    }

    this.logs.push(logMessage);
    this.scheduleToast();
  }

  private scheduleToast() {
    if (this.logTimeout) {
      clearTimeout(this.logTimeout);
    }

    // Debounce the toast to batch rapid logs
    this.logTimeout = setTimeout(() => {
      this.showToast();
      this.logs = []; // Clear logs after showing
    }, 500);
  }

  private showToast() {
    if (this.logs.length === 0) return;

    const formattedLogs = this.logs.join('\n');

    toast({
      title: "Median App Debug Log",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white text-xs">{formattedLogs}</code>
        </pre>
      ),
      duration: 15000, // Keep toast open for 15 seconds
    });
  }
}

// Export a singleton instance of the logger
export const medianLogger = new MedianDebugLogger();
