import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import { User } from "@supabase/supabase-js";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";
import AthleteDirectory from "@/components/employer/AthleteDirectory";

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

  // If user is authenticated, show the full directory
  if (user) {
    return (
      <div className="min-h-screen bg-background">
        <AuthenticatedNav />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Athlete Directory</h1>
          <AthleteDirectory />
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
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              U.S. Ski & Snowboard Athletes
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Discover talented athletes ready for their next career opportunity
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
            ) : (
              <>
                <div className={!user ? "blur-sm pointer-events-none" : ""}>
                  {athletes.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No Featured Athletes Yet"
                      description="Check back soon to see our talented athletes looking for career opportunities."
                      actionLabel="Sign In to Learn More"
                      onAction={() => navigate("/auth")}
                    />
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 justify-items-start">
                      {athletes.map((athlete) => (
                        <Card 
                          key={athlete.id} 
                          className="w-full cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={handleAthleteClick}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={athlete.photo_url || ""} />
                                <AvatarFallback>
                                  {athlete.profiles?.full_name 
                                    ? athlete.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                                    : 'AT'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg truncate">
                                  {athlete.profiles?.full_name || "Athlete"}
                                </CardTitle>
                                {athlete.sport_discipline && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {athlete.sport_discipline}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {athlete.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {athlete.bio}
                              </p>
                            )}
                            {athlete.skills && athlete.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {athlete.skills.slice(0, 3).map((skill, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {athlete.skills.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{athlete.skills.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                            {athlete.availability && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">Availability:</span>
                                <Badge variant="outline" className="text-xs">
                                  {athlete.availability}
                                </Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {!user && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/10 backdrop-blur-[1px]">
                    <Card className="max-w-md mx-4">
                      <CardContent className="pt-6 text-center space-y-4">
                        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <h3 className="text-lg font-semibold mb-2">
                            Sign In to View Athletes
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Create an account or sign in to connect with talented athletes
                          </p>
                        </div>
                        <Button onClick={() => navigate("/auth")}>
                          Sign In
                        </Button>
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

export default Athletes;
