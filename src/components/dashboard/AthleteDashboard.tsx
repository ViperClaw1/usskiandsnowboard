import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User as UserIcon, MapPin, Briefcase, Building2, Users, UserCheck, UserX, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfileForm from "@/components/athlete/ProfileForm";
import EmployerDirectory from "@/components/athlete/EmployerDirectory";
import ConnectionRequestsManager from "@/components/athlete/ConnectionRequestsManager";
import ConnectionsList from "@/components/athlete/ConnectionsList";
import PhotoUploader from "@/components/athlete/PhotoUploader";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    loadProfile();
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const handleProfileComplete = () => {
    setShowProfileDialog(false);
    loadProfile();
    toast.success("Profile updated successfully!");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Athlete Dashboard</h1>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {!showEmployerDirectory && !showPendingRequests && !showAcceptedConnections && !showRejectedConnections ? (
            <>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left Half - Welcome Section */}
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.photo_url} />
                      <AvatarFallback>
                        <UserIcon className="h-10 w-10 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-3xl font-bold">Welcome, {profile?.profiles?.full_name || user.email}</h2>
                      <p className="text-muted-foreground mt-1">
                        {profile ? "Your athlete profile" : "Complete your athlete profile to get started"}
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading profile...</p>
                  ) : profile ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Your profile is <span className="font-semibold text-foreground">{profile.profile_completeness}% complete</span>
                        </p>
                        <Badge variant={profile.is_public ? "default" : "secondary"}>
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
                          <p className="text-sm text-muted-foreground">{profile.bio}</p>
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
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Briefcase className="h-4 w-4" />
                          {profile.availability}
                        </div>
                      )}

                      {profile.geographic_preferences && profile.geographic_preferences.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {profile.geographic_preferences.join(", ")}
                        </div>
                      )}

                      <div className="flex gap-4 pt-4">
                        <Button onClick={() => setShowProfileDialog(true)} variant="outline">
                          Edit Profile
                        </Button>
                        <Button onClick={() => setShowEmployerDirectory(true)}>
                          <Building2 className="h-4 w-4 mr-2" />
                          Browse Partners
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Your profile is <span className="font-semibold text-foreground">0% complete</span>
                      </p>
                      <Button onClick={() => setShowProfileDialog(true)}>
                        Complete Your Profile
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right Half - Photo Uploader */}
                <div className="flex items-center justify-center">
                  <div className="w-full">
                    <PhotoUploader userId={user.id} />
                  </div>
                </div>
              </div>

              <div className="mt-8 mb-4">
                <h2 className="text-2xl font-bold text-foreground">Partner Connections</h2>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowPendingRequests(true)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Pending Requests</CardTitle>
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-accent">{pendingCount}</p>
                    <p className="text-sm text-muted-foreground mt-1">From partners</p>
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

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Profile Views</CardTitle>
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{profile?.profile_views || 0}</p>
                    <p className="text-sm text-muted-foreground mt-1">Total views</p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : showEmployerDirectory ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Employer Directory</h2>
                <Button variant="outline" onClick={() => setShowEmployerDirectory(false)}>
                  Back to Dashboard
                </Button>
              </div>
              <EmployerDirectory />
            </div>
          ) : showPendingRequests ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Pending Connection Requests</h2>
                <Button variant="outline" onClick={() => { setShowPendingRequests(false); loadConnectionCounts(); }}>
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionRequestsManager athleteProfileId={profile.id} />}
            </div>
          ) : showAcceptedConnections ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Connections Made</h2>
                <Button variant="outline" onClick={() => setShowAcceptedConnections(false)}>
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionsList athleteProfileId={profile.id} status="accepted" />}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Connections Declined</h2>
                <Button variant="outline" onClick={() => setShowRejectedConnections(false)}>
                  Back to Dashboard
                </Button>
              </div>
              {profile?.id && <ConnectionsList athleteProfileId={profile.id} status="rejected" />}
            </div>
          )}
        </div>
      </main>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Athlete Profile</DialogTitle>
            <DialogDescription>
              Share your athletic background, skills, and career interests
            </DialogDescription>
          </DialogHeader>
          <ProfileForm userId={user.id} onComplete={handleProfileComplete} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AthleteDashboard;
