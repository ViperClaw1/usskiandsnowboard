import { User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Briefcase, Search, Building2, Users, UserCheck, UserX, Globe, Linkedin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import CompanyProfileForm from "@/components/employer/CompanyProfileForm";
import AthleteDirectory from "@/components/employer/AthleteDirectory";
import ConnectionRequestsManager from "@/components/employer/ConnectionRequestsManager";
import ConnectionsList from "@/components/employer/ConnectionsList";

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Employer Dashboard</h1>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {!showDirectory && !showPendingRequests && !showAcceptedConnections && !showRejectedConnections ? (
            <>
              <Card className="shadow-elegant">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden">
                      {profile?.logo_url ? (
                        <img src={profile.logo_url} alt={profile.company_name} className="h-full w-full object-cover" />
                      ) : (
                        <Briefcase className="h-8 w-8 text-accent" />
                      )}
                    </div>
                    <div>
                      <CardTitle>Welcome, {profile?.company_name || user.email}</CardTitle>
                      <CardDescription>
                        {profile ? "Discover talented athletes for your opportunities" : "Set up your company profile and start discovering talent"}
                      </CardDescription>
                      {profile && (profile.website || profile.linkedin_url) && (
                        <div className="flex items-center gap-3 mt-2">
                          {profile.website && (
                            <a 
                              href={profile.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Globe className="h-4 w-4" />
                              Website
                            </a>
                          )}
                          {profile.linkedin_url && (
                            <a 
                              href={profile.linkedin_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Linkedin className="h-4 w-4" />
                              LinkedIn
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {!profile && (
                      <p className="text-sm text-muted-foreground">
                        Complete your company profile to access the athlete directory
                      </p>
                    )}
                    <div className="flex gap-4">
                      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                        <DialogTrigger asChild>
                          <Button variant={profile ? "outline" : "default"}>
                            <Building2 className="h-4 w-4 mr-2" />
                            {profile ? "Edit Company Profile" : "Complete Company Profile"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Company Profile</DialogTitle>
                            <DialogDescription>Fill in your company details to access the athlete directory.</DialogDescription>
                          </DialogHeader>
                          <CompanyProfileForm
                            userId={user.id}
                            existingProfile={profile}
                            onSuccess={handleProfileSuccess}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-2xl">Browse Athletes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8">
                    <Button onClick={handleBrowseAthletes}>
                      <Search className="h-4 w-4 mr-2" />
                      Browse Athletes
                    </Button>
                    <div className="flex gap-8 flex-1">
                      {featuredAthletes.length > 0 ? (
                        featuredAthletes.map((athlete) => (
                          <div key={athlete.id} className="flex items-center gap-3">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={athlete.photo_url ?? undefined} />
                              <AvatarFallback>AT</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{athlete.profiles?.full_name || "Athlete"}</p>
                              <p className="text-xs text-muted-foreground">{athlete.sport_discipline || "Sport not specified"}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex-1 text-center py-4">
                          <p className="text-sm text-muted-foreground">No featured athletes available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-2xl">Athlete Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowPendingRequests(true)}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Pending Requests</CardTitle>
                          <Users className="h-5 w-5 text-accent" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-accent">{pendingCount}</p>
                        <p className="text-sm text-muted-foreground mt-1">Awaiting review</p>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowAcceptedConnections(true)}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Connections Made</CardTitle>
                          <UserCheck className="h-5 w-5 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-primary">{acceptedCount}</p>
                        <p className="text-sm text-muted-foreground mt-1">Accepted</p>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowRejectedConnections(true)}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Connections Declined</CardTitle>
                          <UserX className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-muted-foreground">{rejectedCount}</p>
                        <p className="text-sm text-muted-foreground mt-1">Declined</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : showDirectory ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Athlete Directory</h2>
                <Button variant="outline" onClick={() => setShowDirectory(false)}>
                  Back to Dashboard
                </Button>
              </div>
              <AthleteDirectory />
            </div>
          ) : showPendingRequests ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Pending Connection Requests</h2>
                <Button variant="outline" onClick={() => { setShowPendingRequests(false); loadConnectionCounts(); }}>
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionRequestsManager employerProfileId={profile.id} />}
            </div>
          ) : showAcceptedConnections ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Connections Made</h2>
                <Button variant="outline" onClick={() => setShowAcceptedConnections(false)}>
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionsList employerProfileId={profile.id} status="accepted" />}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Connections Declined</h2>
                <Button variant="outline" onClick={() => setShowRejectedConnections(false)}>
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
