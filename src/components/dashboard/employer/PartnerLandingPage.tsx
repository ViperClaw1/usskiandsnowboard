import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Building2,
  Users,
  Eye,
  Briefcase,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  UserCircle,
  PlusCircle,
} from "lucide-react";
import { useDashboardTextOverrides } from "@/hooks/useDashboardLayout";
import { AIProfilePopulator } from "@/components/profile/AIProfilePopulator";

interface Connection {
  id: string;
  athlete_id: string;
  athlete_profiles: {
    photo_url: string | null;
    sport_discipline: string | null;
    profiles: {
      full_name: string;
    } | null;
  };
}

interface EmployerProfile {
  id: string;
  company_name: string;
  logo_url: string | null;
  industry: string | null;
  profile_completeness: number;
  profile_views: number;
  opportunities_offered: string | null;
}

interface AthleteProfile {
  id: string;
  photo_url: string | null;
  sport_discipline: string | null;
  skills: string[] | null;
  availability: string | null;
  profiles: {
    full_name: string;
  } | null;
}

interface ConnectionStats {
  pending: number;
  accepted: number;
  rejected: number;
}

interface PartnerLandingPageProps {
  user: User;
  onNavigate: (view: string) => void;
  onProfileUpdated?: () => void;
}

export const PartnerLandingPage = ({ user, onNavigate, onProfileUpdated }: PartnerLandingPageProps) => {
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    pending: 0,
    accepted: 0,
    rejected: 0,
  });
  const [featuredAthletes, setFeaturedAthletes] = useState<AthleteProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const { getText } = useDashboardTextOverrides("employer");

  useEffect(() => {
    loadDashboardData();

    // Set up real-time subscriptions
    const connectionsChannel = supabase
      .channel('employer-connections')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: profile?.id ? `employer_id=eq.${profile.id}` : undefined,
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    const profileChannel = supabase
      .channel('employer-profile-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employer_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(connectionsChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user.id, profile?.id]);

  const loadDashboardData = async () => {
    try {
      // Load employer profile
      const { data: profileData } = await supabase
        .from("employer_profiles")
        .select("id, company_name, logo_url, industry, profile_completeness, profile_views, opportunities_offered")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Load connection stats
        const { data: connections } = await supabase
          .from("connection_requests")
          .select("status")
          .eq("employer_id", profileData.id);

        if (connections) {
          setConnectionStats({
            pending: connections.filter((c) => c.status === "pending").length,
            accepted: connections.filter((c) => c.status === "accepted").length,
            rejected: connections.filter((c) => c.status === "rejected").length,
          });
        }

        // Load accepted connections
        const { data: acceptedConnections } = await supabase
          .from("connection_requests")
          .select("id, athlete_id, athlete_profiles(photo_url, sport_discipline, profiles(full_name))")
          .eq("employer_id", profileData.id)
          .eq("status", "accepted");

        if (acceptedConnections) setConnections(acceptedConnections);
      }

      // Load featured athletes
      const { data: athletes } = await supabase
        .from("athlete_profiles")
        .select("id, photo_url, sport_discipline, skills, availability, profiles(full_name)")
        .eq("is_public", true)
        .order("profile_views", { ascending: false })
        .limit(4);

      if (athletes) setFeaturedAthletes(athletes);
    } catch (error) {
      // Error handled silently - will retry on next mount
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  const completeness = profile?.profile_completeness || 0;
  const profileViewsThisMonth = profile?.profile_views || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={profile?.logo_url || ""} />
              <AvatarFallback>
                {profile?.company_name
                  ? profile.company_name.substring(0, 2).toUpperCase()
                  : "CO"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                Welcome back, {profile?.company_name || "Partner"}
              </h1>
              {profile?.industry && (
                <Badge variant="secondary" className="text-sm">
                  {profile.industry}
                </Badge>
              )}
            </div>
            {completeness < 100 && (
              <Card className="hidden lg:block w-64">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{getText("hero.profile_complete_label", "Profile Complete")}</span>
                      <span className="font-semibold">{completeness}%</span>
                    </div>
                    <Progress value={completeness} className="h-2" />
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => onNavigate("profile")}
                    >
                      {getText("hero.complete_profile_cta", "Complete your profile")} <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                    <AIProfilePopulator
                      role="employer"
                      userId={user.id}
                      onComplete={() => { loadDashboardData(); onProfileUpdated?.(); }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Dashboard Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Connection Activity Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {getText("connection_activity.title", "Connection Activity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">{getText("connection_activity.pending", "Pending")}</span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">{getText("connection_activity.accepted", "Accepted")}</span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.accepted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">{getText("connection_activity.declined", "Declined")}</span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.rejected}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => onNavigate("connections")}
                >
                  {getText("connection_activity.button", "Manage Connections")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Performance Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {getText("profile_performance.title", "Profile Performance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{getText("profile_performance.views_label", "Profile Views")}</span>
                  </div>
                  <span className="text-4xl font-bold">{profileViewsThisMonth}</span>
                  <p className="text-xs text-muted-foreground mt-1">{getText("profile_performance.views_subtitle", "All time")}</p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">{getText("profile_performance.completeness_label", "Completeness")}</span>
                    <span className="text-sm font-semibold">{completeness}%</span>
                  </div>
                  <Progress value={completeness} className="h-2" />
                </div>
                {completeness < 100 && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => onNavigate("profile")}
                  >
                    {getText("profile_performance.button", "Improve Profile")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                {getText("quick_actions.title", "Quick Actions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onNavigate("directory")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  {getText("quick_actions.browse_directory", "Browse Athlete Directory")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onNavigate("opportunities")}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {getText("quick_actions.manage_opportunities", "Manage Opportunities")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onNavigate("profile")}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  {getText("quick_actions.update_profile", "Update Company Profile")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onNavigate("connections")}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {getText("quick_actions.view_connections", "View My Connections")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onNavigate("preview")}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {getText("quick_actions.preview_profile", "Preview My Profile")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Connections Section */}
        {connections.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{getText("my_connections.title", "My Connections")}</CardTitle>
                <Button variant="link" onClick={() => onNavigate("connections")}>
                  {getText("my_connections.view_all", "View All")} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {connections.slice(0, 4).map((connection) => (
                  <Card
                    key={connection.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onNavigate("connections")}
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={connection.athlete_profiles.photo_url || ""} />
                          <AvatarFallback>
                            {connection.athlete_profiles.profiles?.full_name
                              ? connection.athlete_profiles.profiles.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : "AT"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">
                            {connection.athlete_profiles.profiles?.full_name || "Athlete"}
                          </p>
                          {connection.athlete_profiles.sport_discipline && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {connection.athlete_profiles.sport_discipline}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Featured Athletes Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{getText("featured.title", "Featured Athletes")}</CardTitle>
              <Button variant="link" onClick={() => onNavigate("directory")}>
                {getText("featured.view_all", "View All")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featuredAthletes.map((athlete) => (
                <Card
                  key={athlete.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onNavigate("directory")}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={athlete.photo_url || ""} />
                        <AvatarFallback>
                          {athlete.profiles?.full_name
                            ? athlete.profiles.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "AT"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">
                          {athlete.profiles?.full_name || "Athlete"}
                        </p>
                        {athlete.sport_discipline && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {athlete.sport_discipline}
                          </Badge>
                        )}
                      </div>
                      {athlete.skills && athlete.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {athlete.skills.slice(0, 2).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {athlete.availability && (
                        <Badge variant="outline" className="text-xs">
                          {athlete.availability}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
