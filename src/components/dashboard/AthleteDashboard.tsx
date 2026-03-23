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
import { ConnectionActivityBoard } from "@/components/connections/ConnectionActivityBoard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AthleteLandingPage, athleteDashboardKey } from "@/components/dashboard/athlete/AthleteLandingPage";
import { AthletePortfolio } from "@/components/athlete/AthletePortfolio";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// ==============================
// Global Keyframe Injection
// Injected once at module load time rather than on every component mount.
// Keeping it inside the component caused a <style> node to be added/removed
// on every mount, triggering a browser reflow and a scrollbar flash.
// ==============================
if (typeof document !== "undefined") {
  const KEYFRAME_ID = "dash-fade-in-keyframes";
  if (!document.getElementById(KEYFRAME_ID)) {
    const style = document.createElement("style");
    style.id = KEYFRAME_ID;
    style.textContent = `
      @keyframes dashFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0);   }
      }
    `;
    document.head.appendChild(style);
  }
}

// ==============================
// Types
// ==============================

interface AthleteDashboardProps {
  user: User;
  isAdminView?: boolean;
  onProfileUpdated?: () => void;
  openProfileDialog?: boolean;
  onProfileDialogOpened?: () => void;
  onRequestAI?: () => void;
}

// ==============================
// Query Key
// ==============================
const athleteProfileKey = (userId: string) => ["athlete-dashboard-profile", userId];

// ==============================
// Query Function
// Extracted outside the component — stable reference, not recreated per render.
// Returns null when no profile exists yet (maybeSingle never throws on 0 rows).
// ==============================
const fetchAthleteProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("athlete_profiles")
    .select(`*, profiles!inner(full_name)`)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
};

// ==============================
// Types — Profile
// ==============================
type AthleteProfileData = Awaited<ReturnType<typeof fetchAthleteProfile>>;

// ---------------------------------------------------------------------------
// Reusable fade-in wrapper
// ---------------------------------------------------------------------------
const FadeIn = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`animate-fade-in ${className}`} style={{ animation: "dashFadeIn 0.25s ease both" }}>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Skeleton for the AthleteLandingPage ("home" view)
// ---------------------------------------------------------------------------
const HomeSkeleton = () => (
  <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl space-y-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
    </div>
    <Skeleton className="h-48 rounded-xl" />
    <div className="grid gap-4 sm:grid-cols-2">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Skeleton for the "portfolio" view
// ---------------------------------------------------------------------------
const PortfolioSkeleton = () => (
  <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl space-y-6">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-full shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Skeleton for the "connections" view
// ---------------------------------------------------------------------------
const ConnectionsSkeleton = () => (
  <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl space-y-8">
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
    {["Pending Requests", "Accepted Connections", "Declined Connections"].map((section) => (
      <div key={section} className="space-y-3">
        <Skeleton className="h-6 w-44" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Directory skeleton
// ---------------------------------------------------------------------------
const DirectorySkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// Profile fetching migrated from useState/useEffect to useQuery.
//
// Previously, loadProfile() fired on every mount (via useEffect([user.id])),
// reset profileLoading:true each time, and used a hand-rolled setTimeout
// retry loop. Now the profile is cached by userId under athleteProfileKey:
//
//  - On the first visit: fetches from Supabase, stores in cache.
//  - On repeat visits: initialData reads from cache synchronously —
//    profileLoading is false from render zero, no skeleton flash.
//  - Retry logic: delegated to useQuery's built-in retry/retryDelay,
//    replacing the manual setTimeout recursion.
//
// UI-only state (currentView, viewKey, dialog visibility) stays as useState.
// ---------------------------------------------------------------------------

const AthleteDashboard = ({
  user,
  isAdminView = false,
  onProfileUpdated,
  openProfileDialog,
  onProfileDialogOpened,
}: AthleteDashboardProps) => {
  const queryClient = useQueryClient();

  // ==============================
  // UI-only state
  // ==============================
  const [currentView, setCurrentView] = useState<string>("home");
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [viewKey, setViewKey] = useState(0);

  // ==============================
  // Data Fetching — Athlete Profile
  // Skipped entirely in admin view — mirrors the original early-return
  // inside loadProfile().
  // ==============================
  const { data: profile = null, isLoading: profileLoading } = useQuery<AthleteProfileData>({
    queryKey: athleteProfileKey(user.id),
    queryFn: () => fetchAthleteProfile(user.id),
    enabled: !isAdminView,
    // Serve cached profile synchronously on repeated mounts — no skeleton flash.
    initialData: () => queryClient.getQueryData<AthleteProfileData>(athleteProfileKey(user.id)),
    staleTime: 5 * 60 * 1000,
    // Replaces the manual setTimeout retry loop.
    retry: 3,
    retryDelay: (attempt) => 1000 * (attempt + 1),
    meta: {
      onError: () => toast.error("Failed to load profile. Please refresh the page."),
    },
  });

  // ==============================
  // Effects — Auto-open onboarding dialog on first login
  // When the profile fetch resolves and no profile exists yet, open the
  // dialog once (guarded by a localStorage flag so it never re-fires).
  // ==============================
  useEffect(() => {
    if (!profileLoading && profile === null && !isAdminView) {
      const key = `onboarding_shown_${user.id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "true");
        setShowProfileDialog(true);
      }
    }
  }, [profileLoading, profile, isAdminView, user.id]);

  // ==============================
  // Effects — Open Profile Dialog from Parent
  // ==============================
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
  const invalidateProfile = () => queryClient.invalidateQueries({ queryKey: athleteProfileKey(user.id) });

  const handleProfileComplete = () => {
    setShowProfileDialog(false);
    invalidateProfile();
    queryClient.invalidateQueries({ queryKey: athleteDashboardKey(user.id) });
    toast.success("Profile updated successfully!");
  };

  const handleNavigate = (view: string) => {
    if (view === "profile") {
      setShowProfileDialog(true);
    } else {
      setCurrentView(view);
      setViewKey((k) => k + 1);
    }
  };

  // ==============================
  // Render Helpers
  // ==============================
  const renderContent = () => {
    if (profileLoading) {
      return <HomeSkeleton />;
    }

    switch (currentView) {
      case "home":
        return (
          <FadeIn key={viewKey}>
            <AthleteLandingPage
              user={user}
              onNavigate={handleNavigate}
              onProfileUpdated={() => {
                invalidateProfile();
                onProfileUpdated?.();
              }}
            />
          </FadeIn>
        );

      case "directory":
        return (
          <FadeIn key={viewKey}>
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">Partners Directory</h2>
                <Button variant="outline" onClick={() => handleNavigate("home")} className="w-full sm:w-auto">
                  Back to Home
                </Button>
              </div>
              <EmployerDirectory />
            </div>
          </FadeIn>
        );

      case "portfolio":
        return (
          <FadeIn key={viewKey}>
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <Button variant="outline" onClick={() => handleNavigate("home")} className="w-full sm:w-auto">
                  Back to Home
                </Button>
              </div>
              {profile?.id ? <AthletePortfolio athleteId={profile.id} /> : <PortfolioSkeleton />}
            </div>
          </FadeIn>
        );

      case "connections":
        return (
          <FadeIn key={viewKey}>
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">My Connections</h2>
                <Button variant="outline" onClick={() => handleNavigate("home")} className="w-full sm:w-auto">
                  Back to Home
                </Button>
              </div>
              {profile?.id ? (
                <Tabs defaultValue="activity">
                  <TabsList className="mb-6">
                    <TabsTrigger value="activity">Activity Board</TabsTrigger>
                    <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                    <TabsTrigger value="accepted">Accepted Connections</TabsTrigger>
                  </TabsList>
                  <TabsContent value="activity">
                    <ConnectionActivityBoard
                      profileId={profile.id}
                      profileType="athlete"
                      userId={user.id}
                    />
                  </TabsContent>
                  <TabsContent value="pending">
                    <ConnectionRequestsManager athleteProfileId={profile.id} />
                  </TabsContent>
                  <TabsContent value="accepted">
                    <ConnectionsList athleteProfileId={profile.id} status="accepted" />
                  </TabsContent>
                </Tabs>
              ) : (
                <ConnectionsSkeleton />
              )}
            </div>
          </FadeIn>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <main>{renderContent()}</main>

        {!isAdminView && (
          <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{profile ? "Edit Your Profile" : "Complete Your Athlete Profile"}</DialogTitle>
                <DialogDescription>
                  {profile
                    ? "Update your athletic background and career interests"
                    : "Share your athletic background, skills, and career interests"}
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
    </>
  );
};

export default AthleteDashboard;
