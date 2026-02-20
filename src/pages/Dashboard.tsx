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
import { Sparkles } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [showAIPopulator, setShowAIPopulator] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

  // Check for pending AI profile flag after role is loaded
  useEffect(() => {
    if (role && role !== "admin" && user) {
      if (localStorage.getItem("pending_ai_profile") === "true") {
        localStorage.removeItem("pending_ai_profile");
        setShowWelcomePopup(true);
      }
    }
  }, [role, user]);

  const loadUserRole = async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 3;
    
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("role", { ascending: false });

      if (error) throw error;
      
      // Prioritize admin role if present, otherwise take the first role
      let userRole = null;
      if (data && data.length > 0) {
        const adminRole = data.find(r => r.role === 'admin');
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
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user || !session) {
    return null;
  }

  if (!role) {
    return <RoleSelection userId={user.id} onRoleSet={(newRole) => setRole(newRole)} />;
  }

  const renderDashboard = () => {
    switch (role) {
      case "athlete":
        return <AthleteDashboard key={refreshKey} user={user} onProfileUpdated={() => setRefreshKey(k => k + 1)} />;
      case "employer":
        return <EmployerDashboard key={refreshKey} user={user} onProfileUpdated={() => setRefreshKey(k => k + 1)} />;
      case "admin":
        return <AdminDashboard user={user} />;
      default:
        return <RoleSelection userId={user.id} onRoleSet={(newRole) => setRole(newRole)} />;
    }
  };

  return (
    <ErrorBoundary>
      {renderDashboard()}

      {/* Welcome popup for invited users */}
      <Dialog open={showWelcomePopup} onOpenChange={setShowWelcomePopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Welcome to U.S. Ski & Snowboard!
            </DialogTitle>
            <DialogDescription>
              Would you like to auto-complete your profile using AI? Just provide a URL and we'll fill in the details for you.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => {
                setShowWelcomePopup(false);
                setShowAIPopulator(true);
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Complete with AI
            </Button>
            <Button variant="ghost" onClick={() => setShowWelcomePopup(false)}>
              Skip for now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Render AIProfilePopulator when user chooses to proceed - auto-click trigger */}
      {showAIPopulator && (role === "athlete" || role === "employer") && (
        <div className="hidden">
          <div ref={(el) => {
            if (el) {
              const btn = el.querySelector("button");
              if (btn) setTimeout(() => btn.click(), 100);
            }
          }}>
            <AIProfilePopulator
              role={role as "athlete" | "employer"}
              userId={user.id}
              onComplete={() => { setShowAIPopulator(false); setRefreshKey(k => k + 1); }}
            />
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
};

export default Dashboard;
