import { useEffect, useMemo, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AIProfilePopulator } from "@/components/profile/AIProfilePopulator";
import { useDashboardTextOverrides } from "@/hooks/useDashboardLayout";
import { toast } from "sonner";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Eye,
  EyeIcon,
  ImagePlus,
  Loader2,
  Pencil,
  TrendingUp,
  UserCircle,
  Users,
  XCircle,
} from "lucide-react";

interface ExpertLandingPageProps {
  user: User;
  onNavigate: (view: string) => void;
  onProfileUpdated?: () => void;
}

interface ExpertProfile {
  id: string;
  full_name: string;
  photo_url: string | null;
  job_title: string | null;
  area_of_expertise: string | null;
  bio: string | null;
  industry: string | null;
  is_alum: boolean | null;
  profile_views: number | null;
  profile_completeness: number | null;
  background_image_url: string | null;
}

interface ConnectionStats {
  pending: number;
  accepted: number;
  rejected: number;
}

interface ExpertConnection {
  id: string;
  status: string;
  athlete_profiles: {
    id: string;
    photo_url: string | null;
    sport_discipline: string[] | null;
    profiles: {
      full_name: string | null;
    } | null;
  } | null;
}

interface FeaturedAthlete {
  id: string;
  photo_url: string | null;
  sport_discipline: string[] | null;
  skills: string[] | null;
  availability: string | null;
  profiles: {
    full_name: string | null;
  } | null;
}

interface FeaturedPartner {
  id: string;
  company_name: string;
  logo_url: string | null;
  industry: string | null;
}

interface AthletePreviewProfile {
  id: string;
  photo_url: string | null;
  background_image_url: string | null;
  bio: string | null;
  professional_highlights: string | null;
  availability: string | null;
  sport_discipline: string[] | null;
  skills: string[] | null;
  career_interests: string[] | null;
  geographic_preferences: string[] | null;
  profiles: {
    full_name: string | null;
  } | null;
}

interface PartnerPreviewProfile {
  id: string;
  company_name: string;
  logo_url: string | null;
  background_image_url: string | null;
  industry: string | null;
  company_size: string | null;
  hq_location: string | null;
  opportunities_offered: string | null;
  about: string | null;
  contact_person: string | null;
  contact_title: string | null;
  website: string | null;
  linkedin_url: string | null;
}

interface ExpertDashboardData {
  profile: ExpertProfile | null;
  connectionStats: ConnectionStats;
  connections: ExpertConnection[];
}

export const expertDashboardKey = (userId: string) => ["expert-landing-dashboard", userId];
const expertFeaturedAthletesKey = ["expert-landing-featured-athletes"];
const expertFeaturedPartnersKey = ["expert-landing-featured-partners"];

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

const getPrimaryIndustry = (industry: string | null) => {
  if (!industry) return null;
  const first = industry
    .split(/[,;|]/)
    .map((v) => v.trim())
    .find(Boolean);
  return first || null;
};

const getShortIndustryBadgeLabel = (industry: string | null) => {
  const primary = getPrimaryIndustry(industry);
  if (!primary) return null;
  return primary.length > 42 ? `${primary.slice(0, 39).trimEnd()}...` : primary;
};

const fetchExpertDashboard = async (userId: string): Promise<ExpertDashboardData> => {
  const { data: profileData } = await supabase.from("expert_profiles").select("*").eq("user_id", userId).maybeSingle();

  if (!profileData) {
    return {
      profile: null,
      connectionStats: { pending: 0, accepted: 0, rejected: 0 },
      connections: [],
    };
  }

  const { data: allRequests } = await supabase
    .from("expert_connection_requests")
    .select("status")
    .eq("expert_id", profileData.id);

  const { data: acceptedConnections } = await supabase
    .from("expert_connection_requests")
    .select("id, status, athlete_profiles(id, photo_url, sport_discipline, profiles(full_name))")
    .eq("expert_id", profileData.id)
    .eq("status", "accepted")
    .limit(4);

  return {
    profile: profileData as ExpertProfile,
    connectionStats: {
      pending: allRequests?.filter((r) => r.status === "pending").length ?? 0,
      accepted: allRequests?.filter((r) => r.status === "accepted").length ?? 0,
      rejected: allRequests?.filter((r) => r.status === "rejected").length ?? 0,
    },
    connections: (acceptedConnections as ExpertConnection[]) ?? [],
  };
};

const fetchFeaturedAthletes = async (): Promise<FeaturedAthlete[]> => {
  const { data } = await supabase
    .from("athlete_profiles")
    .select("id, photo_url, sport_discipline, skills, availability, profiles(full_name)")
    .eq("is_public", true)
    .order("profile_views", { ascending: false })
    .limit(4);

  return (data as FeaturedAthlete[]) ?? [];
};

const fetchFeaturedPartners = async (): Promise<FeaturedPartner[]> => {
  const { data } = await supabase
    .from("employer_profiles")
    .select("id, company_name, logo_url, industry")
    .order("profile_views", { ascending: false })
    .limit(4);

  return (data as FeaturedPartner[]) ?? [];
};

export const ExpertLandingPage = ({ user, onNavigate, onProfileUpdated }: ExpertLandingPageProps) => {
  const queryClient = useQueryClient();
  const { getText, typography } = useDashboardTextOverrides("expert");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [localBgUrl, setLocalBgUrl] = useState<string | null>(null);
  const [wrapDisciplineBadge, setWrapDisciplineBadge] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<AthletePreviewProfile | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<PartnerPreviewProfile | null>(null);
  const [athleteDialogOpen, setAthleteDialogOpen] = useState(false);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [loadingAthleteDetail, setLoadingAthleteDetail] = useState(false);
  const [loadingPartnerDetail, setLoadingPartnerDetail] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const badgesRowRef = useRef<HTMLDivElement>(null);
  const industryBadgeRef = useRef<HTMLDivElement>(null);
  const disciplineBadgeRef = useRef<HTMLDivElement>(null);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<ExpertDashboardData>({
    queryKey: expertDashboardKey(user.id),
    queryFn: () => fetchExpertDashboard(user.id),
    initialData: () => queryClient.getQueryData<ExpertDashboardData>(expertDashboardKey(user.id)),
    staleTime: 5 * 60 * 1000,
  });

  const { data: featuredAthletes = [], isLoading: athletesLoading } = useQuery<FeaturedAthlete[]>({
    queryKey: expertFeaturedAthletesKey,
    queryFn: fetchFeaturedAthletes,
    initialData: () => queryClient.getQueryData<FeaturedAthlete[]>(expertFeaturedAthletesKey),
    staleTime: 5 * 60 * 1000,
  });

  const { data: featuredPartners = [], isLoading: partnersLoading } = useQuery<FeaturedPartner[]>({
    queryKey: expertFeaturedPartnersKey,
    queryFn: fetchFeaturedPartners,
    initialData: () => queryClient.getQueryData<FeaturedPartner[]>(expertFeaturedPartnersKey),
    staleTime: 5 * 60 * 1000,
  });

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/bg-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("company-logos").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      setLocalBgUrl(publicUrl);
      await supabase.from("expert_profiles").update({ background_image_url: publicUrl }).eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: expertDashboardKey(user.id) });
      toast.success("Background photo updated");
      onProfileUpdated?.();
    } catch {
      toast.error("Failed to upload background photo");
    } finally {
      setUploadingBg(false);
    }
  };

  const openAthletePreview = async (athleteId: string) => {
    setAthleteDialogOpen(true);
    setLoadingAthleteDetail(true);
    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(
          "id, photo_url, background_image_url, bio, professional_highlights, availability, sport_discipline, skills, career_interests, geographic_preferences, profiles(full_name)",
        )
        .eq("id", athleteId)
        .single();

      if (error) throw error;
      setSelectedAthlete(data as unknown as AthletePreviewProfile);
    } catch (error) {
      console.error("Error loading athlete preview:", error);
      toast.error("Failed to load athlete profile");
      setAthleteDialogOpen(false);
    } finally {
      setLoadingAthleteDetail(false);
    }
  };

  const openPartnerPreview = async (partnerId: string) => {
    setPartnerDialogOpen(true);
    setLoadingPartnerDetail(true);
    try {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select(
          "id, company_name, logo_url, background_image_url, industry, company_size, hq_location, opportunities_offered, about, contact_person, contact_title, website, linkedin_url",
        )
        .eq("id", partnerId)
        .single();

      if (error) throw error;
      setSelectedPartner(data as unknown as PartnerPreviewProfile);
    } catch (error) {
      console.error("Error loading partner preview:", error);
      toast.error("Failed to load partner profile");
      setPartnerDialogOpen(false);
    } finally {
      setLoadingPartnerDetail(false);
    }
  };

  // All derived values and hooks must be above any early returns
  const profile = dashboardData?.profile ?? null;
  const connectionStats = dashboardData?.connectionStats ?? { pending: 0, accepted: 0, rejected: 0 };
  const connections = dashboardData?.connections ?? [];
  const completeness = profile?.profile_completeness ?? 0;
  const profileViews = profile?.profile_views ?? 0;
  const profileName = profile?.full_name || "Expert";
  const bgUrl = localBgUrl ?? profile?.background_image_url ?? null;
  const primaryIndustry = getPrimaryIndustry(profile?.industry ?? null);

  const disciplinePreview = useMemo(() => {
    if (!profile?.area_of_expertise) return null;
    return (
      profile.area_of_expertise
        .split(/[,;|]/)
        .map((value) => value.trim())
        .find(Boolean) || null
    );
  }, [profile?.area_of_expertise]);

  useEffect(() => {
    const evaluateDisciplineWrap = () => {
      const rowEl = badgesRowRef.current;
      const disciplineEl = disciplineBadgeRef.current;
      const industryEl = industryBadgeRef.current;

      if (!rowEl || !disciplineEl || !disciplinePreview) {
        setWrapDisciplineBadge(false);
        return;
      }

      // If the industry badge is present and both badges sit on the same line, no wrapping needed
      if (primaryIndustry && industryEl) {
        const onSeparateLine = disciplineEl.offsetTop > industryEl.offsetTop;
        if (!onSeparateLine) {
          setWrapDisciplineBadge(false);
          return;
        }
      }

      // Badge is alone or on its own line — check if its text overflows the row
      const disciplineStyle = window.getComputedStyle(disciplineEl);
      const font = [
        disciplineStyle.fontStyle,
        disciplineStyle.fontVariant,
        disciplineStyle.fontWeight,
        disciplineStyle.fontSize,
        disciplineStyle.lineHeight === "normal" ? "" : `/${disciplineStyle.lineHeight}`,
        disciplineStyle.fontFamily,
      ]
        .filter(Boolean)
        .join(" ");

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) {
        setWrapDisciplineBadge(false);
        return;
      }
      context.font = font;

      const horizontalExtras =
        parseFloat(disciplineStyle.paddingLeft || "0") +
        parseFloat(disciplineStyle.paddingRight || "0") +
        parseFloat(disciplineStyle.borderLeftWidth || "0") +
        parseFloat(disciplineStyle.borderRightWidth || "0");

      const textWidth = context.measureText(disciplinePreview).width;
      const availableWidth = rowEl.clientWidth;
      setWrapDisciplineBadge(textWidth + horizontalExtras > availableWidth);
    };

    evaluateDisciplineWrap();
    const resizeObserver = new ResizeObserver(evaluateDisciplineWrap);
    if (badgesRowRef.current) resizeObserver.observe(badgesRowRef.current);
    if (disciplineBadgeRef.current) resizeObserver.observe(disciplineBadgeRef.current);
    window.addEventListener("resize", evaluateDisciplineWrap);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", evaluateDisciplineWrap);
    };
  }, [disciplinePreview, primaryIndustry]);

  if (dashboardLoading || athletesLoading || partnersLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-b from-background to-muted/30"
      style={{ fontFamily: typography.fontFamily, fontSize: `${typography.fontSize}px` }}
    >
      <section className="px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-visible sm:overflow-hidden rounded-lg border shadow-elegant">
            <div className="relative overflow-visible">
              {/* Background image / gradient */}
              {bgUrl ? (
                <div
                  className="h-40 sm:h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-muted"
                  style={{
                    backgroundImage: `url(${bgUrl})`,
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
                      {uploadingBg ? "Uploading..." : getText("hero.add_background_photo", "Add background photo")}
                    </span>
                  </button>
                </div>
              )}
              {bgUrl && (
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
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />

              <Button
                variant="secondary"
                size="icon"
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 hover:bg-background shadow-md"
                onClick={() => onNavigate("profile")}
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4 text-foreground" />
              </Button>

              <div className="-mt-16 [@media(min-width:930px)]:mt-0 [@media(min-width:930px)]:absolute [@media(min-width:930px)]:bottom-0 [@media(min-width:930px)]:left-0 [@media(min-width:930px)]:right-0 [@media(min-width:930px)]:translate-y-1/2 z-10">
                <div className="flex flex-col [@media(min-width:930px)]:flex-row [@media(min-width:930px)]:items-end [@media(min-width:930px)]:justify-between [@media(min-width:930px)]:px-6 gap-4">
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-card w-full rounded-lg border-0 sm:w-fit shadow-sm">
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-lg shrink-0 -mt-12 sm:mt-0">
                      <AvatarImage src={profile?.photo_url || ""} />
                      <AvatarFallback className="text-xl sm:text-2xl">
                        {getInitials(profileName) || "EX"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h1 className="text-2xl sm:text-3xl font-bold text-foreground drop-shadow-sm">{profileName}</h1>
                      {profile?.job_title && <p className="text-base text-muted-foreground">{profile.job_title}</p>}
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-muted-foreground"
                        onClick={() => onNavigate("profile")}
                      >
                        {getText("hero.edit_profile", "Edit profile")}
                      </Button>
                      <div ref={badgesRowRef} className="flex flex-wrap gap-2 mt-1">
                        {primaryIndustry && (
                          <Badge
                            ref={industryBadgeRef}
                            variant="secondary"
                            className="w-fit max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                          >
                            {primaryIndustry}
                          </Badge>
                        )}
                        {disciplinePreview && (
                          <Badge
                            ref={disciplineBadgeRef}
                            variant="outline"
                            className={
                              wrapDisciplineBadge
                                ? "text-xs max-w-full whitespace-normal text-left leading-snug break-words [overflow-wrap:anywhere] h-auto min-h-0 items-start py-1.5"
                                : "text-xs whitespace-nowrap"
                            }
                          >
                            {disciplinePreview}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {completeness < 100 && (
                    <Card className="w-auto mx-3 mb-3 rounded-lg bg-card [@media(min-width:930px)]:mb-0 [@media(min-width:930px)]:mx-0 [@media(min-width:930px)]:w-64 [@media(min-width:930px)]:max-w-[calc(100%-2rem)] shrink-0">
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
                                role="expert"
                                userId={user.id}
                                onComplete={() => {
                                  queryClient.invalidateQueries({ queryKey: expertDashboardKey(user.id) });
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

            <div className="[@media(min-width:930px)]:pt-20 [@media(min-width:930px)]:pb-6" />
          </Card>
        </div>
      </section>

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
                      {getText("connection_activity.pending", "Pending")}
                    </span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      {getText("connection_activity.accepted", "Accepted")}
                    </span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.accepted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-muted-foreground">
                      {getText("connection_activity.declined", "Declined")}
                    </span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.rejected}</span>
                </div>
                <Button variant="outline" className="w-full mt-2" onClick={() => onNavigate("connections")}>
                  {getText("connection_activity.button", "Manage Connections")}
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
                  <span className="text-4xl font-bold">{profileViews}</span>
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
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("employers")}>
                  <Users className="mr-2 h-4 w-4" />
                  {getText("quick_actions.browse_partners", "Browse Partner Directory")}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("athletes")}>
                  <Users className="mr-2 h-4 w-4" />
                  {getText("quick_actions.browse_athletes", "Browse Athlete Directory")}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("profile")}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  {getText("quick_actions.update_profile", "Update Profile")}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("connections")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {getText("quick_actions.view_connections", "View Connections")}
                </Button>
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <EyeIcon className="mr-2 h-4 w-4" />
                      {getText("quick_actions.preview_profile", "Preview Profile")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Expert Profile Preview</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={profile?.photo_url || ""} />
                          <AvatarFallback>{getInitials(profileName) || "EX"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{profileName}</p>
                          <p className="text-sm text-muted-foreground">{profile?.job_title || "Expert"}</p>
                        </div>
                      </div>
                      {profile?.area_of_expertise && (
                        <p className="text-sm">
                          <span className="font-medium">Area of Expertise:</span> {profile.area_of_expertise}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">{profile?.bio || "No bio available yet."}</p>
                    </div>
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
                          <AvatarImage src={connection.athlete_profiles?.photo_url || ""} />
                          <AvatarFallback>
                            {getInitials(connection.athlete_profiles?.profiles?.full_name || "Athlete") || "AT"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">
                            {connection.athlete_profiles?.profiles?.full_name || "Athlete"}
                          </p>
                          {connection.athlete_profiles?.sport_discipline && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {connection.athlete_profiles.sport_discipline.join(", ")}
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

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{getText("featured_athletes.title", "Featured Athletes")}</CardTitle>
              <Button variant="link" onClick={() => onNavigate("athletes")}>
                {getText("featured_athletes.view_all", "View All")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featuredAthletes.map((athlete) => (
                <Card
                  key={athlete.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => void openAthletePreview(athlete.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={athlete.photo_url || ""} />
                        <AvatarFallback>{getInitials(athlete.profiles?.full_name || "Athlete") || "AT"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{athlete.profiles?.full_name || "Athlete"}</p>
                        {athlete.sport_discipline && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {athlete.sport_discipline.join(", ")}
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{getText("featured_partners.title", "Featured Partners")}</CardTitle>
              <Button variant="link" onClick={() => onNavigate("employers")}>
                {getText("featured_partners.view_all", "View All")} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featuredPartners.map((partner) => (
                <Card
                  key={partner.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => void openPartnerPreview(partner.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={partner.logo_url || ""} />
                        <AvatarFallback>{partner.company_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{partner.company_name}</p>
                        {getShortIndustryBadgeLabel(partner.industry) && (
                          <Badge
                            variant="secondary"
                            className="mt-2 text-xs max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                            title={partner.industry ?? undefined}
                          >
                            {getShortIndustryBadgeLabel(partner.industry)}
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

      <Dialog
        open={athleteDialogOpen}
        onOpenChange={(open) => {
          setAthleteDialogOpen(open);
          if (!open) setSelectedAthlete(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          {loadingAthleteDetail || !selectedAthlete ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="max-h-[85vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle>Athlete Profile</DialogTitle>
              </DialogHeader>
              <div className="mt-6 space-y-6">
                <div className="relative -mx-6 -mt-6">
                  {selectedAthlete.background_image_url ? (
                    <div
                      className="h-28 rounded-t-lg overflow-hidden bg-cover bg-center"
                      style={{ backgroundImage: `url(${selectedAthlete.background_image_url})` }}
                    />
                  ) : (
                    <div className="h-28 rounded-t-lg bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <Avatar className="absolute -bottom-8 left-8 h-16 w-16 border-4 border-background shadow-lg">
                    <AvatarImage src={selectedAthlete.photo_url ?? undefined} className="object-cover" />
                    <AvatarFallback>{getInitials(selectedAthlete.profiles?.full_name || "Athlete") || "AT"}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="pt-10">
                  <h3 className="font-semibold text-lg">{selectedAthlete.profiles?.full_name || "Athlete"}</h3>
                  {selectedAthlete.sport_discipline?.length ? (
                    <p className="text-sm text-muted-foreground">{selectedAthlete.sport_discipline.join(", ")}</p>
                  ) : null}
                </div>

                {[
                  { label: "Bio", value: selectedAthlete.bio },
                  { label: "Professional Highlights", value: selectedAthlete.professional_highlights },
                  { label: "Availability", value: selectedAthlete.availability },
                  {
                    label: "Geographic Preferences",
                    value: selectedAthlete.geographic_preferences?.length
                      ? selectedAthlete.geographic_preferences.join(", ")
                      : null,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <h4 className="font-medium mb-1">{item.label}</h4>
                    <p className="text-sm text-muted-foreground">{item.value || "Not specified"}</p>
                  </div>
                ))}

                <div>
                  <h4 className="font-medium mb-2">Skills</h4>
                  {selectedAthlete.skills?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAthlete.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={partnerDialogOpen}
        onOpenChange={(open) => {
          setPartnerDialogOpen(open);
          if (!open) setSelectedPartner(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          {loadingPartnerDetail || !selectedPartner ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="max-h-[85vh] overflow-y-auto overflow-x-hidden">
              <DialogHeader>
                <DialogTitle>Partner Profile</DialogTitle>
              </DialogHeader>
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
                    <AvatarFallback>{selectedPartner.company_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="pt-10">
                  <h3 className="font-semibold text-lg">{selectedPartner.company_name}</h3>
                  {selectedPartner.industry ? <p className="text-sm text-muted-foreground">{selectedPartner.industry}</p> : null}
                </div>

                {[
                  { label: "About", value: selectedPartner.about },
                  { label: "Company Size", value: selectedPartner.company_size },
                  { label: "HQ Location", value: selectedPartner.hq_location },
                  { label: "Opportunities Offered", value: selectedPartner.opportunities_offered },
                  {
                    label: "Contact",
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
