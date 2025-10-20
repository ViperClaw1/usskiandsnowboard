import { useState, useEffect, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User as UserIcon, MapPin, Briefcase, Building2, Users, UserCheck, UserX, Eye, EyeOff } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AthleteProfilePreview } from "@/components/profile/AthleteProfilePreview";
import { useNavigate } from "react-router-dom";
import { AthleteOnboardingWizard } from "@/components/athlete/AthleteOnboardingWizard";
import ProfileForm from "@/components/athlete/ProfileForm";
import EmployerDirectory from "@/components/athlete/EmployerDirectory";
import ConnectionRequestsManager from "@/components/athlete/ConnectionRequestsManager";
import ConnectionsList from "@/components/athlete/ConnectionsList";
import PhotoUploader from "@/components/athlete/PhotoUploader";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileCompleteness } from "@/components/dashboard/ProfileCompleteness";
import { DirectoryCardSkeleton } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";

interface AthleteDashboardProps {
  user: User;
}

const AthleteDashboard = ({ user }: AthleteDashboardProps) => {
  const navigate = useNavigate();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showEmployerDirectory, setShowEmployerDirectory] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [showAcceptedConnections, setShowAcceptedConnections] = useState(false);
  const [showRejectedConnections, setShowRejectedConnections] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [featuredEmployers, setFeaturedEmployers] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<"public" | "connected">("public");

  useEffect(() => {
    loadProfile();
    loadFeaturedEmployers();
  }, [user.id]);

  useEffect(() => {
    if (profile?.id) {
      loadConnectionCounts();
    }
  }, [profile]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(`
          *,
          profiles!inner(full_name)
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadConnectionCounts = async () => {
    if (!profile?.id) return;

    try {
      const { count: pending } = await supabase
        .from("connection_requests")
        .select("*", { count: "exact", head: true })
        .eq("athlete_id", profile.id)
        .eq("status", "pending");

      const { count: accepted } = await supabase
        .from("connection_requests")
        .select("*", { count: "exact", head: true })
        .eq("athlete_id", profile.id)
        .eq("status", "accepted");

      const { count: rejected } = await supabase
        .from("connection_requests")
        .select("*", { count: "exact", head: true })
        .eq("athlete_id", profile.id)
        .eq("status", "rejected");

      setPendingCount(pending || 0);
      setAcceptedCount(accepted || 0);
      setRejectedCount(rejected || 0);
    } catch (error) {
      console.error("Error loading counts:", error);
    }
  };

  const loadFeaturedEmployers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("id, company_name, logo_url, industry")
        .order("profile_views", { ascending: false })
        .limit(3);

      if (error) throw error;
      setFeaturedEmployers(data || []);
    } catch (error) {
      console.error("Error loading featured employers:", error);
    } finally {
      setLoading(false);
    }
  };

  const profileFields = useMemo(() => [
    { label: "Add profile photo", completed: !!profile?.photo_url },
    { label: "Fill in bio", completed: !!profile?.bio },
    { label: "Add skills", completed: !!(profile?.skills && profile.skills.length > 0) },
    { label: "Set availability", completed: !!profile?.availability },
    { label: "Add career interests", completed: !!(profile?.career_interests && profile.career_interests.length > 0) },
  ], [profile]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("Sign out warning:", error);
      }
    } catch (e) {
      console.warn("Sign out exception:", e);
    } finally {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  const handleProfileComplete = () => {
    setShowProfileDialog(false);
    loadProfile();
    toast.success("Profile updated successfully!");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b bg-card w-full">
        <div className="w-full px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <h1 
            className="text-base sm:text-xl lg:text-2xl font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors" 
            onClick={() => {
              setShowEmployerDirectory(false);
              setShowPendingRequests(false);
              setShowAcceptedConnections(false);
              setShowRejectedConnections(false);
              setShowPreview(false);
            }}
          >
            Athlete Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="shrink-0">
              <UserIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="shrink-0">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
        <div className="grid gap-4 sm:gap-6">
          {showPreview ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Back to Dashboard
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === "public" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("public")}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Public View
                  </Button>
                  <Button
                    variant={previewMode === "connected" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("connected")}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Connected View
                  </Button>
                </div>
              </div>
              <AthleteProfilePreview profile={profile?.profiles} profileData={profile} viewMode={previewMode} />
            </>
          ) : !showEmployerDirectory && !showPendingRequests && !showAcceptedConnections && !showRejectedConnections ? (
            <>
              {profile && profile.profile_completeness < 100 && (
                <ProfileCompleteness 
                  completeness={profile.profile_completeness} 
                  missingFields={profileFields}
                />
              )}
              
              <Card className="shadow-elegant overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                    {/* Left Half - Welcome Section */}
                    <div className="flex flex-col justify-center min-w-0 w-full mx-auto max-w-sm sm:max-w-md md:max-w-none">
                      <div className="flex items-start gap-2 sm:gap-3 lg:gap-4 mb-3 sm:mb-4 lg:mb-6">
                        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 lg:h-20 lg:w-20 shrink-0">
                          <AvatarImage src={profile?.photo_url} />
                          <AvatarFallback>
                            <UserIcon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-10 lg:w-10 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-base sm:text-lg lg:text-2xl font-bold leading-tight truncate">
                            Welcome, {profile?.profiles?.full_name || user.email?.split('@')[0] || 'Athlete'}
                          </h2>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                            {profile ? "Your athlete profile" : "Complete your athlete profile to get started"}
                          </p>
                        </div>
                      </div>

                      {loading ? (
                        <p className="text-sm text-muted-foreground">Loading profile...</p>
                      ) : profile ? (
                        <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Your profile is <span className="font-semibold text-foreground">{profile.profile_completeness}% complete</span>
                            </p>
                            <Badge variant={profile.is_public ? "default" : "secondary"} className="text-xs">
                              {profile.is_public ? "Public" : "Private"}
                            </Badge>
                          </div>
                          
                          {profile.sport_discipline && (
                            <div>
                              <p className="text-sm font-medium text-foreground mb-1">Sport</p>
                              <p className="text-sm text-muted-foreground">{profile.sport_discipline}</p>
                            </div>
                          )}

                          {profile.bio && (
                            <div>
                              <p className="text-sm font-medium text-foreground mb-1">Bio</p>
                              <p className="text-sm text-muted-foreground line-clamp-3 break-words">{profile.bio}</p>
                            </div>
                          )}

                          {profile.skills && profile.skills.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-foreground mb-2">Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {profile.skills.map((skill: string) => (
                                  <Badge key={skill} variant="outline">{skill}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {profile.availability && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Briefcase className="h-4 w-4 shrink-0 mt-0.5" />
                              <span className="break-words">{profile.availability}</span>
                            </div>
                          )}

                          {profile.geographic_preferences && profile.geographic_preferences.length > 0 && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                              <span className="break-words">{profile.geographic_preferences.join(", ")}</span>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
                            <Button onClick={() => setShowProfileDialog(true)} variant="outline" size="sm" className="w-full sm:w-auto h-8 text-xs">
                              Edit Profile
                            </Button>
                            <Button onClick={() => setShowPreview(true)} variant="outline" size="sm" className="w-full sm:w-auto h-8 text-xs">
                              <Eye className="h-3 w-3 mr-1" />
                              Preview Profile
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Your profile is <span className="font-semibold text-foreground">0% complete</span>
                          </p>
                          <Button onClick={() => setShowProfileDialog(true)} size="sm" className="w-full sm:w-auto h-8 text-xs">
                            Complete Your Profile
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Right Half - Photo Uploader */}
                    <div className="flex items-center justify-center">
                      <div className="w-full max-w-sm sm:max-w-md md:max-w-none mx-auto">
                        <PhotoUploader userId={user.id} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mb-2 sm:mb-3 lg:mb-4">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">Partner Connections</h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] overflow-hidden" onClick={() => setShowPendingRequests(true)}>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-xs sm:text-sm lg:text-base leading-tight">Pending</CardTitle>
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-accent">{pendingCount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Partners</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] overflow-hidden" onClick={() => setShowAcceptedConnections(true)}>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-xs sm:text-sm lg:text-base leading-tight">Connected</CardTitle>
                      <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">{acceptedCount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Accepted</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] overflow-hidden" onClick={() => setShowRejectedConnections(true)}>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-xs sm:text-sm lg:text-base leading-tight">Declined</CardTitle>
                      <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-muted-foreground">{rejectedCount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Declined</p>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-xs sm:text-sm lg:text-base leading-tight">Views</CardTitle>
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{profile?.profile_views || 0}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Total</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-elegant overflow-hidden">
                <CardHeader className="p-6">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl">Browse Partners</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-8">
                    <Button onClick={() => setShowEmployerDirectory(true)} size="sm" className="w-full sm:w-auto text-xs sm:text-sm shrink-0">
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Browse Partners
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 w-full sm:flex-1 items-center justify-center">
                      {loading ? (
                        <>
                          <DirectoryCardSkeleton />
                          <DirectoryCardSkeleton />
                        </>
                      ) : featuredEmployers.length > 0 ? (
                        featuredEmployers.map((employer) => (
                          <div key={employer.id} className="flex items-center justify-center gap-2 sm:gap-3 min-w-0 w-full sm:w-auto hover:scale-105 transition-transform duration-200 cursor-pointer" onClick={() => setShowEmployerDirectory(true)}>
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 shrink-0">
                              <AvatarImage src={employer.logo_url ?? undefined} />
                              <AvatarFallback>
                                <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 sm:flex-initial">
                              <p className="font-medium text-xs sm:text-sm truncate">{employer.company_name || "Partner"}</p>
                              <p className="text-xs text-muted-foreground truncate">{employer.industry || "Industry not specified"}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          icon={Building2}
                          title="No Featured Partners"
                          description="Browse the full directory to find partner organizations"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : showEmployerDirectory ? (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Employer Directory</h2>
                <Button variant="outline" onClick={() => setShowEmployerDirectory(false)} className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </div>
              <EmployerDirectory />
            </div>
          ) : showPendingRequests ? (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Pending Connection Requests</h2>
                <Button variant="outline" onClick={() => { setShowPendingRequests(false); loadConnectionCounts(); }} className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionRequestsManager athleteProfileId={profile.id} />}
            </div>
          ) : showAcceptedConnections ? (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Connections Made</h2>
                <Button variant="outline" onClick={() => setShowAcceptedConnections(false)} className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionsList athleteProfileId={profile.id} status="accepted" />}
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Connections Declined</h2>
                <Button variant="outline" onClick={() => setShowRejectedConnections(false)} className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionsList athleteProfileId={profile.id} status="rejected" />}
            </div>
          )}
        </div>
      </main>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{profile ? "Edit Your Profile" : "Complete Your Athlete Profile"}</DialogTitle>
            <DialogDescription>
              {profile ? "Update your athletic background and career interests" : "Share your athletic background, skills, and career interests"}
            </DialogDescription>
          </DialogHeader>
          {profile ? (
            <ProfileForm userId={user.id} onComplete={handleProfileComplete} />
          ) : (
            <AthleteOnboardingWizard user={user} onComplete={handleProfileComplete} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AthleteDashboard;
