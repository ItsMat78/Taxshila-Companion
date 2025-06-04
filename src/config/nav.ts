
import {
  LayoutDashboard,
  Users,
  QrCodeIcon,
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
    title: 'QR Code',
    href: '/students/qr-code',
    icon: QrCodeIcon,
    roles: ['admin'],
  },
  {
    title: 'Booking',
    href: '#', 
    icon: Clock,
    roles: ['admin'], // Group now admin-only, items within will specify further if needed
    items: [
      {
        title: 'Shift Selection',
        href: '/booking/shifts',
        icon: Clock,
        roles: ['admin'], // Shift selection is now admin-only
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
    roles: ['member', 'admin'], 
  },
];
