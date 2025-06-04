
import {
  LayoutDashboard,
  Users,
  Armchair, // Changed from Clock
  Bot,
  CalendarDays,
  ListChecks,
  UserPlus,
  Eye,
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
    title: 'Students', // Changed from 'Student Profiles'
    href: '#', // Adjusted as it now has sub-items
    icon: Users,
    roles: ['admin'],
    items: [
      {
        title: 'Student List',
        href: '/students/list', // New href
        icon: ListChecks,
        roles: ['admin'],
      },
      {
        title: 'Register Student',
        href: '/students/register', // New href
        icon: UserPlus,
        roles: ['admin'],
      },
    ]
  },
  {
    title: 'Seat Management', // Changed from 'Booking Management'
    href: '#',
    icon: Armchair, // Changed icon
    roles: ['admin'],
    items: [
      {
        title: 'Check Seat Availability', // New item
        href: '/seats/availability',
        icon: Eye,
        roles: ['admin'],
      },
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
    roles: ['member', 'admin'], // Remains for members to check-in and admins to view general
  },
];
