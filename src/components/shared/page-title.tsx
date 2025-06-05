
import * as React from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For additional actions like buttons
}

export function PageTitle({ title, description, children }: PageTitleProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 sm:flex-nowrap sm:items-center">
      <div className="min-w-0 flex-grow"> {/* Allow title to shrink and wrap */}
        <h1 className="text-xl font-headline font-semibold tracking-tight md:text-2xl leading-tight break-words">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-muted-foreground break-words">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-shrink-0 items-center gap-x-2">{children}</div>} {/* Actions container */}
    </div>
  );
}
