
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
  MessageSquare,
  Bell,
  ScrollText,
  Star,
  Inbox,
  Send,
  Edit, // Added for Edit Student
  ClipboardCheck, // Added for Mark Payment
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
  external?: boolean; // To indicate external links
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
      // Edit Student is accessed via the list, so no direct nav item typically.
    ]
  },
  {
    title: 'Seat Management',
    href: '#', 
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
    title: 'Attendance Overview', 
    href: '/attendance/calendar',
    icon: CalendarDays,
    roles: ['admin'],
  },
  {
    title: 'Financials',
    href: '#', 
    icon: DollarSign,
    roles: ['admin'],
    items: [
      {
        title: 'Fees Due List',
        href: '/admin/fees/due',
        icon: CreditCard, 
        roles: ['admin'],
      },
      {
        title: 'Payment History',
        href: '/admin/fees/payments-history',
        icon: History, // Kept History icon
        roles: ['admin'],
      },
    ]
  },
  {
    title: 'Communication',
    href: '#',
    icon: MessageSquare,
    roles: ['admin'],
    items: [
      {
        title: 'View Feedback',
        href: '/admin/feedback',
        icon: Inbox,
        roles: ['admin'],
      },
      {
        title: 'Send Alert',
        href: '/admin/alerts/send',
        icon: Send,
        roles: ['admin'],
      },
      {
        title: 'Alerts History', // New
        href: '/admin/alerts/history',
        icon: History, // Using History icon for consistency
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
    icon: BarChart3, 
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
    icon: QrCode, 
    roles: ['member'],
  },
  {
    title: 'Submit Feedback',
    href: '/member/feedback',
    icon: MessageSquare,
    roles: ['member'],
  },
  {
    title: 'Alerts',
    href: '/member/alerts',
    icon: Bell,
    roles: ['member'],
  },
  {
    title: 'Library Rules',
    href: '/member/rules',
    icon: ScrollText,
    roles: ['member'],
  },
  {
    title: 'Rate Us',
    href: 'https://www.google.com/maps/search/?api=1&query=Taxshila+Study+Hall+Pune', 
    icon: Star,
    roles: ['member'],
    external: true,
  },
];
