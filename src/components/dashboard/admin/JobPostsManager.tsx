import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, X, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_INDUSTRIES, EMPLOYMENT_TYPES } from "@/constants/jobBoard";
import { formatDistanceToNow } from "date-fns";

interface AdminJob {
  id: string;
  source_url: string;
  job_title: string;
  company: string | null;
  location: string | null;
  industry: string | null;
  employment_type: string | null;
  status: string;
  created_at: string;
  expert_id: string;
  expert: { id: string; full_name: string | null } | null;
}

export const JobPostsManager = () => {
  const qc = useQueryClient();
  const [newIndustry, setNewIndustry] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["job-board-settings"],
    queryFn: async () => (await supabase.from("job_board_settings").select("*").eq("id", 1).maybeSingle()).data,
  });

  const { data: jobs = [], isLoading } = useQuery<AdminJob[]>({
    queryKey: ["admin-job-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_posts")
        .select(`id, source_url, job_title, company, location, industry, employment_type,
                 status, created_at, expert_id,
                 expert:expert_profiles!job_posts_expert_id_fkey ( id, full_name )`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const industries = (settings?.industries as string[] | undefined) ?? [...DEFAULT_INDUSTRIES];
  const requireApproval = settings?.require_approval ?? false;

  const saveSettings = async (next: { industries?: string[]; require_approval?: boolean }) => {
    const { error } = await supabase.from("job_board_settings").update({
      ...(next.industries !== undefined ? { industries: next.industries } : {}),
      ...(next.require_approval !== undefined ? { require_approval: next.require_approval } : {}),
    }).eq("id", 1);
    if (error) {
      toast.error("Failed to update settings");
    } else {
      toast.success("Settings updated");
      qc.invalidateQueries({ queryKey: ["job-board-settings"] });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("job_posts").update({ status: status as any }).eq("id", id);
    if (error) toast.error("Failed to update");
    else {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-job-posts"] });
      qc.invalidateQueries({ queryKey: ["job-posts"] });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this job post?")) return;
    const { error } = await supabase.from("job_posts").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-job-posts"] });
      qc.invalidateQueries({ queryKey: ["job-posts"] });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Job Board Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Require admin approval</Label>
              <p className="text-sm text-muted-foreground">
                When on, new posts start as pending and only become visible after approval.
              </p>
            </div>
            <Switch checked={requireApproval} onCheckedChange={(v) => saveSettings({ require_approval: v })} />
          </div>

          <div className="space-y-2">
            <Label className="text-base">Industries</Label>
            <div className="flex flex-wrap gap-1.5">
              {industries.map((ind) => (
                <Badge key={ind} variant="secondary" className="gap-1">
                  {ind}
                  <button
                    className="hover:text-destructive"
                    onClick={() => saveSettings({ industries: industries.filter((i) => i !== ind) })}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add industry"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
              />
              <Button
                onClick={() => {
                  const v = newIndustry.trim();
                  if (!v || industries.includes(v)) return;
                  saveSettings({ industries: [...industries, v] });
                  setNewIndustry("");
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Job Posts ({jobs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No job posts yet.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => (
                <div key={j.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-md">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={j.source_url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline truncate">
                        {j.job_title}
                      </a>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {j.company ?? "—"} · {j.industry ?? "—"} · {j.employment_type ?? "—"} ·
                      Posted by {j.expert?.full_name ?? "?"} · {formatDistanceToNow(new Date(j.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Select value={j.status} onValueChange={(v) => updateStatus(j.id, v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="filled">Filled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => remove(j.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
