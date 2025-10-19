import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Link as LinkIcon, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const AdminStatsCards = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_analytics_summary')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const statsCards = [
    {
      title: "Total Users",
      value: stats?.total_users || 0,
      subtitle: `${stats?.total_athletes || 0} athletes • ${stats?.total_employers || 0} employers`,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Total Connections",
      value: stats?.accepted_connections || 0,
      subtitle: `${stats?.total_requests || 0} total requests`,
      icon: CheckCircle,
      color: "text-accent",
      bgColor: "bg-accent/10"
    },
    {
      title: "Pending Requests",
      value: stats?.pending_requests || 0,
      subtitle: "Awaiting response",
      icon: LinkIcon,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Rejected",
      value: stats?.rejected_requests || 0,
      subtitle: "Declined requests",
      icon: XCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted"
    },
    {
      title: "Athlete Profiles",
      value: `${stats?.avg_athlete_completeness || 0}%`,
      subtitle: "Avg. completeness",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Employer Profiles",
      value: `${stats?.avg_employer_completeness || 0}%`,
      subtitle: "Avg. completeness",
      icon: Briefcase,
      color: "text-accent",
      bgColor: "bg-accent/10"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
