import { User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Briefcase, Search, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CompanyProfileForm from "@/components/employer/CompanyProfileForm";
import AthleteDirectory from "@/components/employer/AthleteDirectory";

interface EmployerDashboardProps {
  user: User;
}

const EmployerDashboard = ({ user }: EmployerDashboardProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user.id]);

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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
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
          {!showDirectory ? (
            <>
              <Card className="shadow-elegant">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                      <Briefcase className="h-8 w-8 text-accent" />
                    </div>
                    <div>
                      <CardTitle>Welcome, {profile?.company_name || user.email}</CardTitle>
                      <CardDescription>
                        {profile ? "Discover talented athletes for your opportunities" : "Set up your company profile and start discovering talent"}
                      </CardDescription>
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
                      <Button onClick={handleBrowseAthletes}>
                        <Search className="h-4 w-4 mr-2" />
                        Browse Athletes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Active Searches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">0</p>
                    <p className="text-sm text-muted-foreground mt-1">Saved searches</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pending Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-accent">0</p>
                    <p className="text-sm text-muted-foreground mt-1">Awaiting review</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Connections Made</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">0</p>
                    <p className="text-sm text-muted-foreground mt-1">Total</p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Athlete Directory</h2>
                <Button variant="outline" onClick={() => setShowDirectory(false)}>
                  Back to Dashboard
                </Button>
              </div>
              <AthleteDirectory />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployerDashboard;
