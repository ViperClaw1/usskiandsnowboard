import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import { User } from "@supabase/supabase-js";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";

interface EmployerProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry: string | null;
  logo_url: string | null;
  about: string | null;
  opportunities_offered: string | null;
  profile_views: number;
}


const Employers = () => {
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<EmployerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check authentication
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    loadEmployers();

    return () => subscription.unsubscribe();
  }, []);

  const loadEmployers = async () => {
    try {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select(`
          id,
          user_id,
          company_name,
          industry,
          logo_url,
          about,
          opportunities_offered,
          profile_views
        `)
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

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedNav />

      <main>
        <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Partner Organizations
            </h1>
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
                        className="shadow-elegant hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer hover:border-primary/50 animate-fade-in"
                        onClick={handleEmployerClick}
                      >
                        <CardHeader>
                          <div className="flex items-center gap-3 mb-2">
                            {employer.logo_url ? (
                              <img 
                                src={employer.logo_url} 
                                alt={`${employer.company_name} logo`}
                                className="h-24 w-24 object-contain rounded"
                              />
                            ) : (
                              <Building2 className="h-8 w-8 text-primary" />
                            )}
                            <div>
                              <CardTitle className="text-lg">{employer.company_name}</CardTitle>
                              {employer.industry && (
                                <Badge variant="secondary" className="mt-1">
                                  {employer.industry}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {employer.about && (
                            <p className="text-sm text-muted-foreground line-clamp-3">{employer.about}</p>
                          )}
                          {employer.opportunities_offered && (
                            <div>
                              <p className="text-sm font-medium mb-1">Opportunities</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {employer.opportunities_offered}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                
                {!user && (
                  <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[2px]"
                    onClick={() => navigate("/")}
                  >
                    <Card 
                      className="max-w-md mx-4 shadow-2xl border-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Sign In to View Partners</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">
                          Discover opportunities with our partner organizations. Sign in as an Athlete to explore career connections.
                        </p>
                        <div className="flex flex-col gap-3">
                          <Button size="lg" onClick={() => navigate("/auth?type=athlete")} className="w-full">
                            Sign In as Athlete
                          </Button>
                          <Button size="lg" variant="outline" onClick={() => navigate("/auth?type=employer")} className="w-full">
                            Sign In as Partner
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-xs">&copy; 2025 U.S. Ski & Snowboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Employers;
