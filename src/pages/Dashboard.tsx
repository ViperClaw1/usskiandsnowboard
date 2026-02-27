// ==============================
// Imports
// ==============================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import RoleSelection from "@/components/dashboard/RoleSelection";
import AthleteDashboard from "@/components/dashboard/AthleteDashboard";
import EmployerDashboard from "@/components/dashboard/EmployerDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { AIProfilePopulator } from "@/components/profile/AIProfilePopulator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ClipboardEdit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
// Smart component — owns auth state, role resolution, and welcome flow.
// Delegates rendering to role-specific dashboard components.
// ==============================

const Dashboard = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState<"welcome" | "choose">("welcome");
  const [showAIPopulator, setShowAIPopulator] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingManualProfile, setPendingManualProfile] = useState(false);

  // ==============================
  // Effects — Auth State
  // Subscribes to auth changes and redirects unauthenticated visitors to "/"
  // ==============================
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user && event === "SIGNED_OUT") {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/");
      } else {
        loadUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // ==============================
  // Effects — Pending AI Profile Flag
  // Triggers the welcome popup if the user was invited and redirected here
  // ==============================
  useEffect(() => {
    if (role && role !== "admin" && user) {
      if (localStorage.getItem("pending_ai_profile") === "true") {
        localStorage.removeItem("pending_ai_profile");
        setShowWelcomePopup(true);
      }
    }
  }, [role, user]);

  // ==============================
  // Event Handlers — Role Loading
  // Fetches role with retry logic; prioritizes admin if multiple roles exist
  // ==============================
  const loadUserRole = async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("role", { ascending: false });

      if (error) throw error;

      let userRole = null;
      if (data && data.length > 0) {
        const adminRole = data.find((r) => r.role === "admin");
        userRole = adminRole ? adminRole.role : data[0].role;
      }
      setRole(userRole);
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => loadUserRole(userId, retryCount + 1), 1000 * (retryCount + 1));
      } else {
        console.error("Error loading role after retries:", error);
      }
    } finally {
      if (retryCount === 0) setLoading(false);
    }
  };

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
          />
        );
      case "admin":
        return <AdminDashboard user={user!} />;
      default:
        return <RoleSelection userId={user!.id} onRoleSet={(newRole) => setRole(newRole)} />;
    }
  };

  // ==============================
  // Render — Loading / Unauthenticated Guards
  // ==============================
  if (loading) return <LoadingSpinner fullScreen />;
  if (!user || !session) return null;
  if (!role) {
    return <RoleSelection userId={user.id} onRoleSet={(newRole) => setRole(newRole)} />;
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
                              <strong>{b.split(" ").slice(0, 1).join(" ")}</strong>{" "}
                              {b.split(" ").slice(1).join(" ")}
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
                <DialogDescription>
                  Choose AI to auto-fill from a URL, or complete it manually.
                </DialogDescription>
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
      {showAIPopulator && (role === "athlete" || role === "employer") && (
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
              role={role as "athlete" | "employer"}
              userId={user.id}
              onComplete={() => {
                setShowAIPopulator(false);
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
