import { PageTitle } from '@/components/shared/page-title';
import { StatCard } from '@/components/shared/stat-card';
import { Users, Briefcase, WifiOff, CheckSquare } from 'lucide-react'; // Using Briefcase for seats

export default function AdminDashboardPage() {
  // Placeholder data
  const stats = [
    { title: "Total Students", value: 125, icon: Users, description: "+5 since last month" },
    { title: "Active Seats", value: 80, icon: Briefcase, description: "Currently occupied" },
    { title: "Inactive Seats", value: 20, icon: WifiOff, description: "Needs attention" },
    { title: "Total Bookings Today", value: 95, icon: CheckSquare, description: "Across all shifts" },
  ];

  return (
    <>
      <PageTitle title="Admin Dashboard" description="Overview of Taxshila Companion activities." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
          />
        ))}
      </div>
      {/* Placeholder for future charts or more detailed stats */}
      {/* <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Occupancy Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chart placeholder</p>
          </CardContent>
        </Card>
      </div> */}
    </>
  );
}
