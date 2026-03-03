import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, User, Building2, Calendar, Mail } from "lucide-react";
import { format } from "date-fns";

interface WaitlistApplicant {
  id: string;
  email: string;
  full_name: string;
  user_type: string;
  profile_data: Record<string, any>;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  declined: "bg-red-100 text-red-800 border-red-200",
};

export const WaitlistManager = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<WaitlistApplicant | null>(null);

  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ["waitlist-applicants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waitlist_applicants" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as WaitlistApplicant[];
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ applicant_id, action }: { applicant_id: string; action: "approve" | "decline" }) => {
      const { error } = await supabase.functions.invoke("handle-waitlist-decision", {
        body: { applicant_id, action },
      });
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      toast.success(action === "approve" ? "Applicant approved and notified by email." : "Applicant declined and notified by email.");
      queryClient.invalidateQueries({ queryKey: ["waitlist-applicants"] });
      setSelected(null);
    },
    onError: (error: any) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const pendingCount = applicants.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-glow rounded-lg p-6 text-primary-foreground shadow-elegant">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Waitlist Applications</h2>
            <p className="text-primary-foreground/90">
              {pendingCount} pending review
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : applicants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No waitlist applications yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Applications ({applicants.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Role</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Applied</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applicants.map((applicant) => (
                    <tr
                      key={applicant.id}
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelected(applicant)}
                    >
                      <td className="p-4 font-medium">{applicant.full_name}</td>
                      <td className="p-4 text-muted-foreground text-sm">{applicant.email}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          {applicant.user_type === "athlete" ? <User className="h-3.5 w-3.5 text-primary" /> : <Building2 className="h-3.5 w-3.5 text-primary" />}
                          <span className="capitalize">{applicant.user_type}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground text-sm">
                        {format(new Date(applicant.created_at), "MMM d, yyyy")}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[applicant.status] || ""}`}>
                          {applicant.status}
                        </span>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {applicant.status === "pending" && (
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => decisionMutation.mutate({ applicant_id: applicant.id, action: "approve" })}
                              disabled={decisionMutation.isPending}
                            >
                              {decisionMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => decisionMutation.mutate({ applicant_id: applicant.id, action: "decline" })}
                              disabled={decisionMutation.isPending}
                            >
                              {decisionMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                              Decline
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.user_type === "athlete" ? <User className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}
                  {selected.full_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{selected.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Applied {format(new Date(selected.created_at), "MMMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[selected.status] || ""}`}>
                    {selected.status}
                  </span>
                  <span className="text-sm text-muted-foreground capitalize ml-1">· {selected.user_type}</span>
                </div>

                {/* Profile data */}
                {Object.keys(selected.profile_data).length > 0 && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <h4 className="font-semibold text-sm">Profile Information</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(selected.profile_data).map(([key, value]) => {
                        if (!value || key === "password" || key === "ai_populate") return null;
                        const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                        return (
                          <div key={key} className="text-sm">
                            <span className="font-medium text-muted-foreground">{label}:</span>{" "}
                            <span>{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selected.status === "pending" && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      className="flex-1 bg-green-700 hover:bg-green-800 text-white"
                      onClick={() => decisionMutation.mutate({ applicant_id: selected.id, action: "approve" })}
                      disabled={decisionMutation.isPending}
                    >
                      {decisionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Approve &amp; Send Welcome Email
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-700 border-red-300 hover:bg-red-50"
                      onClick={() => decisionMutation.mutate({ applicant_id: selected.id, action: "decline" })}
                      disabled={decisionMutation.isPending}
                    >
                      {decisionMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                      Decline
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
