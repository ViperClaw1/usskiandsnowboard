import { useState, useEffect, useRef } from "react";
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
import { AthleteLandingPage } from "@/components/dashboard/athlete/AthleteLandingPage";
import { AthletePortfolio } from "@/components/athlete/AthletePortfolio";
import { Skeleton } from "@/components/ui/skeleton";

interface AthleteDashboardProps {
  user: User;
  isAdminView?: boolean;
  onProfileUpdated?: () => void;
  openProfileDialog?: boolean;
  onProfileDialogOpened?: () => void;
}

// ---------------------------------------------------------------------------
// Reusable fade-in wrapper
// Mounts children immediately but transitions opacity from 0 → 1. The `key`
// prop on this component should change whenever the view changes so that the
// animation re-fires on every navigation.
// ---------------------------------------------------------------------------
const FadeIn = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`animate-fade-in ${className}`}
    // Tailwind doesn't ship animate-fade-in by default; the keyframe is added
    // via a small inline style so this works without touching tailwind.config.
    style={{
      animation: "dashFadeIn 0.25s ease both",
    }}
  >
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Skeleton for the AthleteLandingPage ("home" view)
// ---------------------------------------------------------------------------
const HomeSkeleton = () => (
  <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl space-y-6">
    {/* Hero / welcome bar */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>

    {/* Stats cards row */}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
    </div>

    {/* Main content block */}
    <Skeleton className="h-48 rounded-xl" />

    {/* Secondary row */}
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

    {/* Profile hero */}
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-full shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>

    {/* Portfolio cards */}
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
// Directory skeleton (bonus — keeps the directory view consistent too)
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
// Main component
// ---------------------------------------------------------------------------
const AthleteDashboard = ({ user, isAdminView = false, onProfileUpdated, openProfileDialog, onProfileDialogOpened }: AthleteDashboardProps) => {
  const [currentView, setCurrentView] = useState<string>("home");
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  // `profileLoading` tracks the initial profile fetch (shows skeleton).
  const [profileLoading, setProfileLoading] = useState(true);
  // `viewKey` increments on every navigation so <FadeIn> re-animates.
  const [viewKey, setViewKey] = useState(0);

  // Open profile dialog when triggered from parent (e.g. "Complete Manually")
  useEffect(() => {
    if (openProfileDialog) {
      setShowProfileDialog(true);
      onProfileDialogOpened?.();
    }
  }, [openProfileDialog]);

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async (retryCount = 0) => {
    if (isAdminView) {
      setProfileLoading(false);
      return;
    }
    const MAX_RETRIES = 3;

    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(
          `
          *,
          profiles!inner(full_name)
        `,
        )
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
        setProfileLoading(false);
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
      setViewKey((k) => k + 1); // triggers re-animation
    }
  };

  // ------------------------------------------------------------------
  // Render helpers — each view gets its own skeleton + content pair so
  // we never show a blank screen or cause a layout snap.
  // ------------------------------------------------------------------
  const renderContent = () => {
    // While the initial profile fetch is in-flight, show the skeleton
    // that matches whichever view is active (usually "home").
    if (profileLoading) {
      return <HomeSkeleton />;
    }

    switch (currentView) {
      case "home":
        return (
          <FadeIn key={viewKey}>
            <AthleteLandingPage user={user} onNavigate={handleNavigate} onProfileUpdated={() => { loadProfile(); onProfileUpdated?.(); }} />
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
      {/*
        Inject the @keyframes rule once. This avoids needing a tailwind.config
        change while keeping the animation purely CSS-driven.
      */}
      <style>{`
        @keyframes dashFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <div className="min-h-screen bg-background overflow-x-hidden">
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
