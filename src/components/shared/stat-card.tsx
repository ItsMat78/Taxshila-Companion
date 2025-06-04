
import * as React from 'react';
import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <Card className={cn(
      "flex flex-col items-center justify-center text-center p-3 w-full h-full", 
      className
    )}>
      {Icon && <Icon className="h-6 w-6 mb-1 text-primary" />}
      <div className="text-sm font-semibold text-card-foreground mb-1">{title}</div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </Card>
  );
}
