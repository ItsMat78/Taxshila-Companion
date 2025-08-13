import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Array<'admin' | 'member'>;
  items?: NavItem[];
  disabled?: boolean;
}
