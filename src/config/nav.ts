
import {
  LayoutDashboard,
  Users,
  QrCodeIcon,
  Clock,
  Bot,
  CalendarDays,
  type Icon as LucideIcon, // Use `type` for type-only imports
} from 'lucide-react';
import type { UserRole } from '@/types/auth';

export type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  disabled?: boolean;
  label?: string;
  items?: NavItem[];
  roles?: UserRole[]; // Added roles to specify who can see this item
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
    roles: ['member', 'admin'], // Group accessible to both, items within will specify further
    items: [
      {
        title: 'Shift Selection',
        href: '/booking/shifts',
        icon: Clock,
        roles: ['member'],
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
    roles: ['member', 'admin'], // Accessible to both, content might differ based on role
  },
];
