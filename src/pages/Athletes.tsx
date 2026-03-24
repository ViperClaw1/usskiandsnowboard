// ==============================
// Imports
// ==============================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import AthleteDirectory from "@/components/employer/AthleteDirectory";

// ==============================
// Types / Interfaces
// ==============================

interface AthleteProfile {
  id: string;
  user_id: string;
  photo_url: string | null;
  sport_discipline: string[] | null;
  bio: string | null;
  skills: string[] | null;
  availability: string | null;
  profile_views: number;
  profiles: { full_name: string } | null;
}

// ==============================
// Skeleton Component
// Mirrors the unauthenticated page layout exactly to prevent layout shift
// ==============================

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

// ==============================
// Component Definition
// ==============================

const ATHLETES_QUERY_KEY = ["public-athletes-preview"];

const Athletes = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role: userRole } = useUserRole(user?.id);
  const queryClient = useQueryClient();

  // ==============================
  // Data Fetching — Public Athlete Preview
  // ==============================
  const { data: athletes = [], isLoading: athletesLoading } = useQuery<AthleteProfile[]>({
    queryKey: ATHLETES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(
          `id, user_id, photo_url, sport_discipline, bio, skills, availability, profile_views,
           profiles!inner(full_name)`,
        )
        .eq("is_public", true)
        .order("profile_views", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    initialData: () => queryClient.getQueryData<AthleteProfile[]>(ATHLETES_QUERY_KEY),
    staleTime: 5 * 60 * 1000,
  });

  // ==============================
  // Derived Values
  // ==============================
  const isLoading = authLoading || athletesLoading;

  /** Stable sliced skills list per athlete */
  const athletesWithSlicedSkills = useMemo(
    () =>
      athletes.map((a) => ({
        ...a,
        skillsPreview: a.skills?.slice(0, 3) ?? [],
        extraSkills: Math.max(0, (a.skills?.length ?? 0) - 3),
      })),
    [athletes],
  );

  // ==============================
  // Render
  // ==============================

  return (
    <div className="min-h-screen bg-background">
      <main className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}>
        {isLoading ? (
          <PageSkeleton />
        ) : user ? (
          /* ── Authenticated view: full directory ── */
          <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Athlete Directory</h1>
              {userRole === "athlete" && (
                <p className="text-muted-foreground mt-2">View the profiles of your teammates</p>
              )}
              {userRole === "employer" && (
                <p className="text-muted-foreground mt-2">
                  View U.S. Ski &amp; Snowboard athletes exploring their next chapter
                </p>
              )}
            </div>

            <AthleteDirectory />
          </div>
        ) : (
          /* ── Public / unauthenticated view: blurred preview + lock overlay ── */
          <>
            <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
              <div className="container mx-auto px-4 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
                  U.S. Ski &amp; Snowboard Athletes
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                  Discover talented athletes ready for their next career opportunity
                </p>
              </div>
            </section>

            <section className="py-8 sm:py-12 relative">
              <div className="container mx-auto px-4 max-w-7xl">
                {/* Blurred card grid — aria-hidden so screen readers skip */}
                <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 justify-items-start">
                    {athletesWithSlicedSkills.map((athlete) => (
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
                                <p className="text-sm text-muted-foreground truncate">
                                  {athlete.sport_discipline.join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {athlete.bio && <p className="text-sm text-muted-foreground line-clamp-2">{athlete.bio}</p>}
                          {athlete.skillsPreview.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {athlete.skillsPreview.map((skill, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {athlete.extraSkills > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  +{athlete.extraSkills} more
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

                {/* Sign-in lock overlay — always shown when logged out */}
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
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Athletes;
