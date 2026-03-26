import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ExpertDirectory } from "@/components/experts/ExpertDirectory";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";

interface ExpertPreview {
  id: string;
  full_name: string;
  job_title: string | null;
  area_of_expertise: string | null;
  bio: string | null;
  industry: string | null;
  is_public: boolean | null;
  photo_url: string | null;
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

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

const Experts = () => {
  const { user, loading: authLoading } = useAuth();
  const { role: userRole } = useUserRole(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: experts = [], isLoading: expertsLoading } = useQuery<ExpertPreview[]>({
    queryKey: EXPERTS_PREVIEW_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_profiles")
        .select("id, full_name, job_title, area_of_expertise, bio, industry, is_public, photo_url")
        .or("is_public.is.true,is_public.is.null")
        .order("full_name")
        .limit(3);
      if (error) throw error;
      return (data ?? []) as ExpertPreview[];
    },
    initialData: () => queryClient.getQueryData<ExpertPreview[]>(EXPERTS_PREVIEW_KEY),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = authLoading || expertsLoading;
  const previewExperts = useMemo(() => experts, [experts]);

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
                <div className="blur-sm pointer-events-none select-none" aria-hidden="true">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 justify-items-start">
                    {previewExperts.map((expert) => (
                      <Card key={expert.id} className="w-full">
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={expert.photo_url || ""} />
                              <AvatarFallback>{getInitials(expert.full_name || "EX")}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{expert.full_name}</p>
                              {expert.job_title && (
                                <p className="text-sm text-muted-foreground truncate">{expert.job_title}</p>
                              )}
                            </div>
                          </div>
                          {expert.industry && (
                            <Badge variant="secondary" className="text-xs">
                              {expert.industry}
                            </Badge>
                          )}
                          {expert.bio && <p className="text-sm text-muted-foreground line-clamp-2">{expert.bio}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <Card className="max-w-md mx-4 shadow-xl">
                    <CardContent className="pt-6 text-center space-y-4">
                      <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Sign In to View Experts</h3>
                        <p className="text-sm text-muted-foreground">
                          Create an account or sign in to connect with industry professionals
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
