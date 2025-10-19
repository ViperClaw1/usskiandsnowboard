import { User } from "@supabase/supabase-js";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Briefcase, Search, Building2, Users, UserCheck, UserX, Globe, Linkedin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { EmployerOnboardingWizard } from "@/components/employer/EmployerOnboardingWizard";
import CompanyProfileForm from "@/components/employer/CompanyProfileForm";
import AthleteDirectory from "@/components/employer/AthleteDirectory";
import ConnectionRequestsManager from "@/components/employer/ConnectionRequestsManager";
import ConnectionsList from "@/components/employer/ConnectionsList";
import { ProfileCompleteness } from "@/components/dashboard/ProfileCompleteness";

interface EmployerDashboardProps {
  user: User;
}

const EmployerDashboard = ({ user }: EmployerDashboardProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [showAcceptedConnections, setShowAcceptedConnections] = useState(false);
  const [showRejectedConnections, setShowRejectedConnections] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [featuredAthletes, setFeaturedAthletes] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
    loadFeaturedAthletes();
  }, [user.id]);

  useEffect(() => {
    if (profile?.id) {
      loadConnectionCounts();
    } else if (!loading && profile === null) {
      // Automatically open profile creation dialog if no profile exists
      setShowProfileDialog(true);
    }
  }, [profile, loading]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
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
        .eq("employer_id", profile.id)
        .eq("status", "pending");

      const { count: accepted } = await supabase
        .from("connection_requests")
        .select("*", { count: "exact", head: true })
        .eq("employer_id", profile.id)
        .eq("status", "accepted");

      const { count: rejected } = await supabase
        .from("connection_requests")
        .select("*", { count: "exact", head: true })
        .eq("employer_id", profile.id)
        .eq("status", "rejected");

      setPendingCount(pending || 0);
      setAcceptedCount(accepted || 0);
      setRejectedCount(rejected || 0);
    } catch (error) {
      console.error("Error loading counts:", error);
    }
  };

  const loadFeaturedAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(`
          id,
          photo_url,
          sport_discipline,
          profiles!inner(full_name)
        `)
        .eq("is_public", true)
        .limit(3);

      if (error) throw error;
      setFeaturedAthletes(data || []);
    } catch (error) {
      console.error("Error loading featured athletes:", error);
    }
  };

  const profileFields = useMemo(() => [
    { label: "Add company logo", completed: !!profile?.logo_url },
    { label: "Fill in company description", completed: !!profile?.description },
    { label: "Add website URL", completed: !!profile?.website },
    { label: "Add LinkedIn URL", completed: !!profile?.linkedin_url },
    { label: "Specify industry", completed: !!profile?.industry },
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

  const handleProfileSuccess = () => {
    setShowProfileDialog(false);
    loadProfile();
  };

  const handleBrowseAthletes = () => {
    if (!profile) {
      toast.error("Please complete your company profile first");
      setShowProfileDialog(true);
    } else {
      setShowDirectory(true);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b bg-card w-full">
        <div className="w-full px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <h1 
            className="text-base sm:text-xl lg:text-2xl font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors" 
            onClick={() => {
              setShowDirectory(false);
              setShowPendingRequests(false);
              setShowAcceptedConnections(false);
              setShowRejectedConnections(false);
            }}
          >
            Partner Dashboard
          </h1>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="shrink-0">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
        <div className="grid gap-4 sm:gap-6">
          {!showDirectory && !showPendingRequests && !showAcceptedConnections && !showRejectedConnections ? (
            <>
              {profile && profile.profile_completeness < 100 && (
                <ProfileCompleteness 
                  completeness={profile.profile_completeness} 
                  missingFields={profileFields}
                />
              )}
              
              <Card className="shadow-elegant overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden shrink-0">
                      {profile?.logo_url ? (
                        <img src={profile.logo_url} alt={profile.company_name} className="h-full w-full object-cover" />
                      ) : (
                        <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-accent" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg sm:text-xl lg:text-2xl truncate">Welcome, {profile?.company_name || user.email?.split('@')[0] || 'Company'}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        {profile ? "Discover talented athletes for your opportunities" : "Set up your company profile and start discovering talent"}
                      </CardDescription>
                      {profile && (profile.website || profile.linkedin_url) && (
                        <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                          {profile.website && (
                            <a 
                              href={profile.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Globe className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="truncate">Website</span>
                            </a>
                          )}
                          {profile.linkedin_url && (
                            <a 
                              href={profile.linkedin_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Linkedin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              <span className="truncate">LinkedIn</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {!profile && (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Complete your company profile to access the athlete directory
                      </p>
                    )}
                    <div className="flex gap-3 sm:gap-4">
                      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                        <DialogTrigger asChild>
                          <Button variant={profile ? "outline" : "default"} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            {profile ? "Edit Profile" : "Complete Profile"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                          <DialogHeader>
                            <DialogTitle>{profile ? "Edit Company Profile" : "Company Profile"}</DialogTitle>
                            <DialogDescription>
                              {profile ? "Update your company information and opportunities" : "Fill in your company details to access the athlete directory."}
                            </DialogDescription>
                          </DialogHeader>
                          {profile ? (
                            <CompanyProfileForm userId={user.id} existingProfile={profile} onSuccess={handleProfileSuccess} />
                          ) : (
                            <EmployerOnboardingWizard user={user} onComplete={handleProfileSuccess} />
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elegant overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl">Athlete Connections</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-6">
                    <Card className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden" onClick={() => setShowPendingRequests(true)}>
                      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-xs sm:text-sm lg:text-base leading-tight">Pending</CardTitle>
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-accent">{pendingCount}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Review</p>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden" onClick={() => setShowAcceptedConnections(true)}>
                      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-xs sm:text-sm lg:text-base leading-tight">Connected</CardTitle>
                          <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">{acceptedCount}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Accepted</p>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden col-span-2 lg:col-span-1" onClick={() => setShowRejectedConnections(true)}>
                      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-xs sm:text-sm lg:text-base leading-tight">Declined</CardTitle>
                          <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-muted-foreground">{rejectedCount}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Declined</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elegant overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl">Browse Athletes</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8">
                    <Button onClick={handleBrowseAthletes} size="sm" className="w-full sm:w-auto text-xs sm:text-sm shrink-0">
                      <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Browse Athletes
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 w-full sm:flex-1 items-center">
                      {featuredAthletes.length > 0 ? (
                        featuredAthletes.map((athlete) => (
                          <div key={athlete.id} className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 min-w-0 w-full sm:w-auto">
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 shrink-0">
                              <AvatarImage src={athlete.photo_url ?? undefined} />
                              <AvatarFallback>AT</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 sm:flex-initial">
                              <p className="font-medium text-xs sm:text-sm truncate">{athlete.profiles?.full_name || "Athlete"}</p>
                              <p className="text-xs text-muted-foreground truncate">{athlete.sport_discipline || "Sport not specified"}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex-1 text-center py-3 sm:py-4">
                          <p className="text-xs sm:text-sm text-muted-foreground">No featured athletes available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : showDirectory ? (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Athlete Directory</h2>
                <Button variant="outline" onClick={() => setShowDirectory(false)} className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </div>
              <AthleteDirectory />
            </div>
          ) : showPendingRequests ? (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Pending Connection Requests</h2>
                <Button variant="outline" onClick={() => { setShowPendingRequests(false); loadConnectionCounts(); }} className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionRequestsManager employerProfileId={profile.id} />}
            </div>
          ) : showAcceptedConnections ? (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Connections Made</h2>
                <Button variant="outline" onClick={() => setShowAcceptedConnections(false)} className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionsList employerProfileId={profile.id} status="accepted" />}
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Connections Declined</h2>
                <Button variant="outline" onClick={() => setShowRejectedConnections(false)} className="w-full sm:w-auto">
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionsList employerProfileId={profile.id} status="rejected" />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployerDashboard;
