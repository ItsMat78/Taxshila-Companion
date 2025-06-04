import {
  LayoutDashboard,
  Users,
  QrCodeIcon, // Using QrCodeIcon as QrCode might not be available
  Clock,
  Bot,
  CalendarDays,
  Icon as LucideIcon,
} from 'lucide-react';

export type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  disabled?: boolean;
  label?: string;
  items?: NavItem[]; // For sub-menus if needed in future
};

export const mainNav: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Student Profiles',
    href: '/students/profiles',
    icon: Users,
  },
  {
    title: 'QR Code',
    href: '/students/qr-code',
    icon: QrCodeIcon,
  },
  {
    title: 'Booking',
    href: '#', // Main group item, not a direct link
    icon: Clock,
    items: [
      {
        title: 'Shift Selection',
        href: '/booking/shifts',
        icon: Clock, // Repeating icon or can be different
      },
      {
        title: 'Seat Release AI',
        href: '/booking/seat-release',
        icon: Bot,
      },
    ]
  },
  {
    title: 'Attendance Calendar',
    href: '/attendance/calendar',
    icon: CalendarDays,
  },
];
