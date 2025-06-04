
import {
  LayoutDashboard,
  Users,
  Armchair,
  Bot,
  CalendarDays,
  ListChecks,
  UserPlus,
  Eye,
  Database, 
  type Icon as LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/auth';

export type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  disabled?: boolean;
  label?: string;
  items?: NavItem[];
  roles?: UserRole[];
};

export const mainNav: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    title: 'Students',
    href: '#',
    icon: Users,
    roles: ['admin'],
    items: [
      {
        title: 'Student List',
        href: '/students/list',
        icon: ListChecks,
        roles: ['admin'],
      },
      {
        title: 'Register Student',
        href: '/students/register',
        icon: UserPlus,
        roles: ['admin'],
      },
    ]
  },
  {
    title: 'Seat Management',
    href: '#',
    icon: Armchair,
    roles: ['admin'],
    items: [
      {
        title: 'Check Seat Availability',
        href: '/seats/availability',
        icon: Eye,
        roles: ['admin'],
      },
    ]
  },
  {
    title: 'Attendance Calendar',
    href: '/attendance/calendar',
    icon: CalendarDays,
    roles: ['member', 'admin'],
  },
  {
    title: 'Data Management', 
    href: '/admin/data-management',
    icon: Database,
    roles: ['admin'],
  },
];
