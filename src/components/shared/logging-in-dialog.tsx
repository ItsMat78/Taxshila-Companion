
"use client";

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from 'lucide-react';

interface LoggingInDialogProps {
  isOpen: boolean;
}

export function LoggingInDialog({ isOpen }: LoggingInDialogProps) {
  const descriptionId = React.useId();
  const titleId = React.useId();

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-xs" 
        hideCloseButton 
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <DialogHeader className="items-center text-center">
          <DialogTitle id={titleId} className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span>Login Successful!</span>
          </DialogTitle>
          <DialogDescription id={descriptionId}>
            Redirecting you to your dashboard...
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
