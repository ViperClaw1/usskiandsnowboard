// ==============================
// Imports
// ==============================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RoleSelection from "@/components/dashboard/RoleSelection";
import AthleteDashboard from "@/components/dashboard/AthleteDashboard";
import EmployerDashboard from "@/components/dashboard/EmployerDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import ExpertDashboard from "@/components/dashboard/ExpertDashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AIProfilePopulator } from "@/components/profile/AIProfilePopulator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ClipboardEdit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/components/auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { dashboardRoleKey, useDashboardRole } from "@/hooks/useDashboardRole";

// ==============================
// Constants — Welcome Content
// Copy shown in the post-invite welcome popup, keyed by user role
// ==============================

const athleteWelcome = {
  header: "Welcome to Athlete Connection",
  body: `You've dedicated years to mastering your sport. Athlete Connection is here to support your next chapter.

This platform was built specifically for U.S. Ski & Snowboard athletes — to help you translate the discipline, leadership, resilience, and performance mindset you've developed into meaningful career opportunities beyond competition.`,
  bullets: [
    "Build a professional profile that highlights your unique strengths",
    "Connect with mentors across industries",
    "Discover internships, jobs, and short-term projects",
    "Request warm introductions from trusted supporters",
    "Access career tools and transition resources",
  ],
  outro: `Whether you're actively exploring your next step or just starting to think about it, this platform exists to make the transition smoother, faster, and more empowering.

Your first step is completing your profile. This helps mentors and partners understand your interests, goals, and background — and allows the system to match you with relevant opportunities.`,
};

const partnerWelcome = {
  header: "Welcome to Athlete Connection",
  body: `Thank you for supporting the next generation of U.S. Ski & Snowboard athletes.

Athlete Connection exists to bridge the gap between elite sport and long-term professional success. Our athletes bring exceptional discipline, accountability, resilience, and leadership — qualities that translate powerfully into business, entrepreneurship, and community leadership.`,
  bullets: [
    "Post internships, jobs, and short-term projects",
    "Offer mentorship or advisory time",
    "Provide introductions within your network",
    "Engage directly with high-character, high-performance individuals",
  ],
  outro: `This is not a public job board. It is a curated, trust-based network designed to create meaningful, long-term connections between athletes and supporters.

To get started, complete your profile so athletes can understand your background, industry expertise, and how you're willing to engage.`,
};

// ==============================
// Component Definition
// Auth state delegated to AuthContext — no local onAuthStateChange or getSession.
// Role fetching uses useQuery with retry so the role is cached across navigations
// and does not re-fetch on every Dashboard mount.
// Welcome popup and UI-only state remain as useState — they are not server data.
// ==============================

const Dashboard = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Auth comes from context — already resolved from local cache on repeat visits,
  // no redundant getSession() or onAuthStateChange subscription here.
  const { user, session, loading: authLoading } = useAuth();

  // ==============================
  // UI-only state
  // ==============================
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState<"welcome" | "choose">("welcome");
  const [showAIPopulator, setShowAIPopulator] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingManualProfile, setPendingManualProfile] = useState(false);

  // ==============================
  // Data Fetching — User Role
  // Cached by userId so navigating away and back does not re-fetch the role.
  // useQuery's built-in retry replaces the manual setTimeout retry loop.
  // initialData reads from the QueryClient cache synchronously on repeated
  // mounts — roleLoading is false from render zero on repeat visits.
  // Only enabled once we have a confirmed authenticated user.
  // ==============================
  const { role, roleLoading } = useDashboardRole(user?.id, !authLoading);

  // ==============================
  // Effects — Redirect Unauthenticated Users
  // Replaces the navigate("/") calls that were scattered across two async
  // callbacks inside the old getSession / onAuthStateChange handlers.
  // ==============================
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [authLoading, user, navigate]);

  // ==============================
  // Effects — Post-verification first-login profile prompt
  // For newly verified users, open the same profile completion popup once
  // across athlete, employer, and expert dashboards.
  // ==============================
  useEffect(() => {
    if (!role || !user || role === "admin") return;

    if (localStorage.getItem("pending_ai_profile") !== "true") return;
    // Always clear the flag once consumed so it doesn't leak across sessions/roles.
    localStorage.removeItem("pending_ai_profile");
    setPendingManualProfile(true);
  }, [role, user]);

  // ==============================
  // Derived Values — Dashboard Renderer
  // Selects the correct role-specific dashboard component
  // ==============================
  const renderDashboard = () => {
    switch (role) {
      case "athlete":
        return (
          <AthleteDashboard
            key={refreshKey}
            user={user!}
            onProfileUpdated={() => setRefreshKey((k) => k + 1)}
            openProfileDialog={pendingManualProfile}
            onProfileDialogOpened={() => setPendingManualProfile(false)}
            onRequestAI={() => setShowAIPopulator(true)}
          />
        );
      case "employer":
        return (
          <EmployerDashboard
            key={refreshKey}
            user={user!}
            onProfileUpdated={() => setRefreshKey((k) => k + 1)}
            openProfileDialog={pendingManualProfile}
            onProfileDialogOpened={() => setPendingManualProfile(false)}
            onRequestAI={() => setShowAIPopulator(true)}
          />
        );
      case "admin":
        return <AdminDashboard user={user!} />;
      case "expert":
        return (
          <ExpertDashboard
            key={refreshKey}
            user={user!}
            openProfileDialog={pendingManualProfile}
            onProfileDialogOpened={() => setPendingManualProfile(false)}
            onRequestAI={() => setShowAIPopulator(true)}
          />
        );
      default:
        return (
          <RoleSelection
            userId={user!.id}
            onRoleSet={() => queryClient.invalidateQueries({ queryKey: dashboardRoleKey(user!.id) })}
          />
        );
    }
  };

  // ==============================
  // Render — Loading / Unauthenticated Guards
  // authLoading is only true on first-ever app load (resolves from Supabase
  // local cache synchronously on repeat visits).
  // roleLoading is only true on first-ever Dashboard visit (initialData
  // populates from cache on all subsequent mounts).
  // ==============================
  if (authLoading || roleLoading) return <LoadingSpinner fullScreen />;
  if (!user || !session) return null;
  if (!role) {
    return (
      <RoleSelection
        userId={user.id}
        onRoleSet={() => queryClient.invalidateQueries({ queryKey: dashboardRoleKey(user.id) })}
      />
    );
  }

  // ==============================
  // Render — Dashboard + Welcome Dialogs
  // ==============================
  return (
    <ErrorBoundary>
      {renderDashboard()}

      {/* Welcome popup shown to invited/new users after first sign-in */}
      <Dialog
        open={showWelcomePopup}
        onOpenChange={(open) => {
          setShowWelcomePopup(open);
          if (!open) setWelcomeStep("welcome");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {welcomeStep === "welcome" ? (
            (() => {
              const content = role === "employer" ? partnerWelcome : athleteWelcome;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-xl">{content.header}</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[60vh] pr-3">
                    <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                      <p className="whitespace-pre-line">{content.body}</p>
                      <ul className="space-y-2 pl-1">
                        {content.bullets.map((b, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary font-bold mt-0.5">•</span>
                            <span>
                              <strong>{b.split(" ").slice(0, 1).join(" ")}</strong> {b.split(" ").slice(1).join(" ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="whitespace-pre-line">{content.outro}</p>
                    </div>
                  </ScrollArea>
                  <div className="pt-2">
                    <Button className="w-full" onClick={() => setWelcomeStep("choose")}>
                      Complete Your Profile
                    </Button>
                  </div>
                </>
              );
            })()
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  How would you like to complete your profile?
                </DialogTitle>
                <DialogDescription>Choose AI to auto-fill from a URL, or complete it manually.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={() => {
                    setShowWelcomePopup(false);
                    setWelcomeStep("welcome");
                    setShowAIPopulator(true);
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Complete with AI
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWelcomePopup(false);
                    setWelcomeStep("welcome");
                    setPendingManualProfile(true);
                  }}
                >
                  <ClipboardEdit className="mr-2 h-4 w-4" />
                  Complete Manually
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Profile Populator — hidden trigger element auto-clicked when activated */}
      {showAIPopulator && (role === "athlete" || role === "employer" || role === "expert") && (
        <div className="hidden">
          <div
            ref={(el) => {
              if (el) {
                const btn = el.querySelector("button");
                if (btn) setTimeout(() => btn.click(), 100);
              }
            }}
          >
            <AIProfilePopulator
              role={role as "athlete" | "employer" | "expert"}
              userId={user.id}
              onComplete={() => {
                setShowAIPopulator(false);
                queryClient.invalidateQueries({ queryKey: ["athlete-landing-dashboard", user.id] });
                queryClient.invalidateQueries({ queryKey: ["partner-landing-dashboard", user.id] });
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
};

export default Dashboard;
