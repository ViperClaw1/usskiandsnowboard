import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { JobCard, type JobPostListItem } from "@/components/jobs/JobCard";
import {
  EMPLOYMENT_TYPES,
  DEFAULT_INDUSTRIES,
  ARCHIVE_AFTER_DAYS,
} from "@/constants/jobBoard";

const fetchSettings = async () => {
  const { data } = await supabase.from("job_board_settings").select("*").eq("id", 1).maybeSingle();
  return data;
};

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

const JobBoard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole(user?.id);

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");

  const { data: settings } = useQuery({ queryKey: ["job-board-settings"], queryFn: fetchSettings });
  const { data: jobs = [], isLoading } = useQuery({ queryKey: ["job-posts"], queryFn: fetchJobs });

  const industries = (settings?.industries as string[] | undefined) ?? [...DEFAULT_INDUSTRIES];

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
                  onExpertClick={() => navigate("/experts")}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default JobBoard;
