import { User } from "@supabase/supabase-js";
import { useState, useEffect, useRef } from "react";
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
import { ConnectionActivityBoard } from "@/components/connections/ConnectionActivityBoard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartnerLandingPage, partnerDashboardKey } from "@/components/dashboard/employer/PartnerLandingPage";
import { EmployerProfilePreview } from "@/components/profile/EmployerProfilePreview";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, ClipboardList } from "lucide-react";

// ==============================
// Types
// ==============================

type EmployerProfileData = Awaited<ReturnType<typeof fetchEmployerProfile>>;

interface EmployerDashboardProps {
  user: User;
  isAdminView?: boolean;
  onProfileUpdated?: () => void;
  openProfileDialog?: boolean;
  onProfileDialogOpened?: () => void;
  onRequestAI?: () => void;
}

// ==============================
// Query Key
// Scoped by userId so different users never share a cache entry.
// ==============================
const employerProfileKey = (userId: string) => ["employer-dashboard-profile", userId];

// ==============================
// Query Function
// Extracted outside the component — stable reference, not recreated per render.
// Returns null when no profile exists yet (maybeSingle never throws on 0 rows).
// ==============================
const fetchEmployerProfile = async (userId: string) => {
  const { data, error } = await supabase.from("employer_profiles").select("*").eq("user_id", userId).maybeSingle();

  if (error) throw error;
  return data ?? null;
};

// ==============================
// Component Definition
// Profile fetching migrated from useState/useEffect to useQuery.
//
// Previously, loadProfile() fired on every mount (via useEffect([user.id])),
// reset loading:true each time, and used a hand-rolled setTimeout retry loop.
// Now the profile is cached by userId under employerProfileKey:
//
//  - On the first visit: fetches from Supabase, stores in cache.
//  - On repeat visits: initialData reads from cache synchronously —
//    loading is false from render zero, no spinner flash.
//  - Retry logic: delegated to useQuery's built-in retry/retryDelay,
//    replacing the manual setTimeout recursion.
//
// UI-only state (currentView, dialog visibility) stays as useState —
// these are not server data concerns.
// ==============================

const EmployerDashboard = ({
  user,
  isAdminView = false,
  onProfileUpdated,
  openProfileDialog,
  onProfileDialogOpened,
  onRequestAI,
}: EmployerDashboardProps) => {
  const queryClient = useQueryClient();

  // ==============================
  // UI-only state
  // ==============================
  const [currentView, setCurrentView] = useState<string>("home");
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [dialogStep, setDialogStep] = useState<"choice" | "wizard">("choice");
  const [showOpportunitiesDialog, setShowOpportunitiesDialog] = useState(false);

  // Background image upload
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = useState(false);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }
    setUploadingBg(true);
    try {
      const ext = file.name.split(".").pop();
      const ts = Date.now();
      const path = `${user.id}/bg-${ts}.${ext}`;
      const { error: upErr } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("company-logos").getPublicUrl(path);
      await supabase.from("employer_profiles").update({ background_image_url: publicUrl }).eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: employerProfileKey(user.id) });
      toast.success("Background image updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload background image");
    } finally {
      setUploadingBg(false);
    }
  };

  // ==============================
  // Data Fetching — Employer Profile
  // Skipped entirely in admin view (isAdminView flag) — mirrors the original
  // early-return inside loadProfile().
  // ==============================
  const { data: profile = null, isLoading: loading } = useQuery<EmployerProfileData>({
    queryKey: employerProfileKey(user.id),
    queryFn: () => fetchEmployerProfile(user.id),
    enabled: !isAdminView,
    // Serve cached profile synchronously on repeated mounts — no loading flash.
    initialData: () => queryClient.getQueryData<EmployerProfileData>(employerProfileKey(user.id)),
    staleTime: 5 * 60 * 1000,
    // Replaces the manual setTimeout retry loop.
    retry: 3,
    retryDelay: (attempt) => 1000 * (attempt + 1),
    // Surface fetch errors via toast, consistent with original behaviour.
    throwOnError: false,
    meta: {
      onError: () => toast.error("Failed to load profile. Please refresh the page."),
    },
  });

  // ==============================
  // Effects — Open Profile Dialog from Parent
  // Triggered when Dashboard passes openProfileDialog=true after "Complete
  // Manually" is chosen in the welcome popup. Not a data concern — stays as
  // useEffect.
  // ==============================
  // ==============================
  // Effects — Auto-open onboarding dialog on first login
  // ==============================
  useEffect(() => {
    if (!loading && profile === null && !isAdminView) {
      const key = `onboarding_shown_employer_${user.id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "true");
        setShowProfileDialog(true);
      }
    }
  }, [loading, profile, isAdminView, user.id]);

  useEffect(() => {
    if (openProfileDialog) {
      setShowProfileDialog(true);
      onProfileDialogOpened?.();
    }
  }, [openProfileDialog, onProfileDialogOpened]);

  // ==============================
  // Handlers
  // After a successful profile save, invalidate the cache so useQuery
  // re-fetches the latest data — replacing the direct loadProfile() calls.
  // ==============================
  const invalidateProfile = () => queryClient.invalidateQueries({ queryKey: employerProfileKey(user.id) });

  const handleProfileComplete = () => {
    setShowProfileDialog(false);
    invalidateProfile();
    queryClient.invalidateQueries({ queryKey: partnerDashboardKey(user.id) });
    onProfileUpdated?.();
    toast.success("Profile updated successfully!");
  };

  const handleOpportunitiesComplete = () => {
    setShowOpportunitiesDialog(false);
    invalidateProfile();
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

  // ==============================
  // Render
  // ==============================
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <main>
        {currentView === "home" ? (
          <PartnerLandingPage
            user={user}
            onNavigate={handleNavigate}
            onProfileUpdated={() => {
              invalidateProfile();
              onProfileUpdated?.();
            }}
          />
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
            {profile && (
              <EmployerProfilePreview
                profile={profile}
                bgInputRef={bgInputRef}
                onBgUpload={handleBgUpload}
                uploadingBg={uploadingBg}
              />
            )}
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
              <Tabs defaultValue="activity">
                <TabsList className="mb-6">
                  <TabsTrigger value="activity">Activity Board</TabsTrigger>
                  <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                  <TabsTrigger value="accepted">Accepted Connections</TabsTrigger>
                </TabsList>
                <TabsContent value="activity">
                  <ConnectionActivityBoard
                    profileId={profile.id}
                    profileType="employer"
                    userId={user.id}
                  />
                </TabsContent>
                <TabsContent value="pending">
                  <ConnectionRequestsManager employerProfileId={profile.id} />
                </TabsContent>
                <TabsContent value="accepted">
                  <ConnectionsList employerProfileId={profile.id} status="accepted" />
                </TabsContent>
              </Tabs>
            )}
          </div>
        ) : null}
      </main>

      {!isAdminView && (
        <>
          <Dialog
            open={showProfileDialog}
            onOpenChange={(open) => {
              setShowProfileDialog(open);
              if (!open) setDialogStep("choice");
            }}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              {profile ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Edit Your Company Profile</DialogTitle>
                    <DialogDescription>Update your company information and opportunities</DialogDescription>
                  </DialogHeader>
                  <CompanyProfileForm userId={user.id} existingProfile={profile} onSuccess={handleProfileComplete} />
                </>
              ) : dialogStep === "choice" ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Complete Your Profile
                    </DialogTitle>
                    <DialogDescription>Choose how you'd like to get started</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      onClick={() => {
                        setShowProfileDialog(false);
                        setDialogStep("choice");
                        onRequestAI?.();
                      }}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Complete with AI
                    </Button>
                    <Button variant="outline" onClick={() => setDialogStep("wizard")}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Complete Manually
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowProfileDialog(false);
                        setDialogStep("choice");
                      }}
                    >
                      Skip for now
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Complete Your Profile</DialogTitle>
                    <DialogDescription>Share information about your company and the opportunities you offer</DialogDescription>
                  </DialogHeader>
                  <EmployerOnboardingWizard user={user} onComplete={handleProfileComplete} />
                </>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={showOpportunitiesDialog} onOpenChange={setShowOpportunitiesDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>Manage Opportunities</DialogTitle>
                <DialogDescription>Update the career opportunities your company offers to athletes</DialogDescription>
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
