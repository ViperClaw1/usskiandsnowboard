import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Lock } from "lucide-react";
import usLogo from "@/assets/us-logo.png";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { supabase } from "@/integrations/supabase/client";
import { MobileNav } from "@/components/MobileNav";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import { User } from "@supabase/supabase-js";

interface AthleteProfile {
  id: string;
  user_id: string;
  photo_url: string | null;
  sport_discipline: string | null;
  bio: string | null;
  skills: string[] | null;
  availability: string | null;
  profile_views: number;
  profiles: {
    full_name: string;
  } | null;
}


const Athletes = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
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

    loadAthletes();

    return () => subscription.unsubscribe();
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
          profile_views,
          profiles!inner(full_name)
        `)
        .eq("is_public", true)
        .order("profile_views", { ascending: false })
        .limit(3);

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
    navigate("/auth?type=employer");
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
              U.S. Ski & Snowboard Athletes
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Discover talented athletes ready for their next career opportunity
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-12 relative">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <ProfileCardSkeleton />
                <ProfileCardSkeleton />
                <ProfileCardSkeleton />
              </div>
            ) : athletes.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No Featured Athletes Yet"
                description="Check back soon to see our talented athletes looking for career opportunities."
                actionLabel="Sign In to Learn More"
                onAction={() => navigate("/auth")}
              />
            ) : (
              <>
                <div className={!user ? "blur-sm pointer-events-none" : ""}>
                  <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {athletes.map((athlete) => (
                      <Card 
                        key={athlete.id} 
                        className="shadow-elegant hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer hover:border-primary/50 animate-fade-in"
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
                </div>
                
                {!user && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                    <Card className="max-w-md mx-4 shadow-2xl border-2">
                      <CardHeader className="text-center pb-4">
                        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Sign In to View Athletes</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">
                          Connect with world-class talent. Sign in as a Partner to discover athletes who bring unmatched dedication and excellence.
                        </p>
                        <div className="flex flex-col gap-3">
                          <Button size="lg" onClick={() => navigate("/auth?type=employer")} className="w-full">
                            Sign In as Partner
                          </Button>
                          <Button size="lg" variant="outline" onClick={() => navigate("/auth?type=athlete")} className="w-full">
                            Sign In as Athlete
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

export default Athletes;
