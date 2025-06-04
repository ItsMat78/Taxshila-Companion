
"use client";
import * as React from 'react';
import Link from 'next/link';
import { PageTitle } from '@/components/shared/page-title';
import { StatCard } from '@/components/shared/stat-card';
import { 
  Users, 
  Briefcase, 
  Armchair, 
  IndianRupee, 
  Loader2,
  UserPlus,
  CalendarDays,
  Send as SendIcon, 
  Inbox,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getAllStudents, getAvailableSeats } from '@/services/student-service';
import type { Student, Shift } from '@/types/student';

type StatItemConfig = {
  title: string;
  icon: React.ElementType;
  href?: string;
  // For standard StatCard
  value?: string | number;
  description?: string;
  // For custom cards, these specific counts will be used
  isCustom?: boolean; 
};


function AdminDashboardContent() {
  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = React.useState(true);
  
  // State for Occupied Slots breakdown
  const [occupiedMorningStudentsCount, setOccupiedMorningStudentsCount] = React.useState(0);
  const [occupiedEveningStudentsCount, setOccupiedEveningStudentsCount] = React.useState(0);
  const [occupiedFullDayStudentsCount, setOccupiedFullDayStudentsCount] = React.useState(0);

  // State for Available Slots breakdown
  const [availableMorningSlotsCount, setAvailableMorningSlotsCount] = React.useState(0);
  const [availableEveningSlotsCount, setAvailableEveningSlotsCount] = React.useState(0);
  const [availableFullDaySlotsCount, setAvailableFullDaySlotsCount] = React.useState(0);

  React.useEffect(() => {
    const fetchDashboardStats = async () => {
      setIsLoadingDashboardStats(true);
      try {
        const [allStudentsData, morningAvail, eveningAvail, fulldayAvail] = await Promise.all([
          getAllStudents(),
          getAvailableSeats('morning'),
          getAvailableSeats('evening'),
          getAvailableSeats('fullday')
        ]);

        const activeStudents = allStudentsData.filter(s => s.activityStatus === "Active" && s.seatNumber);
        setOccupiedMorningStudentsCount(activeStudents.filter(s => s.shift === 'morning').length);
        setOccupiedEveningStudentsCount(activeStudents.filter(s => s.shift === 'evening').length);
        setOccupiedFullDayStudentsCount(activeStudents.filter(s => s.shift === 'fullday').length);

        setAvailableMorningSlotsCount(morningAvail.length);
        setAvailableEveningSlotsCount(eveningAvail.length);
        setAvailableFullDaySlotsCount(fulldayAvail.length);

      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        // Set counts to 0 or handle error appropriately
        setOccupiedMorningStudentsCount(0);
        setOccupiedEveningStudentsCount(0);
        setOccupiedFullDayStudentsCount(0);
        setAvailableMorningSlotsCount(0);
        setAvailableEveningSlotsCount(0);
        setAvailableFullDaySlotsCount(0);
      } finally {
        setIsLoadingDashboardStats(false);
      }
    };
    fetchDashboardStats();
  }, []);

  const statsConfig: StatItemConfig[] = [
    { title: "Total Students", value: 125, icon: Users, description: "+5 last month", href: "/students/list" }, // Placeholder value
    { 
      title: "Occupied Student Slots", 
      icon: Briefcase, 
      href: "/seats/availability",
      isCustom: true,
    },
    { 
      title: "Available Booking Slots", 
      icon: Armchair, 
      href: "/seats/availability",
      isCustom: true,
    },
    { title: "Revenue", value: "₹15,670", icon: IndianRupee, description: "This month (est.)", href: "/admin/fees/payments-history" },
  ];

  const adminActionTiles = [
    { title: "Manage Students", icon: Users, description: "View, edit student details.", href: "/students/list" },
    { title: "Register Student", icon: UserPlus, description: "Add new students to system.", href: "/students/register" },
    { title: "Attendance Overview", icon: CalendarDays, description: "Check student attendance logs.", href: "/attendance/calendar" },
    { title: "Send Alert", icon: SendIcon, description: "Broadcast to all members.", href: "/admin/alerts/send" },
    { title: "View Feedback", icon: Inbox, description: "Review member suggestions.", href: "/admin/feedback", hasNew: true },
    { title: "Seat Dashboard", icon: Eye, description: "View current seat status.", href: "/seats/availability" },
  ];


  return (
    <>
      <PageTitle title="Admin Dashboard" description="Overview of Taxshila Companion activities." />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat) => {
          const wrapperClasses = "block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full";
          const cardBaseClasses = "flex flex-col items-center justify-center text-center p-3 w-full h-full shadow-md hover:shadow-lg transition-shadow";
          const Icon = stat.icon;

          if (stat.isCustom && stat.href) {
            if (stat.title === "Occupied Student Slots") {
              return (
                <Link href={stat.href} key={stat.title} className={wrapperClasses}>
                  <Card className={cardBaseClasses}>
                    <CardHeader className="p-0 pb-2 items-center">
                      <Icon className="h-6 w-6 mb-1 text-primary" />
                      <ShadcnCardTitle className="text-sm font-semibold text-card-foreground">{stat.title}</ShadcnCardTitle>
                    </CardHeader>
                    <CardContent className="p-0 text-xs space-y-0.5 text-muted-foreground">
                      {isLoadingDashboardStats ? <Loader2 className="h-5 w-5 animate-spin my-2" /> : (
                        <>
                          <p>Morning Students: <span className="font-semibold text-foreground">{occupiedMorningStudentsCount}</span></p>
                          <p>Evening Students: <span className="font-semibold text-foreground">{occupiedEveningStudentsCount}</span></p>
                          <p>Full Day Students: <span className="font-semibold text-foreground">{occupiedFullDayStudentsCount}</span></p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            }
            if (stat.title === "Available Booking Slots") {
              return (
                <Link href={stat.href} key={stat.title} className={wrapperClasses}>
                  <Card className={cardBaseClasses}>
                    <CardHeader className="p-0 pb-2 items-center">
                      <Icon className="h-6 w-6 mb-1 text-primary" />
                      <ShadcnCardTitle className="text-sm font-semibold text-card-foreground">{stat.title}</ShadcnCardTitle>
                    </CardHeader>
                    <CardContent className="p-0 text-xs space-y-0.5 text-muted-foreground">
                      {isLoadingDashboardStats ? <Loader2 className="h-5 w-5 animate-spin my-2" /> : (
                        <>
                          <p>Morning Slots: <span className="font-semibold text-foreground">{availableMorningSlotsCount}</span></p>
                          <p>Evening Slots: <span className="font-semibold text-foreground">{availableEveningSlotsCount}</span></p>
                          <p>Full Day Slots: <span className="font-semibold text-foreground">{availableFullDaySlotsCount}</span></p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            }
          }

          // Standard StatCard rendering
          if (stat.href) {
            return (
              <Link href={stat.href} key={stat.title} className={wrapperClasses}>
                <StatCard
                  title={stat.title}
                  value={stat.value!} // Definite assignment for standard cards
                  icon={stat.icon}
                  description={stat.description}
                  className="shadow-md hover:shadow-lg transition-shadow"
                />
              </Link>
            );
          }
          return (
            <div key={stat.title} className={cn(wrapperClasses, "h-full")}>
               <StatCard
                title={stat.title}
                value={stat.value!}
                icon={stat.icon}
                description={stat.description}
                className="shadow-md hover:shadow-lg transition-shadow"
              />
            </div>
          );
        })}
      </div>

      <div className="my-8 border-t border-border"></div>
      <h2 className="text-lg font-headline font-semibold tracking-tight mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {adminActionTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link href={tile.href} key={tile.title} className="block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg h-full">
              <Card className={cn(
                "shadow-md hover:shadow-lg transition-shadow h-full flex flex-col aspect-square",
                tile.hasNew && "border-destructive ring-2 ring-destructive/50"
              )}>
                <CardHeader className="p-3 pb-1 relative">
                   {tile.hasNew && (
                     <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-destructive ring-1 ring-white" />
                   )}
                  <div className="flex items-center gap-2"> {/* Changed to always have items-center and gap */}
                    <Icon className="h-6 w-6 text-primary" /> 
                    <ShadcnCardTitle className="text-base font-semibold">{tile.title}</ShadcnCardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 flex-grow flex flex-col items-center justify-center">
                  <ShadcnCardDescription className="text-xs text-muted-foreground text-center">{tile.description}</ShadcnCardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default function MainPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'member') {
        router.replace('/member/dashboard');
      }
      // If admin, they stay on this page (implicitly by not redirecting)
    } else if (!isLoading && !user) {
       router.replace('/login'); // Redirect to login if not loading and no user
    }
  }, [user, isLoading, router]);

  if (isLoading || (!user && !isLoading)) { // Show loader if loading OR if not loading and no user (while redirecting)
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }
  
  // At this point, isLoading is false and user exists
  if (user && user.role === 'member') { // Should have been caught by useEffect, but as a fallback
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    );
  }
  
  if (user && user.role === 'admin') {
    return <AdminDashboardContent />;
  }

  // Fallback if something unexpected happens (should ideally not be reached)
  return (
     <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <p className="text-destructive">An unexpected error occurred.</p>
      </div>
  );
}

    