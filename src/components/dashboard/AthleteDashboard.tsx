import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AthleteOnboardingWizard } from "@/components/athlete/AthleteOnboardingWizard";
import ProfileForm from "@/components/athlete/ProfileForm";
import EmployerDirectory from "@/components/athlete/EmployerDirectory";
import ConnectionRequestsManager from "@/components/athlete/ConnectionRequestsManager";
import ConnectionsList from "@/components/athlete/ConnectionsList";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";
import { AthleteLandingPage } from "@/components/dashboard/athlete/AthleteLandingPage";

interface AthleteDashboardProps {
  user: User;
  isAdminView?: boolean;
}

const AthleteDashboard = ({
  user,
  isAdminView = false
}: AthleteDashboardProps) => {
  const [currentView, setCurrentView] = useState<string>("home");
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    
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
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => loadProfile(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        toast.error("Failed to load profile. Please refresh the page.");
      }
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  };

  const handleProfileComplete = () => {
    setShowProfileDialog(false);
    loadProfile();
    toast.success("Profile updated successfully!");
  };

  const handleNavigate = (view: string) => {
    if (view === "profile") {
      setShowProfileDialog(true);
    } else {
      setCurrentView(view);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AuthenticatedNav />

      <main>
        {currentView === "home" ? (
          <AthleteLandingPage user={user} onNavigate={handleNavigate} />
        ) : currentView === "directory" ? (
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Partners Directory</h2>
              <Button variant="outline" onClick={() => setCurrentView("home")} className="w-full sm:w-auto">
                Back to Home
              </Button>
            </div>
            <EmployerDirectory />
          </div>
        ) : currentView === "connections" ? (
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">My Connections</h2>
              <Button variant="outline" onClick={() => setCurrentView("home")} className="w-full sm:w-auto">
                Back to Home
              </Button>
            </div>
            {profile?.id && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Pending Requests</h3>
                  <ConnectionRequestsManager athleteProfileId={profile.id} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Accepted Connections</h3>
                  <ConnectionsList athleteProfileId={profile.id} status="accepted" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Declined Connections</h3>
                  <ConnectionsList athleteProfileId={profile.id} status="rejected" />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>

      {!isAdminView && (
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
      )}
    </div>
  );
};

export default AthleteDashboard;
