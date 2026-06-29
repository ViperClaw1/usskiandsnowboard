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
  UserCircle,
  Users,
  Eye,
  Briefcase,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  
  EyeIcon,
  Pencil,
  MapPin,
  Instagram,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AthleteProfilePreview } from "@/components/profile/AthleteProfilePreview";
import { useDashboardTextOverrides } from "@/hooks/useDashboardLayout";
import { AIProfilePopulator } from "@/components/profile/AIProfilePopulator";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  sport_discipline: string[] | null;
  profile_completeness: number;
  profile_views: number;
  bio: string | null;
  availability: string | null;
  years_of_membership: number | null;
  skills: string[] | null;
  career_interests: string[] | null;
  geographic_preferences: string[] | null;
  home_mountain: string | null;
  hero_image_url: string | null;
  background_image_url: string | null;
  professional_highlights: string | null;
  sponsors: string[] | null;
  email: string | null;
  instagram_url: string | null;
  profiles: {
    full_name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

interface ExpertProfile {
  id: string;
  user_id: string;
  full_name: string;
  photo_url: string | null;
  background_image_url: string | null;
  job_title: string | null;
  company_name: string | null;
  area_of_expertise: string | null;
  bio: string | null;
  industry: string | null;
  linkedin_url: string | null;
  ussa_affiliate: string | null;
  profile_views: number | null;
}

interface ConnectionStats {
  pending: number;
  accepted: number;
  rejected: number;
}

interface AthleteDashboardData {
  profile: AthleteProfile | null;
  connectionStats: ConnectionStats;
  connections: Connection[];
}

interface AthleteHomeProps {
  user: User;
  onNavigate: (view: string) => void;
  onProfileUpdated?: () => void;
}

export const athleteDashboardKey = (userId: string) => ["athlete-landing-dashboard", userId];
const athleteFeaturedExpertsKey = (interests: string[]) => [
  "athlete-landing-featured-experts",
  ...[...interests].sort(),
];

const fetchAthleteDashboard = async (userId: string): Promise<AthleteDashboardData> => {
  const { data: profileData } = await supabase
    .from("athlete_profiles")
    .select("*, profiles(full_name, email, phone, first_name, last_name)")
    .eq("user_id", userId)
    .single();

  if (!profileData) {
    return {
      profile: null,
      connectionStats: { pending: 0, accepted: 0, rejected: 0 },
      connections: [],
    };
  }

  const [{ data: allConnections }, { data: acceptedConnections }] = await Promise.all([
    supabase.from("connection_requests").select("status").eq("athlete_id", profileData.id),
    supabase
      .from("connection_requests")
      .select("id, employer_id, employer_profiles(company_name, logo_url, industry)")
      .eq("athlete_id", profileData.id)
      .eq("status", "accepted"),
  ]);

  const connectionStats: ConnectionStats = {
    pending: allConnections?.filter((c) => c.status === "pending").length ?? 0,
    accepted: allConnections?.filter((c) => c.status === "accepted").length ?? 0,
    rejected: allConnections?.filter((c) => c.status === "rejected").length ?? 0,
  };

  return {
    profile: profileData as AthleteProfile,
    connectionStats,
    connections: (acceptedConnections as Connection[]) ?? [],
  };
};

const normalizeIndustries = (industry: string | null): string[] =>
  (industry ?? "")
    .split(/[,;|]/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

const fetchFeaturedExperts = async (interests: string[]): Promise<ExpertProfile[]> => {
  const { data } = await supabase
    .from("expert_profiles")
    .select(
      "id, user_id, full_name, photo_url, background_image_url, job_title, company_name, area_of_expertise, bio, industry, linkedin_url, ussa_affiliate, profile_views",
    )
    .eq("is_public", true)
    .order("profile_views", { ascending: false })
    .limit(24);

  const experts = (data as ExpertProfile[]) ?? [];
  const normalizedInterests = interests.map((i) => i.toLowerCase().trim()).filter(Boolean);

  if (normalizedInterests.length === 0) return experts.slice(0, 4);

  const scored = experts
    .map((e) => {
      const inds = normalizeIndustries(e.industry);
      const matches = inds.filter((i) =>
        normalizedInterests.some((ni) => i.includes(ni) || ni.includes(i)),
      ).length;
      return { expert: e, matches };
    })
    .sort((a, b) => b.matches - a.matches || (b.expert.profile_views ?? 0) - (a.expert.profile_views ?? 0));

  const matched = scored.filter((s) => s.matches > 0).map((s) => s.expert);
  if (matched.length >= 4) return matched.slice(0, 4);
  const fillers = experts.filter((e) => !matched.find((m) => m.id === e.id));
  return [...matched, ...fillers].slice(0, 4);
};

const getShortIndustryBadgeLabel = (industry: string | null) => {
  if (!industry) return null;
  const primary = industry
    .split(/[,;|]/)
    .map((v) => v.trim())
    .find(Boolean);
  if (!primary) return null;
  return primary.length > 42 ? `${primary.slice(0, 39).trimEnd()}...` : primary;
};

export const AthleteLandingPage = ({ user, onNavigate, onProfileUpdated }: AthleteHomeProps) => {
  const queryClient = useQueryClient();
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [localBgUrl, setLocalBgUrl] = useState<string | null>(null);
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);

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
      const { error: upErr } = await supabase.storage.from("athlete-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("athlete-assets").getPublicUrl(path);
      await supabase.from("athlete_profiles").update({ background_image_url: publicUrl }).eq("user_id", user.id);
      setLocalBgUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: athleteDashboardKey(user.id) });
      toast.success("Background image updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload background image");
    } finally {
      setUploadingBg(false);
    }
  };
  const { getText, typography } = useDashboardTextOverrides("athlete");

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<AthleteDashboardData>({
    queryKey: athleteDashboardKey(user.id),
    queryFn: () => fetchAthleteDashboard(user.id),
    initialData: () => queryClient.getQueryData<AthleteDashboardData>(athleteDashboardKey(user.id)),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => 1000 * (attempt + 1),
  });

  const athleteInterests = dashboardData?.profile?.career_interests ?? [];
  const { data: featuredExperts = [], isLoading: expertsLoading } = useQuery<ExpertProfile[]>({
    queryKey: athleteFeaturedExpertsKey(athleteInterests),
    queryFn: () => fetchFeaturedExperts(athleteInterests),
    initialData: () => queryClient.getQueryData<ExpertProfile[]>(athleteFeaturedExpertsKey(athleteInterests)),
    staleTime: 5 * 60 * 1000,
    enabled: !!dashboardData?.profile,
  });

  const profile = dashboardData?.profile ?? null;
  const connectionStats = dashboardData?.connectionStats ?? { pending: 0, accepted: 0, rejected: 0 };
  const connections = dashboardData?.connections ?? [];

  useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: athleteDashboardKey(user.id) });

    const channel = supabase
      .channel("athlete-connections")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
          filter: profile?.id ? `athlete_id=eq.${profile.id}` : undefined,
        },
        invalidate,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, profile?.id, queryClient]);

  if (dashboardLoading || partnersLoading) {
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
      className="bg-gradient-to-b from-background to-muted/30"
      style={{ fontFamily: typography.fontFamily, fontSize: `${typography.fontSize}px` }}
    >
      <section className="px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-visible sm:overflow-hidden rounded-lg border shadow-elegant">
            {/* Banner — relative container for the absolute profile row on sm+ */}
            <div className="relative overflow-visible">
              {/* Background image / gradient */}
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
                    <span className="hidden sm:inline text-sm font-medium">
                      {uploadingBg ? "Uploading\u2026" : "Add background photo"}
                    </span>
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

              <div className="-mt-16 [@media(min-width:930px)]:mt-0 [@media(min-width:930px)]:absolute [@media(min-width:930px)]:bottom-0 [@media(min-width:930px)]:left-0 [@media(min-width:930px)]:right-0 [@media(min-width:930px)]:translate-y-1/2 z-10">
                <div className="flex flex-col [@media(min-width:930px)]:flex-row [@media(min-width:930px)]:items-end [@media(min-width:930px)]:justify-between [@media(min-width:930px)]:px-6 gap-4">
                  {/* Left — profile info */}
                  <div
                    className="flex flex-col sm:flex-row items-start gap-4 p-4 w-full rounded-lg sm:w-fit shadow-sm"
                    style={{ backgroundColor: "#ffffff", opacity: 1 }}
                  >
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-lg shrink-0 -mt-12 sm:mt-0">
                      <AvatarImage src={profile?.photo_url || ""} />
                      <AvatarFallback className="text-xl sm:text-2xl">
                        {profile?.profiles?.full_name
                          ? profile.profiles.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                          : "AT"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground drop-shadow-sm">
                        {profile?.profiles?.full_name || "Athlete"}
                      </h1>
                      {profile?.sport_discipline && (
                        <p className="text-base text-muted-foreground">{profile.sport_discipline} Athlete</p>
                      )}
                      {(profile?.geographic_preferences?.length || profile?.home_mountain) && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {profile?.geographic_preferences?.[0] || profile?.home_mountain || "\u2014"}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {profile?.instagram_url && (
                          <a
                            href={profile.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline"
                          >
                            <Instagram className="h-4 w-4" />
                            Instagram
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
                      {profile?.availability && (
                        <Badge
                          variant="secondary"
                          className="mt-2 w-fit bg-green-500/15 text-green-700 dark:text-green-400 border-0"
                        >
                          {profile.availability}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right — completion card, only when profile is incomplete */}
                  {completeness < 100 && (
                    <Card
                      className="w-auto mx-3 mb-3 rounded-lg [@media(min-width:930px)]:mb-0 [@media(min-width:930px)]:mx-0 [@media(min-width:930px)]:w-64 [@media(min-width:930px)]:max-w-[calc(100%-2rem)] shrink-0"
                      style={{ backgroundColor: "#ffffff", opacity: 1 }}
                    >
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
                            <Button
                              variant="link"
                              size="sm"
                              className="p-0 h-auto"
                              onClick={() => onNavigate("profile")}
                            >
                              {getText("hero.complete_profile_cta", "Complete your profile")}{" "}
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                            <div className="basis-full [@media(min-width:930px)]:basis-auto">
                              <AIProfilePopulator
                                role="athlete"
                                userId={user.id}
                                onComplete={() => {
                                  queryClient.invalidateQueries({ queryKey: athleteDashboardKey(user.id) });
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
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("profile")}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  {getText("quick_actions.update_profile", "Update Profile")}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("connections")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {getText("quick_actions.view_connections", "View Connections")}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <EyeIcon className="mr-2 h-4 w-4" />
                      {getText("quick_actions.preview_profile", "Preview Profile")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Profile Preview - How Others See You</DialogTitle>
                    </DialogHeader>
                    {profile && (
                      <AthleteProfilePreview
                        profile={{ full_name: profile.profiles?.full_name }}
                        profileData={profile}
                        viewMode="public"
                      />
                    )}
                  </DialogContent>
                </Dialog>
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
                          <AvatarImage src={connection.employer_profiles.logo_url || ""} />
                          <AvatarFallback>
                            {connection.employer_profiles.company_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{connection.employer_profiles.company_name}</p>
                          {connection.employer_profiles.industry && (
                            <Badge
                              variant="grayout"
                              className="mt-2 text-xs max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                              title={connection.employer_profiles.industry}
                            >
                              {getShortIndustryBadgeLabel(connection.employer_profiles.industry)}
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

      </section>

      <Dialog
        open={partnerDialogOpen}
        onOpenChange={(open) => {
          setPartnerDialogOpen(open);
          if (!open) setSelectedPartner(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          {!selectedPartner ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="max-h-[85vh] overflow-y-auto overflow-x-hidden">
              <div className="mt-6 space-y-6">
                <div className="relative -mx-6 -mt-6">
                  {selectedPartner.background_image_url ? (
                    <div
                      className="h-28 rounded-t-lg overflow-hidden bg-cover bg-center"
                      style={{ backgroundImage: `url(${selectedPartner.background_image_url})` }}
                    />
                  ) : (
                    <div className="h-28 rounded-t-lg bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <Avatar className="absolute -bottom-8 left-8 h-16 w-16 border-4 border-background shadow-lg">
                    <AvatarImage src={selectedPartner.logo_url ?? undefined} className="object-contain p-1" />
                    <AvatarFallback>{selectedPartner.company_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="pt-10">
                  <h3 className="font-semibold text-lg">{selectedPartner.company_name}</h3>
                  {selectedPartner.industry ? <p className="text-sm text-muted-foreground">{selectedPartner.industry}</p> : null}
                </div>
                {[
                  { label: "About", value: selectedPartner.about },
                  { label: "Opportunities Offered", value: selectedPartner.opportunities_offered },
                  { label: "Company Size", value: selectedPartner.company_size },
                  { label: "Location", value: selectedPartner.hq_location },
                  {
                    label: "Contact Person",
                    value: selectedPartner.contact_person
                      ? `${selectedPartner.contact_person}${selectedPartner.contact_title ? ` (${selectedPartner.contact_title})` : ""}`
                      : null,
                  },
                  { label: "Website", value: selectedPartner.website },
                  { label: "LinkedIn", value: selectedPartner.linkedin_url },
                ].map((item) => (
                  <div key={item.label}>
                    <h4 className="font-medium mb-1">{item.label}</h4>
                    <p className="text-sm text-muted-foreground break-all">{item.value || "Not specified"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
