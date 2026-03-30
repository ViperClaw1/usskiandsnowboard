import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { ExpertDirectory } from "@/components/experts/ExpertDirectory";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { user, loading: authLoading } = useAuth();
  const { role: userRole } = useUserRole(user?.id);

  const isLoading = authLoading;

  return (
    <div className="min-h-screen bg-background">
      <main className={`transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}>
        {isLoading ? (
          <PageSkeleton />
        ) : (
          <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">Expert Directory</h1>
              {userRole === "expert" && (
                <p className="text-muted-foreground mt-2">View and discover experts in your professional network</p>
              )}
              {userRole !== "expert" && user && (
                <p className="text-muted-foreground mt-2">Connect with industry experts and mentors</p>
              )}
              {!user && (
                <p className="text-muted-foreground mt-2">Discover industry experts to expand your professional network</p>
              )}
            </div>
            <ExpertDirectory />
          </div>
        )}
      </main>
    </div>
  );
};

export default Experts;
