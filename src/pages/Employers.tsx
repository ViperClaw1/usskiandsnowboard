import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import usLogo from "@/assets/us-logo.png";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { supabase } from "@/integrations/supabase/client";
import { MobileNav } from "@/components/MobileNav";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";

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

  useEffect(() => {
    loadEmployers();
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
      <header className="border-b sticky top-0 z-50" style={{ 
        backgroundImage: `url(${mountainHeaderBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1e3a5f'
      }}>
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <Link to="/">
            <img src={usLogo} alt="U.S. Ski & Snowboard" className="h-16 sm:h-20 hover:opacity-80 transition-opacity" />
          </Link>
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            <Link to="/athletes" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
              Athletes
            </Link>
            <Link to="/employers" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
              Partners
            </Link>
            <a href="/schedule.pdf" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
              Schedule
            </a>
            <Link to="/news" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
              News
            </Link>
            <Link to="/auth">
              <Button size="sm" className="lg:h-10">Sign In</Button>
            </Link>
          </nav>
          <MobileNav />
        </div>
      </header>

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

        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                            className="h-12 w-12 object-contain rounded"
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
