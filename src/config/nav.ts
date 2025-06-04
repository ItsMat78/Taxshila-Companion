
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
  CreditCard,
  Receipt,
  DollarSign,
  BarChart3,
  History,
  QrCode,
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
  // Admin Routes
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['admin'],
  },
  {
    title: 'Students',
    href: '#', // Parent item, no direct link
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
    href: '#', // Parent item
    icon: Armchair,
    roles: ['admin'],
    items: [
      {
        title: 'Seat Availability',
        href: '/seats/availability',
        icon: Eye,
        roles: ['admin'],
      },
    ]
  },
  {
    title: 'Attendance Overview', // Renamed for clarity, admin specific
    href: '/attendance/calendar',
    icon: CalendarDays,
    roles: ['admin'],
  },
  {
    title: 'Financials',
    href: '#', // Parent item
    icon: DollarSign,
    roles: ['admin'],
    items: [
      {
        title: 'Fees Due List',
        href: '/admin/fees/due',
        icon: CreditCard, // More relevant icon for dues
        roles: ['admin'],
      },
      {
        title: 'Payment History',
        href: '/admin/fees/payments-history',
        icon: History,
        roles: ['admin'],
      },
    ]
  },
  {
    title: 'Data Management',
    href: '/admin/data-management',
    icon: Database,
    roles: ['admin'],
  },

  // Member Routes
  {
    title: 'My Attendance',
    href: '/member/attendance',
    icon: BarChart3, // Using a different icon for member's view
    roles: ['member'],
  },
  {
    title: 'My Fees',
    href: '/member/fees',
    icon: Receipt,
    roles: ['member'],
  },
  {
    title: 'Pay Fees',
    href: '/member/pay',
    icon: QrCode, // Icon suggests QR or payment
    roles: ['member'],
  },
];
