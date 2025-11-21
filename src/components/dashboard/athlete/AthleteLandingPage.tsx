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
  UserCircle,
  Users,
  Eye,
  Briefcase,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Video,
  EyeIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AthleteProfilePreview } from "@/components/profile/AthleteProfilePreview";
import { AthletePortfolioView } from "@/components/athlete/AthletePortfolioView";

interface Connection {
  id: string;
  employer_id: string;
  employer_profiles: {
    company_name: string;
    logo_url: string | null;
    industry: string | null;
  };
}

interface AthleteProfile {
  id: string;
  photo_url: string | null;
  sport_discipline: string | null;
  profile_completeness: number;
  profile_views: number;
  profiles: {
    full_name: string;
  } | null;
}

interface EmployerProfile {
  id: string;
  company_name: string;
  logo_url: string | null;
  industry: string | null;
  opportunities_offered: string | null;
}

interface ConnectionStats {
  pending: number;
  accepted: number;
  rejected: number;
}

interface AthleteHomeProps {
  user: User;
  onNavigate: (view: string) => void;
}

export const AthleteLandingPage = ({ user, onNavigate }: AthleteHomeProps) => {
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    pending: 0,
    accepted: 0,
    rejected: 0,
  });
  const [featuredPartners, setFeaturedPartners] = useState<EmployerProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    // Set up real-time subscription for connection updates
    const channel = supabase
      .channel('athlete-connections')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: profile?.id ? `athlete_id=eq.${profile.id}` : undefined,
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, profile?.id]);

  const loadDashboardData = async () => {
    try {
      // Load athlete profile
      const { data: profileData } = await supabase
        .from("athlete_profiles")
        .select("id, photo_url, sport_discipline, profile_completeness, profile_views, profiles(full_name)")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Load connection stats
        const { data: connections } = await supabase
          .from("connection_requests")
          .select("status")
          .eq("athlete_id", profileData.id);

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
          .select("id, employer_id, employer_profiles(company_name, logo_url, industry)")
          .eq("athlete_id", profileData.id)
          .eq("status", "accepted");

        if (acceptedConnections) setConnections(acceptedConnections);
      }

      // Load featured partners
      const { data: partners } = await supabase
        .from("employer_profiles")
        .select("id, company_name, logo_url, industry, opportunities_offered")
        .order("profile_views", { ascending: false })
        .limit(4);

      if (partners) setFeaturedPartners(partners);
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
              <AvatarImage src={profile?.photo_url || ""} />
              <AvatarFallback>
                {profile?.profiles?.full_name
                  ? profile.profiles.full_name.split(" ").map((n) => n[0]).join("")
                  : "AT"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Welcome back, {profile?.profiles?.full_name?.split(" ")[0] || "Athlete"}
              </h1>
              {profile?.sport_discipline && (
                <p className="text-lg text-muted-foreground">
                  {profile.sport_discipline} Athlete
                </p>
              )}
            </div>
            {completeness < 100 && (
              <Card className="hidden lg:block w-64">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Profile Complete</span>
                      <span className="font-semibold">{completeness}%</span>
                    </div>
                    <Progress value={completeness} className="h-2" />
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => onNavigate("profile")}
                    >
                      Complete your profile <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
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
                Connection Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-muted-foreground">Pending</span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Accepted</span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.accepted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">Declined</span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.rejected}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => onNavigate("connections")}
                >
                  Manage Connections
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Performance Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Profile Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Profile Views</span>
                  </div>
                  <span className="text-4xl font-bold">{profileViewsThisMonth}</span>
                  <p className="text-xs text-muted-foreground mt-1">All time</p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Completeness</span>
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
                    Improve Profile
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
                Quick Actions
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
                  Browse Partner Directory
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onNavigate("profile")}
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  Update Profile
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onNavigate("portfolio")}
                >
                  <Video className="mr-2 h-4 w-4" />
                  Manage Content
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => onNavigate("connections")}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  View Connections
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <EyeIcon className="mr-2 h-4 w-4" />
                      Preview Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Profile Preview - How Partners See You</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="profile" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="achievements">Athlete Content</TabsTrigger>
                      </TabsList>
                      <TabsContent value="profile" className="mt-4">
                        {profile && (
                          <AthleteProfilePreview
                            profile={{ full_name: profile.profiles?.full_name }}
                            profileData={profile}
                            viewMode="public"
                          />
                        )}
                      </TabsContent>
                      <TabsContent value="achievements" className="mt-4">
                        {profile && <AthletePortfolioView athleteId={profile.id} />}
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Connections Section */}
        {connections.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Connections</CardTitle>
                <Button variant="link" onClick={() => onNavigate("connections")}>
                  View All <ArrowRight className="ml-1 h-4 w-4" />
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
                          <AvatarImage src={connection.employer_profiles.logo_url || ""} />
                          <AvatarFallback>
                            {connection.employer_profiles.company_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{connection.employer_profiles.company_name}</p>
                          {connection.employer_profiles.industry && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {connection.employer_profiles.industry}
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

        {/* Featured Partners Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Featured Partners</CardTitle>
              <Button variant="link" onClick={() => onNavigate("directory")}>
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featuredPartners.map((partner) => (
                <Card
                  key={partner.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onNavigate("directory")}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={partner.logo_url || ""} />
                        <AvatarFallback>
                          {partner.company_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{partner.company_name}</p>
                        {partner.industry && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {partner.industry}
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
      </section>
    </div>
  );
};
