
import * as React from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For additional actions like buttons
}

export function PageTitle({ title, description, children }: PageTitleProps) {
  return (
    <div className="mb-6 flex flex-col gap-y-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-headline font-semibold tracking-tight md:text-2xl leading-tight"> {/* Changed to leading-tight */}
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-x-2">{children}</div>}
    </div>
  );
}
