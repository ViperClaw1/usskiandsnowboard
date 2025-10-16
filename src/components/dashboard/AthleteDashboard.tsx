import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User as UserIcon, MapPin, Briefcase, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfileForm from "@/components/athlete/ProfileForm";
import EmployerDirectory from "@/components/athlete/EmployerDirectory";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface AthleteDashboardProps {
  user: User;
}

const AthleteDashboard = ({ user }: AthleteDashboardProps) => {
  const navigate = useNavigate();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showEmployerDirectory, setShowEmployerDirectory] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select("*")
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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
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
          {!showEmployerDirectory ? (
            <>
              <Card className="shadow-elegant">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile?.photo_url} />
                      <AvatarFallback>
                        <UserIcon className="h-8 w-8 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle>Welcome, {user.email}</CardTitle>
                      <CardDescription>
                        {profile ? "Your athlete profile" : "Complete your athlete profile to get started"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
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

                      <div className="flex gap-4">
                        <Button onClick={() => setShowProfileDialog(true)} variant="outline">
                          Edit Profile
                        </Button>
                        <Button onClick={() => setShowEmployerDirectory(true)}>
                          <Building2 className="h-4 w-4 mr-2" />
                          Browse Employers
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
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profile Views</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">0</p>
                    <p className="text-sm text-muted-foreground mt-1">This month</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Connection Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-accent">0</p>
                    <p className="text-sm text-muted-foreground mt-1">Sent</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted-foreground mt-1">Available</p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Employer Directory</h2>
                <Button variant="outline" onClick={() => setShowEmployerDirectory(false)}>
                  Back to Dashboard
                </Button>
              </div>
              <EmployerDirectory />
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
