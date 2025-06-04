
import {
  LayoutDashboard,
  Users,
  Clock,
  Bot,
  CalendarDays,
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
    title: 'Student Profiles',
    href: '/students/profiles',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Booking Management',
    href: '#',
    icon: Clock,
    roles: ['admin'],
    items: [
      {
        title: 'Seat Release AI',
        href: '/booking/seat-release',
        icon: Bot,
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
];
