import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import RoleSelection from "@/components/dashboard/RoleSelection";
import AthleteDashboard from "@/components/dashboard/AthleteDashboard";
import EmployerDashboard from "@/components/dashboard/EmployerDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

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
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserRole = async (userId: string) => {
    try {
      console.log("Loading role for user:", userId);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .order("role", { ascending: false }); // This will put 'employer' first, then 'athlete', then 'admin'

      console.log("Role query result:", { data, error });

      if (error) throw error;
      
      // Prioritize admin role if present, otherwise take the first role
      let userRole = null;
      if (data && data.length > 0) {
        const adminRole = data.find(r => r.role === 'admin');
        userRole = adminRole ? adminRole.role : data[0].role;
      }
      
      console.log("Setting role to:", userRole);
      setRole(userRole);
    } catch (error) {
      console.error("Error loading role:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !session) {
    return null;
  }

  if (!role) {
    return <RoleSelection userId={user.id} onRoleSet={(newRole) => setRole(newRole)} />;
  }

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

export default Dashboard;
