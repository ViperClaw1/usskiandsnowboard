import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mail } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ExpertProfileForm } from "@/components/experts/ExpertProfileForm";
import AthleteDirectory from "@/components/employer/AthleteDirectory";

import { ExpertLandingPage, expertDashboardKey } from "@/components/dashboard/expert/ExpertLandingPage";
import { UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { ProfileCompletionChoiceDialog } from "@/components/dashboard/ProfileCompletionChoiceDialog";
import { useOneTimeOnboardingFlag } from "@/hooks/useOneTimeOnboardingFlag";
import { DashboardSectionLayout } from "@/components/dashboard/DashboardSectionLayout";

interface ExpertDashboardProps {
  user: User;
  openProfileDialog?: boolean;
  onProfileDialogOpened?: () => void;
  onRequestAI?: () => void;
}

const ExpertDashboard = ({ user, openProfileDialog, onProfileDialogOpened, onRequestAI }: ExpertDashboardProps) => {
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<"home" | "athletes" | "connections">("home");
  const [editOpen, setEditOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<"choice" | "manual">("choice");
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [acceptedAthleteName, setAcceptedAthleteName] = useState<string | null>(null);
  const { hasShown, markShown } = useOneTimeOnboardingFlag(`onboarding_shown_expert_${user.id}`);

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

  useEffect(() => {
    if (!profileLoading && !profile) {
      if (!hasShown()) {
        markShown();
        setEditOpen(true);
        setDialogStep("choice");
      }
    }
  }, [profileLoading, profile, hasShown, markShown]);

  useEffect(() => {
    if (openProfileDialog) {
      setEditOpen(true);
      // If profile already exists (e.g. after AI auto-fill), skip choice dialog
      setDialogStep(profile ? "manual" : "choice");
      onProfileDialogOpened?.();
    }
  }, [openProfileDialog, onProfileDialogOpened, profile]);

  if (profileLoading) return <LoadingSpinner fullScreen />;

  const handleNavigate = (view: string) => {
    if (view === "profile") {
      setEditOpen(true);
      setDialogStep("manual");
      return;
    }

    if (view === "athletes" || view === "connections" || view === "home") {
      setCurrentView(view);
    }
  };

  const handleRequestDecision = async (
    requestId: string,
    status: "accepted" | "rejected",
    athleteName?: string,
  ) => {
    setUpdatingRequestId(requestId);
    try {
      const { error } = await supabase.from("expert_connection_requests").update({ status }).eq("id", requestId);
      if (error) throw error;

      await supabase.functions.invoke("send-expert-connection-notification", {
        body: {
          request_id: requestId,
          notification_type: status === "accepted" ? "request_accepted" : "request_declined",
        },
      });

      queryClient.invalidateQueries({ queryKey: ["expert-inbound-requests", profile?.id] });
      queryClient.invalidateQueries({ queryKey: expertDashboardKey(user.id) });

      if (status === "accepted") {
        setAcceptedAthleteName(athleteName ?? "the athlete");
      } else {
        toast.success("Connection rejected.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update request";
      toast.error(msg);
    } finally {
      setUpdatingRequestId(null);
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

        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setDialogStep("choice");
          }}
        >
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            {profile || dialogStep === "manual" ? (
              <>
                <DialogHeader>
                  <DialogTitle>{profile ? "Edit Expert Profile" : "Create Expert Profile"}</DialogTitle>
                </DialogHeader>
                <ExpertProfileForm
                  initialData={
                    profile
                      ? {
                          ussa_affiliate:
                            profile.ussa_affiliate === "Athlete Alum" ||
                            profile.ussa_affiliate === "Trustee" ||
                            profile.ussa_affiliate === "Ambassador" ||
                            profile.ussa_affiliate === "Next Gen Council"
                              ? profile.ussa_affiliate
                              : "",
                          full_name: profile.full_name,
                          job_title: profile.job_title ?? "",
                          area_of_expertise: profile.area_of_expertise ?? "",
                          headshot: profile.headshot ?? "",
                          bio: profile.bio ?? "",
                          industry: profile.industry
                            ? profile.industry
                                .split(",")
                                .map((v) => v.trim())
                                .filter(Boolean)
                            : [],
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
                    setDialogStep("choice");
                    queryClient.invalidateQueries({ queryKey: ["expert-own-profile", user.id] });
                    queryClient.invalidateQueries({ queryKey: expertDashboardKey(user.id) });
                    queryClient.refetchQueries({ queryKey: expertDashboardKey(user.id), type: "active" });
                  }}
                  onCancel={() => {
                    setEditOpen(false);
                    setDialogStep("choice");
                  }}
                />
              </>
            ) : (
              <ProfileCompletionChoiceDialog
                onChooseAI={() => {
                  setEditOpen(false);
                  setDialogStep("choice");
                  onRequestAI?.();
                }}
                onChooseManual={() => setDialogStep("manual")}
                onSkip={() => {
                  setEditOpen(false);
                  setDialogStep("choice");
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (currentView === "athletes") {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <main>
          <DashboardSectionLayout title="Athlete Directory" onBack={() => setCurrentView("home")}>
          <AthleteDirectory />
          </DashboardSectionLayout>
        </main>
      </div>
    );
  }


  if (currentView === "connections") {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <main>
          <DashboardSectionLayout title="My Connections" onBack={() => setCurrentView("home")}>
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
                      {req.status === "pending" ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleRequestDecision(
                                req.id,
                                "accepted",
                                req.athlete_profiles?.profiles?.full_name,
                              )
                            }
                            disabled={updatingRequestId === req.id}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRequestDecision(req.id, "rejected")}
                            disabled={updatingRequestId === req.id}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {req.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </DashboardSectionLayout>
        </main>
      </div>
    );
  }

  return null;
};

const AcceptedDialogPortal = () => null;

export default ExpertDashboard;
