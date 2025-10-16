import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";
import { supabase } from "@/integrations/supabase/client";

interface AthleteProfile {
  id: string;
  user_id: string;
  photo_url: string | null;
  sport_discipline: string | null;
  bio: string | null;
  skills: string[] | null;
  availability: string | null;
  profiles: {
    full_name: string;
  } | null;
}


const Athletes = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(`
          id,
          user_id,
          photo_url,
          sport_discipline,
          bio,
          skills,
          availability,
          profiles!inner(full_name)
        `)
        .eq("is_public", true);

      if (error) {
        console.error("Database error:", error);
        throw error;
      }
      
      console.log("Loaded athletes:", data);
      setAthletes(data || []);
    } catch (error) {
      console.error("Error loading athletes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAthleteClick = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={usSkiLogo} alt="U.S. Ski & Snowboard" className="h-10 hover:opacity-80 transition-opacity" />
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/athletes" className="text-primary font-medium">
              Athletes
            </Link>
            <Link to="/employers" className="text-foreground hover:text-primary font-medium transition-colors">
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
              U.S. Ski & Snowboard Athletes
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover talented athletes ready for their next career opportunity
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : athletes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No athlete profiles available yet.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {athletes.map((athlete) => (
                  <Card 
                    key={athlete.id} 
                    className="shadow-elegant hover:shadow-hover transition-shadow cursor-pointer"
                    onClick={handleAthleteClick}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={athlete.photo_url || undefined} />
                          <AvatarFallback>
                            {athlete.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{athlete.profiles?.full_name || 'Athlete'}</CardTitle>
                          {athlete.sport_discipline && (
                            <Badge variant="secondary" className="mt-1">
                              {athlete.sport_discipline}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {athlete.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{athlete.bio}</p>
                      )}
                      {athlete.skills && athlete.skills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {athlete.skills.slice(0, 3).map((skill, idx) => (
                              <Badge key={idx} variant="outline">{skill}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {athlete.availability && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Availability:</span> {athlete.availability}
                        </p>
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

export default Athletes;
