import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import { User } from "@supabase/supabase-js";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";
import EmployerDirectory from "@/components/athlete/EmployerDirectory";

interface EmployerProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry: string | null;
  logo_url: string | null;
  about: string | null;
  connection_to_ussa: string | null;
  opportunities_offered: string | null;
  profile_views: number;
}

const Employers = () => {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // 👈 add this
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        loadUserRole(user.id);
      } else {
        loadEmployers(); // 👈 only load preview cards when we know user is logged out
      }
      setAuthLoading(false); // 👈 auth is resolved
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserRole = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const loadEmployers = async () => {
    try {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select(
          `
          id,
          user_id,
          company_name,
          industry,
          logo_url,
          about,
          connection_to_ussa,
          opportunities_offered,
          profile_views
        `,
        )
        .order("profile_views", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Loaded employers:", data);
      setEmployers(data || []);
    } catch (error) {
      console.error("Error loading employers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployerClick = () => {
    navigate("/auth?type=athlete");
  };

  // If user is authenticated, show the full directory
  if (user) {
    const isEmployer = userRole === "employer";
    const isAthlete = userRole === "athlete";
    return (
      <div className="min-h-screen bg-background">
        <AuthenticatedNav />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Partner Directory</h1>
            {isEmployer && (
              <p className="text-muted-foreground mt-2">
                View the profiles of your fellow U.S. Ski & Snowboard supporters
              </p>
            )}
            {isAthlete && (
              <p className="text-muted-foreground mt-2">View U.S. Ski & Snowboard partners seeking to hire athletes</p>
            )}
          </div>
          <EmployerDirectory />
        </main>
      </div>
    );
  }

  // If not authenticated, show featured profiles with sign-in prompt
  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedNav />

      <main>
        <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">Partner Organizations</h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Companies partnering with talented U.S. Ski & Snowboard athletes
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-12 relative">
          <div className="container mx-auto px-4 max-w-7xl">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <ProfileCardSkeleton />
                <ProfileCardSkeleton />
                <ProfileCardSkeleton />
              </div>
            ) : employers.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No Featured Partners Yet"
                description="Check back soon to see companies partnering with talented athletes."
                actionLabel="Sign In to Learn More"
                onAction={() => navigate("/auth")}
              />
            ) : (
              <>
                <div className={!user ? "blur-sm pointer-events-none" : ""}>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 justify-items-start">
                    {employers.map((employer) => (
                      <Card
                        key={employer.id}
                        className="w-full cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={handleEmployerClick}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            {employer.logo_url ? (
                              <div className="flex-shrink-0" style={{ width: "48px", height: "48px" }}>
                                <img
                                  src={employer.logo_url}
                                  alt={employer.company_name}
                                  className="w-full h-full object-contain rounded"
                                  style={{ width: "48px", height: "48px" }}
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Building2 className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg truncate">{employer.company_name}</CardTitle>
                              {employer.industry && (
                                <p className="text-sm text-muted-foreground truncate">{employer.industry}</p>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {employer.about && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{employer.about}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {!user && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/10 backdrop-blur-[1px]">
                    <Card className="max-w-md mx-4">
                      <CardContent className="pt-6 text-center space-y-4">
                        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Sign In to View Partners</h3>
                          <p className="text-sm text-muted-foreground">
                            Create an account or sign in to connect with partner organizations
                          </p>
                        </div>
                        <Button onClick={() => navigate("/auth")}>Sign In</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Employers;
