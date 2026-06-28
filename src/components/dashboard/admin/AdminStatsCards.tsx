import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Link as LinkIcon, TrendingUp, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { NEW_BADGE_WINDOW_MS } from "@/constants/jobBoard";

export const AdminStatsCards = () => {
  const navigate = useNavigate();
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

  const { data: jobStats } = useQuery({
    queryKey: ['admin-job-stats'],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - NEW_BADGE_WINDOW_MS).toISOString();
      const [{ count: total }, { count: recent }] = await Promise.all([
        supabase.from('job_posts').select('*', { count: 'exact', head: true }),
        supabase.from('job_posts').select('*', { count: 'exact', head: true }).gte('created_at', cutoff),
      ]);
      return { total: total ?? 0, recent: recent ?? 0 };
    },
  });

  const statsCards = [
    {
      title: "Total Users",
      value: (stats?.total_athletes || 0) + (stats?.total_experts || 0),
      subtitle: `${stats?.total_athletes || 0} athletes • ${stats?.total_experts || 0} experts`,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      route: "/admin/users"
    },
    {
      title: "Total Athlete ↔ Expert Connections",
      value: stats?.accepted_expert_connections || 0,
      subtitle: "Accepted mentorship connections",
      icon: CheckCircle,
      color: "text-accent",
      bgColor: "bg-accent/10",
      route: "/admin/expert-connections"
    },
    {
      title: "Pending Requests",
      value: stats?.pending_requests || 0,
      subtitle: "Awaiting response",
      icon: LinkIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
      route: "/admin/requests"
    },
    {
      title: "Rejected",
      value: stats?.rejected_requests || 0,
      subtitle: "Declined requests",
      icon: XCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      route: "/admin/rejected"
    },
    {
      title: "Athlete Profiles",
      value: `${stats?.avg_athlete_completeness || 0}%`,
      subtitle: "Avg. completeness",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      route: "/admin/athletes"
    },
    {
      title: "Expert Profiles",
      value: `${stats?.avg_expert_completeness || 0}%`,
      subtitle: "Avg. completeness",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      route: "/admin/experts"
    },
    {
      title: "Total Jobs Posted",
      value: jobStats?.total ?? 0,
      subtitle: "All-time job board posts",
      icon: Briefcase,
      color: "text-primary",
      bgColor: "bg-primary/10",
      route: "/admin/jobs"
    },
    {
      title: "Jobs Posted, Last 30 Days",
      value: jobStats?.recent ?? 0,
      subtitle: "Posted in the last 30 days",
      icon: Sparkles,
      color: "text-accent",
      bgColor: "bg-accent/10",
      route: "/admin/jobs"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statsCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={stat.title} 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={() => navigate(stat.route)}
          >
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
