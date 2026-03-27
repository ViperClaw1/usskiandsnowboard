import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ExpertProfileForm } from "@/components/experts/ExpertProfileForm";
import AthleteDirectory from "@/components/employer/AthleteDirectory";
import EmployerDirectory from "@/components/athlete/EmployerDirectory";
import { ExpertLandingPage } from "@/components/dashboard/expert/ExpertLandingPage";
import { UserCheck, Users } from "lucide-react";

interface ExpertDashboardProps {
  user: User;
}

const ExpertDashboard = ({ user }: ExpertDashboardProps) => {
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<"home" | "athletes" | "employers" | "connections">("home");
  const [editOpen, setEditOpen] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["expert-own-profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("expert_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["expert-inbound-requests", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from("expert_connection_requests")
        .select(
          `
          id,
          message,
          status,
          created_at,
          athlete_id,
          athlete_profiles!inner(id, user_id, profiles!inner(full_name, email))
        `,
        )
        .eq("expert_id", profile.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile,
  });

  if (profileLoading) return <LoadingSpinner fullScreen />;

  const handleNavigate = (view: string) => {
    if (view === "profile") {
      setEditOpen(true);
      return;
    }

    if (view === "athletes" || view === "employers" || view === "connections" || view === "home") {
      setCurrentView(view);
    }
  };

  if (currentView === "home") {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <main>
          <ExpertLandingPage
            user={user}
            onNavigate={handleNavigate}
            onProfileUpdated={() => queryClient.invalidateQueries({ queryKey: ["expert-own-profile", user.id] })}
          />
        </main>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{profile ? "Edit Expert Profile" : "Create Expert Profile"}</DialogTitle>
            </DialogHeader>
            <ExpertProfileForm
              initialData={
                profile
                  ? {
                      full_name: profile.full_name,
                      job_title: profile.job_title ?? "",
                      area_of_expertise: profile.area_of_expertise ?? "",
                      headshot: profile.headshot ?? "",
                      bio: profile.bio ?? "",
                      industry: profile.industry ?? "",
                      is_alum: profile.is_alum ?? false,
                      linkedin_url: profile.linkedin_url ?? "",
                      email: profile.email ?? "",
                      photo_url: profile.photo_url ?? "",
                    }
                  : undefined
              }
              expertId={profile?.id}
              adminUserId={!profile ? user.id : undefined}
              userId={user.id}
              onSaved={() => {
                setEditOpen(false);
                queryClient.invalidateQueries({ queryKey: ["expert-own-profile", user.id] });
              }}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (currentView === "athletes") {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">Athlete Directory</h2>
            <Button variant="outline" onClick={() => setCurrentView("home")} className="w-full sm:w-auto">
              Back to Home
            </Button>
          </div>
          <AthleteDirectory />
        </main>
      </div>
    );
  }

  if (currentView === "employers") {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">Partners Directory</h2>
            <Button variant="outline" onClick={() => setCurrentView("home")} className="w-full sm:w-auto">
              Back to Home
            </Button>
          </div>
          <EmployerDirectory />
        </main>
      </div>
    );
  }

  if (currentView === "connections") {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">My Connections</h2>
            <Button variant="outline" onClick={() => setCurrentView("home")} className="w-full sm:w-auto">
              Back to Home
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Connection Requests
                {requests.length > 0 && <Badge variant="secondary">{requests.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <LoadingSpinner />
              ) : requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No connection requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((req: any) => (
                    <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <UserCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground">
                          {req.athlete_profiles?.profiles?.full_name ?? "Unknown Athlete"}
                        </p>
                        {req.message && <p className="text-xs text-muted-foreground mt-1 italic">"{req.message}"</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {req.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return null;
};

export default ExpertDashboard;
