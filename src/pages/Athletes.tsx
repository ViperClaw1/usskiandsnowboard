import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
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

// ---------------------------------------------------------------------------
// A single unified skeleton that mirrors the real unauthenticated page layout
// exactly — same nav always rendered above, same hero section, same card grid
// — so there is no structural shift when real content replaces it.
// ---------------------------------------------------------------------------
const PageSkeleton = () => (
  <>
    <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 text-center space-y-3">
        <Skeleton className="h-9 sm:h-10 w-72 mx-auto" />
        <Skeleton className="h-5 sm:h-6 w-96 max-w-full mx-auto" />
      </div>
    </section>

    <section className="py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ProfileCardSkeleton />
          <ProfileCardSkeleton />
          <ProfileCardSkeleton />
        </div>
      </div>
    </section>
  </>
);

const Athletes = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  // Track both fetches with a single "ready" flag so we only render once both
  // the auth state AND the athlete list are known.
  const [authLoading, setAuthLoading] = useState(true);
  const [athletesLoading, setAthletesLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Kick off the athlete fetch immediately in parallel with the auth check
    // so we don't waterfall. Authenticated users get AthleteDirectory anyway,
    // so this data is only shown to unauthenticated visitors.
    loadAthletes();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        loadUserRole(user.id);
      }
      setAuthLoading(false);
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
    if (data) setUserRole(data.role);
  };

  const loadAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(
          `
          id,
          user_id,
          photo_url,
          sport_discipline,
          bio,
          skills,
          availability,
          profile_views,
          profiles!inner(full_name)
        `,
        )
        .eq("is_public", true)
        .order("profile_views", { ascending: false })
        .limit(3);

      if (error) throw error;
      setAthletes(data || []);
    } catch (error) {
      console.error("Error loading athletes:", error);
    } finally {
      setAthletesLoading(false);
    }
  };

  const handleAthleteClick = () => navigate("/auth?type=employer");

  // Wait until BOTH auth and athlete data are resolved before rendering.
  // This prevents the double-render jump (skeleton → wrong view → right view).
  const isLoading = authLoading || athletesLoading;

  return (
    // Always render the nav so its height is established from the very first
    // paint — no height pop when auth resolves.
    <div className="min-h-screen bg-background">
      <AuthenticatedNav />

      {/* Wrap the swapping content in a container that fades in once ready */}
      <main className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}>
        {isLoading ? (
          // Invisible placeholder that keeps the page height stable while loading.
          <PageSkeleton />
        ) : user ? (
          /* ── Authenticated view ── */
          <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Athlete Directory</h1>
              {userRole === "athlete" && (
                <p className="text-muted-foreground mt-2">View the profiles of your teammates</p>
              )}
              {userRole === "employer" && (
                <p className="text-muted-foreground mt-2">
                  View U.S. Ski & Snowboard athletes exploring their next chapter
                </p>
              )}
            </div>
            <AthleteDirectory />
          </div>
        ) : (
          /* ── Public / unauthenticated view ── */
          <>
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
                {athletes.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No Featured Athletes Yet"
                    description="Check back soon to see our talented athletes looking for career opportunities."
                    actionLabel="Sign In to Learn More"
                    onAction={() => navigate("/auth")}
                  />
                ) : (
                  <>
                    {/* Blurred card grid — pointer-events disabled intentionally */}
                    <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 justify-items-start">
                        {athletes.map((athlete) => (
                          <Card key={athlete.id} className="w-full">
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={athlete.photo_url || ""} />
                                  <AvatarFallback>
                                    {athlete.profiles?.full_name
                                      ? athlete.profiles.full_name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase()
                                      : "AT"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-lg truncate">
                                    {athlete.profiles?.full_name || "Athlete"}
                                  </CardTitle>
                                  {athlete.sport_discipline && (
                                    <p className="text-sm text-muted-foreground truncate">{athlete.sport_discipline}</p>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {athlete.bio && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{athlete.bio}</p>
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
                    </div>

                    {/* Lock overlay — positioned over the blurred grid */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Card className="max-w-md mx-4 shadow-xl">
                        <CardContent className="pt-6 text-center space-y-4">
                          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                          <div>
                            <h3 className="text-lg font-semibold mb-2">Sign In to View Athletes</h3>
                            <p className="text-sm text-muted-foreground">
                              Create an account or sign in to connect with talented athletes
                            </p>
                          </div>
                          <Button onClick={() => navigate("/auth")}>Sign In</Button>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Athletes;
