import { useMemo } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ExpertDirectory } from "@/components/experts/ExpertDirectory";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ExpertPreview {
  id: string;
  full_name: string;
  job_title: string | null;
  area_of_expertise: string | null;
  bio: string | null;
  photo_url: string | null;
  industry: string | null;
}

const EXPERTS_PREVIEW_KEY = ["public-experts-preview"];

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
          <ProfileCardSkeleton />
          <ProfileCardSkeleton />
          <ProfileCardSkeleton />
        </div>
      </div>
    </section>
  </div>
);

const Experts = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role: userRole } = useUserRole(user?.id);
  const queryClient = useQueryClient();

  const { data: experts = [], isLoading: expertsLoading } = useQuery<ExpertPreview[]>({
    queryKey: EXPERTS_PREVIEW_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_profiles")
        .select("id, full_name, job_title, area_of_expertise, bio, photo_url, industry")
        .or("is_public.is.true,is_public.is.null")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    initialData: () => queryClient.getQueryData<ExpertPreview[]>(EXPERTS_PREVIEW_KEY),
    staleTime: 5 * 60 * 1000,
    enabled: !user,
  });

  /**
   * Pad the preview list to always fill two full rows (6 cards on lg, 4 on md, 2 on sm)
   * by repeating existing cards. Keeps the blurred backdrop visually balanced.
   */
  const paddedExperts = useMemo(() => {
    if (experts.length === 0) return [];
    const targetCount = 6;
    const out: ExpertPreview[] = [];
    for (let i = 0; i < targetCount; i++) {
      out.push(experts[i % experts.length]);
    }
    return out;
  }, [experts]);

  const isLoading = authLoading || (!user && expertsLoading);

  return (
    <div className="min-h-screen bg-background">
      <main className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}>
        {isLoading ? (
          <PageSkeleton />
        ) : user ? (
          <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Expert Directory</h1>
              {userRole === "expert" && (
                <p className="text-muted-foreground mt-2">View and discover experts in your professional network</p>
              )}
              {userRole !== "expert" && (
                <p className="text-muted-foreground mt-2">Connect with industry experts and mentors</p>
              )}
            </div>
            <ExpertDirectory />
          </div>
        ) : (
          <>
            <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
              <div className="container mx-auto px-4 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">Meet the Experts</h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
                  Discover industry experts to expand your professional network
                </p>
              </div>
            </section>

            <section className="py-8 sm:py-12 relative">
              <div className="container mx-auto px-4 max-w-7xl">
                {/* Blurred card grid — aria-hidden so screen readers skip */}
                <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 justify-items-start">
                    {paddedExperts.map((expert, idx) => (
                      <Card key={`${expert.id}-${idx}`} className="w-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={expert.photo_url || ""} />
                              <AvatarFallback>
                                {expert.full_name
                                  ? expert.full_name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                  : "EX"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg truncate">{expert.full_name}</CardTitle>
                              {expert.job_title && (
                                <p className="text-sm text-muted-foreground truncate">{expert.job_title}</p>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {expert.bio && <p className="text-sm text-muted-foreground line-clamp-2">{expert.bio}</p>}
                          {expert.area_of_expertise && (
                            <Badge variant="secondary" className="text-xs">
                              {expert.area_of_expertise}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="fixed inset-0 z-20 flex items-center justify-center">
                  <Card className="max-w-md mx-4 shadow-xl">
                    <CardContent className="pt-6 text-center space-y-4">
                      <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-semibold mb-1">Sign In to View Experts</h3>
                        <p className="text-sm text-muted-foreground">
                          Create an account or sign in to connect with our experts
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

export default Experts;
