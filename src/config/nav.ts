
import {
  LayoutDashboard,
  Users,
  ListChecks,
  UserPlus,
  Shuffle,
  UserX,
  Armchair,
  Eye,
  CalendarDays,
  IndianRupee,
  CreditCard,
  History,
  TrendingUp,
  Settings,
  MessageSquare,
  Inbox,
  Send,
  Database,
  Shield,
  Home,
  AlertCircle,
  BookOpenCheck,
  BadgeIndianRupee,
  User,
  QrCode,
  Wifi,
  Notebook,
} from 'lucide-react';
import { NavItem } from '@/types/nav';

export const mainNav: NavItem[] = [
  // Admin Routes
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
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
        title: 'Absent Students',
        href: '/admin/students/potential-left',
        icon: UserX,
        roles: ['admin'],
      },
    ],
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
    ],
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
    ],
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
    ],
  },
  {
    title: 'Admin Notes',
    href: '/admin/notes',
    icon: Notebook,
    roles: ['admin'],
  },
  {
    title: 'Settings',
    href: '#',
    icon: Settings,
    roles: ['admin'],
    items: [
        {
            title: 'Admin Management',
            href: '/admin/manage',
            icon: Shield,
            roles: ['admin'],
        },
        {
            title: 'WiFi Management',
            href: '/admin/settings/wifi',
            icon: Wifi,
            roles: ['admin'],
        },
        {
            title: 'Data Management',
            href: '/admin/data-management',
            icon: Database,
            roles: ['admin'],
        },
    ]
  },

  // Member (Student) Routes
  {
    title: 'Dashboard',
    href: '/member/dashboard',
    icon: Home,
    roles: ['member'],
  },
  {
    title: 'My Profile',
    href: '/member/profile',
    icon: User,
    roles: ['member'],
  },
  {
    title: 'My Attendance',
    href: '/member/attendance',
    icon: CalendarDays,
    roles: ['member'],
  },
  {
    title: 'My Payments',
    href: '/member/fees',
    icon: BadgeIndianRupee,
    roles: ['member'],
  },
  {
    title: 'Alerts',
    href: '/member/alerts',
    icon: AlertCircle,
    roles: ['member'],
  },
  {
    title: 'Library Rules',
    href: '/member/rules',
    icon: BookOpenCheck,
    roles: ['member'],
  },
  {
    title: 'Submit Feedback',
    href: '/member/feedback',
    icon: MessageSquare,
    roles: ['member'],
  },
];

    