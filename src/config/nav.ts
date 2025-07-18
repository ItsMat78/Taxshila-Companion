
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
  IndianRupee,
  BarChart3,
  History,
  QrCode,
  MessageSquare,
  Bell,
  ScrollText,
  Star,
  Inbox,
  Send,
  Edit,
  ClipboardCheck,
  Landmark,
  type Icon as LucideIcon,
  Home,
  UserCircle,
  TrendingUp,
  Settings,
  UploadCloud,
  UserX,
  Shuffle,
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
  external?: boolean;
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
    title: 'Manage Students',
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
        href: '/admin/students/register',
        icon: UserPlus,
        roles: ['admin'],
      },
      {
        title: 'Student Movement',
        href: '/admin/students/movement',
        icon: Shuffle,
        roles: ['admin'],
      },
      {
        title: 'Potential Left',
        href: '/admin/students/potential-left',
        icon: UserX,
        roles: ['admin'],
      },
    ]
  },
  {
    title: 'Manage Seats',
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
    title: 'Check Attendance',
    href: '/attendance/calendar',
    icon: CalendarDays,
    roles: ['admin'],
  },
  {
    title: 'Financials',
    href: '#',
    icon: IndianRupee,
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
        icon: History,
        roles: ['admin'],
      },
      {
        title: 'Revenue History',
        href: '/admin/fees/revenue-history',
        icon: TrendingUp,
        roles: ['admin'],
      },
      {
        title: 'Manage Fees',
        href: '/admin/fees/manage',
        icon: Settings,
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
        title: 'Alerts History',
        href: '/admin/alerts/history',
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
    title: 'Dashboard',
    href: '/member/dashboard',
    icon: Home,
    roles: ['member'],
  },
  {
    title: 'My Profile',
    href: '/member/profile',
    icon: UserCircle,
    roles: ['member'],
  },
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
    href: 'https://g.page/r/CS-yYFo4JxNXEBM/review', // Corrected Rate Us link
    icon: Star,
    roles: ['member'],
    external: true,
  },
];
