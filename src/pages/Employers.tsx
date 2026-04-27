// ==============================
// Imports
// ==============================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import EmployerDirectory from "@/components/athlete/EmployerDirectory";

// ==============================
// Types / Interfaces
// ==============================

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

// ==============================
// Query Key
// Defined as a constant so the initialData lookup references the exact same
// key as the query that populated the cache — no risk of a typo cache miss.
// ==============================
const EMPLOYERS_PREVIEW_KEY = ["public-employers-preview"];

// ==============================
// Skeleton Component
// Mirrors the unauthenticated page layout exactly to prevent layout shift
// ==============================

const PageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 text-center space-y-3">
        <Skeleton className="h-9 sm:h-10 w-72 mx-auto" />
        <Skeleton className="h-5 sm:h-6 w-96 max-w-full mx-auto" />
      </div>
    </section>
    <section className="py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProfileCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  </div>
);

// ==============================
// Component Definition
// Smart component — fetches employers for the public preview and delegates
// the authenticated directory view to EmployerDirectory.
// Auth state comes from AuthContext (useAuth) instead of inline listeners.
// Data fetching uses React Query for automatic caching — the employer list is
// fetched once and served from cache on subsequent visits until stale.
// ==============================

const Employers = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role: userRole } = useUserRole(user?.id);
  const queryClient = useQueryClient();

  // ==============================
  // Data Fetching — Public Employer Preview
  // Fetches top 3 employers for the unauthenticated blurred-card preview.
  //
  // initialData reads whatever is already sitting in the QueryClient cache
  // synchronously before this render commits. On the very first visit the cache
  // is empty so initialData is undefined and isLoading behaves normally. On
  // every subsequent visit the cache already holds the employer list, so
  // initialData is populated immediately and isLoading is false from the first
  // render — no intermediate opacity-0 / skeleton flash.
  // ==============================
  const { data: employers = [], isLoading: employersLoading } = useQuery<EmployerProfile[]>({
    queryKey: EMPLOYERS_PREVIEW_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select(
          `id, user_id, company_name, industry, logo_url, about,
           connection_to_ussa, opportunities_offered, profile_views`,
        )
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    // Serve cached data synchronously on repeated mounts — eliminates the
    // isLoading:true → isLoading:false re-render cycle entirely on repeat visits.
    initialData: () => queryClient.getQueryData<EmployerProfile[]>(EMPLOYERS_PREVIEW_KEY),
    // Keep data fresh for 5 minutes before allowing a background re-fetch.
    staleTime: 5 * 60 * 1000,
  });

  // ==============================
  // Derived Values
  // authLoading is only ever true on the very first app load (AuthProvider
  // resolves from the Supabase local cache synchronously on repeat visits).
  // employersLoading is only ever true on the very first visit (initialData
  // populates from cache on all subsequent mounts).
  // Together, isLoading is false from the first render on all repeat visits.
  // ==============================
  const isLoading = authLoading || employersLoading;

  /** Stable employer list reference — prevents re-renders from reconstructing card props */
  const employerList = useMemo(() => employers, [employers]);

  /**
   * Pad the preview list to always fill two full rows (6 cards on lg, 4 on md, 2 on sm)
   * by repeating existing cards. Keeps the blurred backdrop visually balanced.
   */
  const paddedEmployers = useMemo(() => {
    if (employerList.length === 0) return [];
    const targetCount = 6;
    const out: typeof employerList = [];
    for (let i = 0; i < targetCount; i++) {
      out.push(employerList[i % employerList.length]);
    }
    return out;
  }, [employerList]);

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
              <h1 className="text-3xl font-bold">Employer Directory</h1>
              {userRole === "employer" && (
                <p className="text-muted-foreground mt-2">
                  View the profiles of your fellow U.S. Ski &amp; Snowboard supporters
                </p>
              )}
              {userRole === "athlete" && (
                <p className="text-muted-foreground mt-2">
                  View U.S. Ski &amp; Snowboard partners seeking to hire athletes
                </p>
              )}
            </div>
            <EmployerDirectory />
          </div>
        ) : (
          /* ── Public / unauthenticated view: blurred preview + lock overlay ── */
          <>
            <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
              <div className="container mx-auto px-4 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">Partner Organizations</h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                  Companies partnering with talented U.S. Ski &amp; Snowboard athletes
                </p>
              </div>
            </section>

            <section className="py-8 sm:py-12 relative">
              <div className="container mx-auto px-4 max-w-7xl">
                {employerList.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="No Featured Partners Yet"
                    description="Check back soon to see companies partnering with talented athletes."
                    actionLabel="Sign In to Learn More"
                    onAction={() => navigate("/auth")}
                  />
                ) : (
                  <>
                    {/* Blurred card grid — aria-hidden so screen readers skip */}
                    <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 justify-items-start">
                        {paddedEmployers.map((employer, idx) => (
                          <Card key={`${employer.id}-${idx}`} className="w-full">
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-3">
                                {employer.logo_url ? (
                                  <div className="flex-shrink-0 w-12 h-12">
                                    <img
                                      src={employer.logo_url}
                                      alt={employer.company_name}
                                      className="w-full h-full object-contain rounded"
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
                            {employer.about && (
                              <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">{employer.about}</p>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Sign-in lock overlay */}
                    <div className="fixed inset-0 z-20 flex items-center justify-center">
                      <Card className="max-w-md mx-4 shadow-xl">
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

export default Employers;
