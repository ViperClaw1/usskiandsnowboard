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

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        return <AthleteDashboard user={user} />;
      case "employer":
        return <EmployerDashboard user={user} />;
      case "admin":
        return <AdminDashboard user={user} />;
      default:
        return <RoleSelection userId={user.id} onRoleSet={(newRole) => setRole(newRole)} />;
    }
  };

  return (
    <ErrorBoundary>
      {renderDashboard()}
    </ErrorBoundary>
  );
};

export default Dashboard;
