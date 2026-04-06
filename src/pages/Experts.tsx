import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ExpertDirectory } from "@/components/experts/ExpertDirectory";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

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

  const isLoading = authLoading;

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
                  <ExpertDirectory />
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <Card className="max-w-md mx-4 shadow-xl">
                    <CardContent className="pt-6 text-center space-y-4">
                      <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-semibold mb-1">Sign In to View Experts</h3>
                        <p className="text-sm font-medium text-foreground mb-2">Sign In to View Athletes</p>
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
