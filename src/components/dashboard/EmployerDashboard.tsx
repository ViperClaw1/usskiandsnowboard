import { User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EmployerOnboardingWizard } from "@/components/employer/EmployerOnboardingWizard";
import CompanyProfileForm from "@/components/employer/CompanyProfileForm";
import OpportunitiesForm from "@/components/employer/OpportunitiesForm";
import AthleteDirectory from "@/components/employer/AthleteDirectory";
import ConnectionRequestsManager from "@/components/employer/ConnectionRequestsManager";
import ConnectionsList from "@/components/employer/ConnectionsList";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";
import { PartnerLandingPage } from "@/components/dashboard/employer/PartnerLandingPage";
import { EmployerProfilePreview } from "@/components/profile/EmployerProfilePreview";

interface EmployerDashboardProps {
  user: User;
  isAdminView?: boolean;
}

const EmployerDashboard = ({ user, isAdminView = false }: EmployerDashboardProps) => {
  const [currentView, setCurrentView] = useState<string>("home");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showOpportunitiesDialog, setShowOpportunitiesDialog] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    try {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*")
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

  const handleOpportunitiesComplete = () => {
    setShowOpportunitiesDialog(false);
    loadProfile();
    toast.success("Opportunities updated successfully!");
  };

  const handleNavigate = (view: string) => {
    if (view === "profile") {
      setShowProfileDialog(true);
    } else if (view === "opportunities") {
      setShowOpportunitiesDialog(true);
    } else {
      setCurrentView(view);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AuthenticatedNav />

      <main>
        {currentView === "home" ? (
          <PartnerLandingPage user={user} onNavigate={handleNavigate} />
        ) : currentView === "directory" ? (
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Athlete Directory</h2>
              <Button variant="outline" onClick={() => setCurrentView("home")} className="w-full sm:w-auto">
                Back to Home
              </Button>
            </div>
            <AthleteDirectory />
          </div>
        ) : currentView === "preview" ? (
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Profile Preview</h2>
              <Button variant="outline" onClick={() => setCurrentView("home")} className="w-full sm:w-auto">
                Back to Home
              </Button>
            </div>
            {profile && <EmployerProfilePreview profile={profile} />}
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
                  <ConnectionRequestsManager employerProfileId={profile.id} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Accepted Connections</h3>
                  <ConnectionsList employerProfileId={profile.id} status="accepted" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Declined Connections</h3>
                  <ConnectionsList employerProfileId={profile.id} status="rejected" />
                </div>
              </div>
            )}
          </div>
        ) : null}
      </main>

      {!isAdminView && (
        <>
          <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{profile ? "Edit Your Company Profile" : "Complete Your Company Profile"}</DialogTitle>
                <DialogDescription>
                  {profile ? "Update your company information and opportunities" : "Share information about your company and the opportunities you offer"}
                </DialogDescription>
              </DialogHeader>
              {profile ? (
                <CompanyProfileForm userId={user.id} existingProfile={profile} onSuccess={handleProfileComplete} />
              ) : (
                <EmployerOnboardingWizard user={user} onComplete={handleProfileComplete} />
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={showOpportunitiesDialog} onOpenChange={setShowOpportunitiesDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>Manage Opportunities</DialogTitle>
                <DialogDescription>
                  Update the career opportunities your company offers to athletes
                </DialogDescription>
              </DialogHeader>
              <OpportunitiesForm userId={user.id} onSuccess={handleOpportunitiesComplete} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default EmployerDashboard;
