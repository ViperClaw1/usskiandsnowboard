import { useMemo, useRef, useState } from "react";
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

const fetchExpertDashboard = async (userId: string): Promise<ExpertDashboardData> => {
  const { data: profileData } = await supabase.from("expert_profiles").select("*").eq("user_id", userId).maybeSingle();

  if (!profileData) {
    return {
      profile: null,
      connectionStats: { pending: 0, accepted: 0, rejected: 0 },
      connections: [],
    };
  }

  const { data: allRequests } = await supabase.from("expert_connection_requests").select("status").eq("expert_id", profileData.id);

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [localBgUrl, setLocalBgUrl] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

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

  // All derived values and hooks must be above any early returns
  const profile = dashboardData?.profile ?? null;
  const connectionStats = dashboardData?.connectionStats ?? { pending: 0, accepted: 0, rejected: 0 };
  const connections = dashboardData?.connections ?? [];
  const completeness = profile?.profile_completeness ?? 0;
  const profileViews = profile?.profile_views ?? 0;
  const profileName = profile?.full_name || "Expert";
  const bgUrl = localBgUrl ?? profile?.background_image_url ?? null;

  const disciplinePreview = useMemo(() => {
    if (!profile?.area_of_expertise) return null;
    return profile.area_of_expertise.split(",")[0]?.trim() || null;
  }, [profile?.area_of_expertise]);

  if (dashboardLoading || athletesLoading || partnersLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-background to-muted/30">
      <section className="px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <div className="max-w-7xl mx-auto">
          <Card className="overflow-visible sm:overflow-hidden rounded-xl border shadow-elegant">
            <div className="relative overflow-visible">
              {/* Background image area */}
              <div
                className="h-40 sm:h-48 relative group cursor-pointer"
                onClick={() => !bgUrl && bgInputRef.current?.click()}
              >
                {bgUrl ? (
                  <>
                    <img src={bgUrl} alt="Background" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-background/80 hover:bg-background"
                        onClick={(e) => { e.stopPropagation(); bgInputRef.current?.click(); }}
                        disabled={uploadingBg}
                      >
                        {uploadingBg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                        Change photo
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
                    {uploadingBg ? (
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImagePlus className="h-8 w-8" />
                        <span className="text-sm font-medium">Add background photo</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />

              <Button
                variant="secondary"
                size="icon"
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 hover:bg-background shadow-md"
                onClick={() => onNavigate("profile")}
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4" />
              </Button>

              <div className="-mt-16 sm:mt-0 sm:absolute sm:bottom-0 sm:left-0 sm:right-0 sm:translate-y-1/2 z-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between sm:px-6 gap-4">
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-background w-full rounded-t-xl sm:rounded-t-none sm:rounded-t-xl sm:w-fit">
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-lg shrink-0 -mt-12 sm:mt-0">
                      <AvatarImage src={profile?.photo_url || ""} />
                      <AvatarFallback className="text-xl sm:text-2xl">{getInitials(profileName) || "EX"}</AvatarFallback>
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
                        Edit profile
                      </Button>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {profile?.industry && (
                          <Badge variant="secondary" className="w-fit">
                            {profile.industry}
                          </Badge>
                        )}
                        {disciplinePreview && (
                          <Badge variant="outline" className="w-fit">
                            {disciplinePreview}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {completeness < 100 && (
                    <Card className="w-72 max-w-[calc(100%-2rem)] mx-auto sm:mx-0 sm:w-64 shrink-0">
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Profile Complete</span>
                            <span className="font-semibold">{completeness}%</span>
                          </div>
                          <Progress value={completeness} className="h-2" />
                          <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => onNavigate("profile")}>
                            Complete your profile <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                          <AIProfilePopulator
                            role="expert"
                            userId={user.id}
                            onComplete={() => {
                              queryClient.invalidateQueries({ queryKey: expertDashboardKey(user.id) });
                              onProfileUpdated?.();
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:pt-20 sm:pb-6" />
          </Card>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
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
                    <Clock className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Requests</span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Connections</span>
                  </div>
                  <span className="text-2xl font-bold">{connectionStats.accepted}</span>
                </div>
                <Button variant="outline" className="w-full mt-2" onClick={() => onNavigate("connections")}>
                  View Activity Board
                </Button>
              </div>
            </CardContent>
          </Card>

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
                  <span className="text-4xl font-bold">{profileViews}</span>
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
                  <Button variant="outline" className="w-full mt-2" onClick={() => onNavigate("profile")}>
                    Improve Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("employers")}>
                  <Users className="mr-2 h-4 w-4" />
                  Browse Partner Directory
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("athletes")}>
                  <Users className="mr-2 h-4 w-4" />
                  Browse Athlete Directory
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("profile")}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Update Profile
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => onNavigate("connections")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  View Connections
                </Button>
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <EyeIcon className="mr-2 h-4 w-4" />
                      Preview Profile
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
                          <AvatarImage src={connection.athlete_profiles?.photo_url || ""} />
                          <AvatarFallback>
                            {getInitials(connection.athlete_profiles?.profiles?.full_name || "Athlete") || "AT"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{connection.athlete_profiles?.profiles?.full_name || "Athlete"}</p>
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
              <CardTitle>Featured Athletes</CardTitle>
              <Button variant="link" onClick={() => onNavigate("athletes")}>
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featuredAthletes.map((athlete) => (
                <Card
                  key={athlete.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onNavigate("athletes")}
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
              <CardTitle>Featured Partners</CardTitle>
              <Button variant="link" onClick={() => onNavigate("employers")}>
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
                  onClick={() => onNavigate("employers")}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={partner.logo_url || ""} />
                        <AvatarFallback>{partner.company_name.slice(0, 2).toUpperCase()}</AvatarFallback>
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
