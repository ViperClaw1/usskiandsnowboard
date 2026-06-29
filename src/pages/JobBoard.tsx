import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, X, Linkedin, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard, type JobPostListItem } from "@/components/jobs/JobCard";
import { EMPLOYMENT_TYPES, ARCHIVE_AFTER_DAYS } from "@/constants/jobBoard";
import { INDUSTRY_OPTIONS } from "@/data/suggestions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExpertConnectionRequestDialog } from "@/components/experts/ExpertConnectionRequestDialog";
import type { ExpertProfile } from "@/components/experts/ExpertDirectory";
import { toast } from "sonner";
import usLogo from "@/assets/us-logo-new.png";

const fetchJobs = async (): Promise<JobPostListItem[]> => {
  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("job_posts")
    .select(`
      id, expert_id, source_url, job_title, company, location, remote_status,
      employment_type, industry, expert_note, status, created_at,
      expert:expert_profiles!job_posts_expert_id_fkey ( id, full_name, photo_url, job_title )
    `)
    .eq("status", "active")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
}

const JobBoard = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { role } = useUserRole(user?.id);

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [connectionExpert, setConnectionExpert] = useState<ExpertProfile | null>(null);

  const { data: jobs = [], isLoading } = useQuery({ queryKey: ["job-posts"], queryFn: fetchJobs });

  const { data: myExpertId } = useQuery({
    queryKey: ["my-expert-id", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("expert_profiles").select("id").eq("user_id", user.id).maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user,
  });

  const industries = INDUSTRY_OPTIONS;

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (typeFilter !== "all" && j.employment_type !== typeFilter) return false;
      if (industryFilter !== "all" && j.industry !== industryFilter) return false;
      if (locationFilter && !(j.location ?? "").toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (search) {
        const hay = `${j.job_title} ${j.company ?? ""} ${j.expert?.full_name ?? ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [jobs, search, locationFilter, typeFilter, industryFilter]);

  const canPost = role === "expert" || role === "admin";

  const openExpert = async (expertId: string) => {
    const { data, error } = await supabase
      .from("expert_profiles")
      .select("*")
      .eq("id", expertId)
      .maybeSingle();
    if (error || !data) {
      toast.error("Couldn't load expert profile.");
      return;
    }
    setSelectedExpert(data as ExpertProfile);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this job post?")) return;
    const { error } = await supabase.from("job_posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["job-posts"] });
    }
  };

  const canRequestConnection = role === "athlete";

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Job Board
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Opportunities shared by experts in our community
            </p>
          </div>
        </section>
        <section className="py-12 flex items-center justify-center">
          <Card className="max-w-md mx-4 shadow-xl">
            <CardContent className="pt-6 text-center space-y-4">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Sign In to View Jobs</h3>
                <p className="text-sm text-muted-foreground">
                  Create an account or sign in to explore opportunities shared by experts in our community
                </p>
              </div>
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-8 bg-gradient-to-b from-background to-muted">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Job Board</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Opportunities shared by experts in our community. Connect with the expert who posted to learn more.
              </p>
            </div>
            {canPost && (
              <Button onClick={() => navigate("/jobs/post")} className="self-start sm:self-auto">
                <Plus className="mr-1.5 h-4 w-4" /> Post a Job
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search title, company, expert"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Filter by location"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Employment Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger><SelectValue placeholder="Industry" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {(search || locationFilter || typeFilter !== "all" || industryFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-4"
              onClick={() => { setSearch(""); setLocationFilter(""); setTypeFilter("all"); setIndustryFilter("all"); }}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Clear filters
            </Button>
          )}

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {jobs.length === 0 && !search && !locationFilter && typeFilter === "all" && industryFilter === "all"
                ? "Job Board launching summer 2026"
                : "No jobs match these filters yet. Check back soon."}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isOwner={!!myExpertId && myExpertId === job.expert_id}
                  onExpertClick={openExpert}
                  onEdit={() => navigate(`/jobs/post?edit=${job.id}`)}
                  onDelete={() => handleDelete(job.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Expert card popup */}
      {selectedExpert && (
        <Dialog open={!!selectedExpert} onOpenChange={(o) => !o && setSelectedExpert(null)}>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center text-center gap-3">
              <Avatar className="h-20 w-20">
                <AvatarImage src={selectedExpert.photo_url ?? undefined} alt={selectedExpert.full_name} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials(selectedExpert.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{selectedExpert.full_name}</p>
                {selectedExpert.job_title && (
                  <p className="text-sm text-muted-foreground">{selectedExpert.job_title}</p>
                )}
                {selectedExpert.company_name && (
                  <p className="text-sm text-muted-foreground">{selectedExpert.company_name}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {(selectedExpert.industry ?? "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((ind) => (
                    <Badge key={ind} variant="secondary" className="text-xs">{ind}</Badge>
                  ))}
                {selectedExpert.ussa_affiliate && selectedExpert.ussa_affiliate !== "No formal affiliation" && (
                  <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                    <img src={usLogo} alt="" className="h-3.5 w-3.5 object-contain mr-1" />
                    {selectedExpert.ussa_affiliate}
                  </Badge>
                )}
              </div>
              {selectedExpert.bio && (
                <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-5 text-left">
                  {selectedExpert.bio}
                </p>
              )}
              {selectedExpert.linkedin_url && (
                <a
                  href={selectedExpert.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Linkedin className="h-4 w-4" /> LinkedIn Profile
                </a>
              )}
              <div className="w-full flex flex-col gap-2 pt-2">
                {canRequestConnection && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setConnectionExpert(selectedExpert);
                      setSelectedExpert(null);
                    }}
                  >
                    Request a Connection
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={() => setSelectedExpert(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {connectionExpert && user && (
        <ExpertConnectionRequestDialog
          expert={connectionExpert}
          userId={user.id}
          open={!!connectionExpert}
          onOpenChange={(o) => !o && setConnectionExpert(null)}
          onSuccess={() => setConnectionExpert(null)}
        />
      )}
    </div>
  );
};

export default JobBoard;
