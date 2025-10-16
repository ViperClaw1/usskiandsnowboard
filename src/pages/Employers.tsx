import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2 } from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";
import { supabase } from "@/integrations/supabase/client";

interface EmployerProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry: string | null;
  logo_url: string | null;
  about: string | null;
  opportunities_offered: string | null;
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
          opportunities_offered
        `);

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
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={usSkiLogo} alt="U.S. Ski & Snowboard" className="h-[63px] hover:opacity-80 transition-opacity" />
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/athletes" className="text-foreground hover:text-primary font-medium transition-colors">
              Athletes
            </Link>
            <Link to="/employers" className="text-primary font-medium">
              Partners
            </Link>
            <Link to="/news" className="text-foreground hover:text-primary font-medium transition-colors">
              News
            </Link>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-12 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Partner Organizations
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Companies partnering with talented U.S. Ski & Snowboard athletes
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : employers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No partner profiles available yet.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {employers.map((employer) => (
                  <Card 
                    key={employer.id} 
                    className="shadow-elegant hover:shadow-hover transition-shadow cursor-pointer"
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
          <p>&copy; 2025 U.S. Ski & Snowboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Employers;
