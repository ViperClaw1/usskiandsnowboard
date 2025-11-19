import { User } from "@supabase/supabase-js";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Briefcase, Search, Building2, Users, UserCheck, UserX, Globe, Linkedin, Eye, Settings } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { EmployerProfilePreview } from "@/components/profile/EmployerProfilePreview";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { EmployerOnboardingWizard } from "@/components/employer/EmployerOnboardingWizard";
import CompanyProfileForm from "@/components/employer/CompanyProfileForm";
import OpportunitiesForm from "@/components/employer/OpportunitiesForm";
import AthleteDirectory from "@/components/employer/AthleteDirectory";
import ConnectionRequestsManager from "@/components/employer/ConnectionRequestsManager";
import ConnectionsList from "@/components/employer/ConnectionsList";
import { ProfileCompleteness } from "@/components/dashboard/ProfileCompleteness";

interface EmployerDashboardProps {
  user: User;
  isAdminView?: boolean;
}

const EmployerDashboard = ({ user, isAdminView = false }: EmployerDashboardProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showOpportunitiesDialog, setShowOpportunitiesDialog] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);
  const [showPendingRequests, setShowPendingRequests] = useState(false);
  const [showAcceptedConnections, setShowAcceptedConnections] = useState(false);
  const [showRejectedConnections, setShowRejectedConnections] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [featuredAthletes, setFeaturedAthletes] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadProfile();
    loadFeaturedAthletes();
  }, [user.id]);

  useEffect(() => {
    if (profile?.id) {
      loadConnectionCounts();
    } else if (!loading && profile === null && !isAdminView) {
      // Automatically open profile creation dialog if no profile exists (not in admin view)
      setShowProfileDialog(true);
    }
  }, [profile, loading, isAdminView]);

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
      await supabase.auth.signOut({ scope: 'local' });
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (e) {
      console.error("Sign out exception:", e);
      toast.error("Failed to sign out");
    }
  };

  const handleProfileSuccess = () => {
    setShowProfileDialog(false);
    loadProfile();
  };

  const handleOpportunitiesSuccess = () => {
    setShowOpportunitiesDialog(false);
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
              setShowPreview(false);
            }}
          >
            Partner Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="shrink-0">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="shrink-0">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
        <div className="mb-6 p-4 bg-card rounded-lg border border-border">
          <p className="text-sm text-muted-foreground text-center">
            Welcome back! Discover athletes who bring world-class excellence to your organization.
          </p>
        </div>
        
        <div className="grid gap-4 sm:gap-6">
          {showPreview ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Back to Dashboard
                </Button>
              </div>
              <EmployerProfilePreview profile={profile} />
            </>
          ) : !showDirectory && !showPendingRequests && !showAcceptedConnections && !showRejectedConnections ? (
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
                    <div className="flex flex-wrap gap-3 sm:gap-4">
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
                              {profile ? "Update your company information" : "Fill in your company details to access the athlete directory."}
                            </DialogDescription>
                          </DialogHeader>
                          {profile ? (
                            <CompanyProfileForm userId={user.id} existingProfile={profile} onSuccess={handleProfileSuccess} />
                          ) : (
                            <EmployerOnboardingWizard user={user} onComplete={handleProfileSuccess} />
                          )}
                        </DialogContent>
                      </Dialog>

                      <Dialog open={showOpportunitiesDialog} onOpenChange={setShowOpportunitiesDialog}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                          <DialogHeader>
                            <DialogTitle>Update Opportunities</DialogTitle>
                            <DialogDescription>
                              Add or update job postings and career page links
                            </DialogDescription>
                          </DialogHeader>
                          <OpportunitiesForm userId={user.id} existingProfile={profile} onSuccess={handleOpportunitiesSuccess} />
                        </DialogContent>
                      </Dialog>

                      {profile && (
                        <Button onClick={() => setShowPreview(true)} variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                          Preview Profile
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {profile && (
                <Card className="shadow-elegant overflow-hidden border-2 border-primary/20">
                  <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardTitle className="text-lg sm:text-xl lg:text-2xl flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Your Opportunities
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Share links to your job postings and career pages
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    {profile.job_board_url || (profile.individual_roles && profile.individual_roles.length > 0) ? (
                      <div className="space-y-4">
                        {profile.job_board_url && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Company Job Board</p>
                            <a 
                              href={profile.job_board_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline break-all"
                            >
                              {profile.job_board_url}
                            </a>
                          </div>
                        )}
                        
                        {profile.individual_roles && profile.individual_roles.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Featured Roles</p>
                            {profile.individual_roles.map((role: any, index: number) => (
                              <div key={index} className="p-3 border rounded-lg hover:border-primary/50 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div>
                                    <p className="text-sm font-medium">{role.title}</p>
                                    {role.location && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{role.location}</p>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground shrink-0">{role.type}</span>
                                </div>
                                <a 
                                  href={role.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline break-all"
                                >
                                  {role.url}
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowOpportunitiesDialog(true)}
                          className="text-xs w-full sm:w-auto"
                        >
                          Update Opportunities
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground mb-3">
                            Make it easy for athletes to explore your opportunities
                          </p>
                          <div className="text-left max-w-md mx-auto space-y-2 mb-4">
                            <p className="text-xs font-medium text-foreground">Add:</p>
                            <ul className="text-xs text-muted-foreground space-y-1.5 pl-4">
                              <li>• Your company careers page or job board</li>
                              <li>• Up to 3 specific job postings from LinkedIn, Indeed, etc.</li>
                              <li>• Each with a title, type, and direct link</li>
                            </ul>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <Button 
                            onClick={() => setShowOpportunitiesDialog(true)}
                            size="sm"
                            className="text-xs"
                          >
                            Add Job Links
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-elegant overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl">Athlete Connections</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden" onClick={() => setShowPendingRequests(true)}>
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-xs sm:text-sm lg:text-base leading-tight">Pending</CardTitle>
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0" />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-accent">{pendingCount}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Review</p>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden" onClick={() => setShowAcceptedConnections(true)}>
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

                    <Card className="cursor-pointer hover:border-primary/50 transition-colors overflow-hidden col-span-2 lg:col-span-1" onClick={() => setShowRejectedConnections(true)}>
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
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elegant overflow-hidden">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl lg:text-2xl">Browse Athletes</CardTitle>
                    {profile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">{profile.profile_views || 0} views</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 flex items-center min-h-[60px]">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 lg:gap-8 w-full">
                    <Button onClick={handleBrowseAthletes} size="sm" className="w-full sm:w-auto text-xs sm:text-sm shrink-0">
                      <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Browse Athletes
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 w-full sm:flex-1 items-start sm:items-center justify-start">
                      {featuredAthletes.length > 0 ? (
                        featuredAthletes.map((athlete) => (
                          <div key={athlete.id} className="flex items-center gap-2 w-full sm:w-auto">
                            <Avatar className="h-24 w-24 shrink-0">
                              <AvatarImage src={athlete.photo_url} />
                              <AvatarFallback className="text-xs">{athlete.profiles?.full_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 sm:flex-initial">
                              <p className="text-xs sm:text-sm font-medium truncate">{athlete.profiles?.full_name || 'Athlete'}</p>
                              <p className="text-xs text-muted-foreground truncate">{athlete.sport_discipline}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left w-full">
                          {profile ? "Discover talented athletes" : "Complete your profile to view athletes"}
                        </p>
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
