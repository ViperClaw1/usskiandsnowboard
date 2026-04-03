import { useEffect, useRef, useState } from "react";
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
  UserCircle,
  PlusCircle,
  Pencil,
  MapPin,
  ExternalLink,
  Linkedin,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { useDashboardTextOverrides } from "@/hooks/useDashboardLayout";
import { AIProfilePopulator } from "@/components/profile/AIProfilePopulator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Connection {
  id: string;
  athlete_id: string;
  athlete_profiles: {
    photo_url: string | null;
    sport_discipline: string[] | null;
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
  hq_location: string | null;
  website: string | null;
  linkedin_url: string | null;
  background_image_url?: string | null;
}

interface AthleteProfile {
  id: string;
  photo_url: string | null;
  sport_discipline: string[] | null;
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

interface DashboardData {
  profile: EmployerProfile | null;
  connectionStats: ConnectionStats;
  connections: Connection[];
  featuredAthletes: AthleteProfile[];
}

interface PartnerLandingPageProps {
  user: User;
  onNavigate: (view: string) => void;
  onProfileUpdated?: () => void;
}

export const partnerDashboardKey = (userId: string) => ["partner-landing-dashboard", userId];
const partnerFeaturedAthletesKey = ["partner-landing-featured-athletes"];

const fetchPartnerDashboard = async (userId: string): Promise<DashboardData> => {
  const { data: profileData } = await supabase
    .from("employer_profiles")
    .select(
      "id, company_name, logo_url, industry, profile_completeness, profile_views, opportunities_offered, hq_location, website, linkedin_url, background_image_url",
    )
    .eq("user_id", userId)
    .single();

  if (!profileData) {
    return {
      profile: null,
      connectionStats: { pending: 0, accepted: 0, rejected: 0 },
      connections: [],
      featuredAthletes: [],
    };
  }

  const [{ data: allConnections }, { data: acceptedConnections }] = await Promise.all([
    supabase.from("connection_requests").select("status").eq("employer_id", profileData.id),
    supabase
      .from("connection_requests")
      .select("id, athlete_id, athlete_profiles(photo_url, sport_discipline, profiles(full_name))")
      .eq("employer_id", profileData.id)
      .eq("status", "accepted"),
  ]);

  const connectionStats: ConnectionStats = {
    pending: allConnections?.filter((c) => c.status === "pending").length ?? 0,
    accepted: allConnections?.filter((c) => c.status === "accepted").length ?? 0,
    rejected: allConnections?.filter((c) => c.status === "rejected").length ?? 0,
  };

  return {
    profile: profileData,
    connectionStats,
    connections: (acceptedConnections as Connection[]) ?? [],
    featuredAthletes: [],
  };
};

const fetchFeaturedAthletes = async (): Promise<AthleteProfile[]> => {
  const { data } = await supabase
    .from("athlete_profiles")
    .select("id, photo_url, sport_discipline, skills, availability, profiles(full_name)")
    .eq("is_public", true)
    .order("profile_views", { ascending: false })
    .limit(4);

  return (data as AthleteProfile[]) ?? [];
};

export const PartnerLandingPage = ({ user, onNavigate, onProfileUpdated }: PartnerLandingPageProps) => {
  const queryClient = useQueryClient();
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [localBgUrl, setLocalBgUrl] = useState<string | null>(null);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }
    setUploadingBg(true);
    try {
      const ext = file.name.split(".").pop();
      const ts = Date.now();
      const path = `${user.id}/bg-${ts}.${ext}`;
      const { error: upErr } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("company-logos").getPublicUrl(path);
      await supabase.from("employer_profiles").update({ background_image_url: publicUrl }).eq("user_id", user.id);
      setLocalBgUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: partnerDashboardKey(user.id) });
      toast.success("Background image updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload background image");
    } finally {
      setUploadingBg(false);
    }
  };
  const { getText, typography } = useDashboardTextOverrides("employer");

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: partnerDashboardKey(user.id),
    queryFn: () => fetchPartnerDashboard(user.id),
    initialData: () => queryClient.getQueryData<DashboardData>(partnerDashboardKey(user.id)),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => 1000 * (attempt + 1),
  });

  const { data: featuredAthletes = [], isLoading: athletesLoading } = useQuery<AthleteProfile[]>({
    queryKey: partnerFeaturedAthletesKey,
    queryFn: fetchFeaturedAthletes,
    initialData: () => queryClient.getQueryData<AthleteProfile[]>(partnerFeaturedAthletesKey),
    staleTime: 5 * 60 * 1000,
  });

  const profile = dashboardData?.profile ?? null;
  const connectionStats = dashboardData?.connectionStats ?? { pending: 0, accepted: 0, rejected: 0 };
  const connections = dashboardData?.connections ?? [];

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: partnerDashboardKey(user.id) });

    const connectionsChannel = supabase
      .channel("employer-connections")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
          filter: profile?.id ? `employer_id=eq.${profile.id}` : undefined,
        },
        invalidate,
      )
      .subscribe();

    const profileChannel = supabase
      .channel("employer-profile-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "employer_profiles",
          filter: `user_id=eq.${user.id}`,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(connectionsChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user.id, profile?.id, queryClient]);

  if (dashboardLoading || athletesLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  const completeness = profile?.profile_completeness ?? 0;
  const profileViewsThisMonth = profile?.profile_views ?? 0;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-background to-muted/30"
      style={{ fontFamily: typography.fontFamily, fontSize: `${typography.fontSize}px` }}
    >
      <section className="px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-visible sm:overflow-hidden rounded-xl border shadow-elegant">
            {/* Banner — relative so the sm+ absolute block is contained here; parent for avatar alignment on mobile */}
            <div className="relative overflow-visible">
              {/* Background image — on mobile avatar center aligns with this div's bottom */}
              <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
              {localBgUrl || profile?.background_image_url ? (
                <div
                  className="h-40 sm:h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-muted"
                  style={{
                    backgroundImage: `url(${localBgUrl || profile?.background_image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ) : (
                <div className="h-40 sm:h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => bgInputRef.current?.click()}
                    disabled={uploadingBg}
                    className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    {uploadingBg ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <ImagePlus className="h-8 w-8 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-sm font-medium">{uploadingBg ? "Uploading…" : "Add background photo"}</span>
                  </button>
                </div>
              )}
              {(localBgUrl || profile?.background_image_url) && (
                <button
                  type="button"
                  onClick={() => bgInputRef.current?.click()}
                  disabled={uploadingBg}
                  className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-background/80 hover:bg-background text-foreground shadow transition-colors"
                >
                  {uploadingBg ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                  Change photo
                </button>
              )}

              {/* Edit button */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 hover:bg-background shadow-md"
                onClick={() => onNavigate("profile")}
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4 text-gray-950" />
              </Button>

              {/*
                Profile row — spans the full card width.
                Mobile  (<640px): flows below banner, -mt-16 so avatar straddles banner edge.
                sm+ (>=640px): absolute, translate-y-1/2 — left = profile info, right = completion card.
              */}
              <div className="-mt-16 [@media(min-width:930px)]:mt-0 [@media(min-width:930px)]:absolute [@media(min-width:930px)]:bottom-0 [@media(min-width:930px)]:left-0 [@media(min-width:930px)]:right-0 [@media(min-width:930px)]:translate-y-1/2 z-10">
                <div className="flex flex-col [@media(min-width:930px)]:flex-row [@media(min-width:930px)]:items-end [@media(min-width:930px)]:justify-between [@media(min-width:930px)]:px-6 gap-4">
                  {/* Left — profile info */}
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-background w-full rounded-t-xl sm:rounded-t-none sm:rounded-t-xl sm:w-fit">
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-lg shrink-0 -mt-12 sm:mt-0">
                      <AvatarImage src={profile?.logo_url || ""} />
                      <AvatarFallback className="text-xl sm:text-2xl">
                        {profile?.company_name ? profile.company_name.substring(0, 2).toUpperCase() : "CO"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground drop-shadow-sm">
                        {profile?.company_name || "Partner"}
                      </h1>
                      {profile?.industry && (
                        <p className="max-w-[min(100%,28rem)] text-base text-muted-foreground leading-snug break-words">
                          {profile.industry}
                        </p>
                      )}
                      {profile?.hq_location && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {profile.hq_location}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {profile?.website && (
                          <a
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Website
                          </a>
                        )}
                        {profile?.linkedin_url && (
                          <a
                            href={profile.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline"
                          >
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                          </a>
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-muted-foreground"
                          onClick={() => onNavigate("profile")}
                        >
                          Edit profile
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Right — completion card, only when profile is incomplete */}
                  {completeness < 100 && (
                    <Card className="w-auto mx-3 [@media(min-width:930px)]:mx-0 [@media(min-width:930px)]:w-64 [@media(min-width:930px)]:max-w-[calc(100%-2rem)] shrink-0">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {getText("hero.profile_complete_label", "Profile Complete")}
                            </span>
                            <span className="font-semibold">{completeness}%</span>
                          </div>
                          <Progress value={completeness} className="h-2" />
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => onNavigate("profile")}>
                              {getText("hero.complete_profile_cta", "Complete your profile")}{" "}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                            <div className="basis-full [@media(min-width:930px)]:basis-auto">
                              <AIProfilePopulator
                                role="employer"
                                userId={user.id}
                                onComplete={() => {
                                  queryClient.invalidateQueries({ queryKey: partnerDashboardKey(user.id) });
                                  onProfileUpdated?.();
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            {/* Spacer — reserves vertical room for the absolutely-positioned profile row on sm+ */}
            <div className="[@media(min-width:930px)]:pt-20 [@media(min-width:930px)]:pb-6" />
          </Card>
        </div>
      </section>

      {/* Dashboard Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">
                      {getText("connection_activity.requests", "Requests")}
                    </span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      {getText("connection_activity.connections", "Connections")}
                    </span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.accepted}</span>
                </div>
                <Button variant="outline" className="w-full mt-2" onClick={() => onNavigate("connections")}>
                  {getText("connection_activity.button", "View Activity Board")}
                </Button>
              </div>
            </CardContent>
          </Card>

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
                    <span className="text-sm text-muted-foreground">
                      {getText("profile_performance.views_label", "Profile Views")}
                    </span>
                  </div>
                  <span className="text-4xl font-bold">{profileViewsThisMonth}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getText("profile_performance.views_subtitle", "All time")}
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">
                      {getText("profile_performance.completeness_label", "Completeness")}
                    </span>
                    <span className="text-sm font-semibold">{completeness}%</span>
                  </div>
                  <Progress value={completeness} className="h-2" />
                </div>
                {completeness < 100 && (
                  <Button variant="outline" className="w-full mt-2" onClick={() => onNavigate("profile")}>
                    {getText("profile_performance.button", "Improve Profile")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                {getText("quick_actions.title", "Quick Actions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("directory")}>
                  <Users className="mr-2 h-4 w-4" />
                  {getText("quick_actions.browse_directory", "Browse Athlete Directory")}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("opportunities")}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {getText("quick_actions.manage_opportunities", "Manage Opportunities")}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("profile")}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  {getText("quick_actions.update_profile", "Update Company Profile")}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("connections")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {getText("quick_actions.view_connections", "View My Connections")}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("preview")}>
                  <Eye className="mr-2 h-4 w-4" />
                  {getText("quick_actions.preview_profile", "Preview My Profile")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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
                        <p className="font-semibold text-sm">{athlete.profiles?.full_name || "Athlete"}</p>
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
