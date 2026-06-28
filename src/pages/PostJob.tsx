import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { EMPLOYMENT_TYPES, REMOTE_STATUSES } from "@/constants/jobBoard";
import { INDUSTRY_OPTIONS } from "@/data/suggestions";

const PostJob = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const { user } = useAuth();
  const { role } = useUserRole(user?.id);

  const [step, setStep] = useState<"url" | "details">(editId ? "details" : "url");
  const [url, setUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  const [form, setForm] = useState({
    job_title: "",
    company: "",
    location: "",
    remote_status: "" as string,
    employment_type: "" as string,
    industry: "" as string,
    expert_note: "",
  });

  const industries = INDUSTRY_OPTIONS;

  useEffect(() => {
    if (!user) return;
    if (role && role !== "expert" && role !== "admin") {
      toast.error("Only experts can post jobs.");
      navigate("/jobs");
    }
  }, [user, role, navigate]);

  // Load existing post for edit mode and verify ownership
  useEffect(() => {
    if (!editId || !user) return;
    (async () => {
      const { data: post, error } = await supabase
        .from("job_posts")
        .select("*")
        .eq("id", editId)
        .maybeSingle();
      if (error || !post) {
        toast.error("Couldn't load post.");
        navigate("/jobs");
        return;
      }
      const { data: ep } = await supabase
        .from("expert_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!ep || ep.id !== post.expert_id) {
        toast.error("You can only edit your own posts.");
        navigate("/jobs");
        return;
      }
      setUrl(post.source_url);
      setForm({
        job_title: post.job_title ?? "",
        company: post.company ?? "",
        location: post.location ?? "",
        remote_status: post.remote_status ?? "",
        employment_type: post.employment_type ?? "",
        industry: post.industry ?? "",
        expert_note: post.expert_note ?? "",
      });
      setLoadingEdit(false);
    })();
  }, [editId, user, navigate]);

  const handleParse = async () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error("Enter a valid URL starting with http(s)://");
      return;
    }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-job-url", {
        body: { url: url.trim(), industries },
      });
      if (error) throw error;
      const parsed = data?.parsed ?? {};
      setForm((f) => ({
        ...f,
        job_title: parsed.job_title || f.job_title,
        company: parsed.company || f.company,
        location: parsed.location || f.location,
        remote_status: parsed.remote_status || f.remote_status,
        employment_type: parsed.employment_type || f.employment_type,
        industry: parsed.industry || f.industry,
      }));
      if (data?.parse_status === "blocked") {
        toast.warning("Couldn't read the page automatically. Please fill in the details below.");
      } else {
        toast.success("Parsed! Review and edit before publishing.");
      }
    } catch (e: any) {
      console.error(e);
      toast.warning("Couldn't auto-fill. Please enter details manually.");
    } finally {
      setParsing(false);
      setStep("details");
    }
  };

  const handleSkipToManual = () => {
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error("Enter a valid URL starting with http(s)://");
      return;
    }
    setStep("details");
  };

  const handlePublish = async () => {
    if (!user) return;
    if (!form.job_title.trim() || !form.employment_type || !form.industry) {
      toast.error("Job title, employment type, and industry are required.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        source_url: url.trim(),
        job_title: form.job_title.trim(),
        company: form.company.trim() || null,
        location: form.location.trim() || null,
        remote_status: (form.remote_status || null) as any,
        employment_type: form.employment_type || null,
        industry: form.industry || null,
        expert_note: form.expert_note.trim() || null,
      };

      if (editId) {
        const { error } = await supabase.from("job_posts").update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("Job updated!");
      } else {
        const { data: expertProfile, error: expertErr } = await supabase
          .from("expert_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (expertErr) throw expertErr;
        if (!expertProfile) {
          toast.error("Complete your expert profile before posting.");
          setSubmitting(false);
          return;
        }
        const { error } = await supabase.from("job_posts").insert({
          ...payload,
          expert_id: expertProfile.id,
          status: "active",
        });
        if (error) {
          if (error.code === "23505") {
            toast.error("You've already posted this job URL.");
          } else {
            throw error;
          }
          return;
        }
        toast.success("Job posted!");
      }
      navigate("/jobs");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Failed to publish job.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Job Board
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{editId ? "Edit Job Post" : "Post a Job"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "url" && !editId ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="job-url">Job posting URL</Label>
                  <Input
                    id="job-url"
                    type="url"
                    placeholder="https://company.com/jobs/123"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste any public job URL. We'll try to auto-fill the details.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleParse} disabled={parsing} className="flex-1">
                    {parsing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                    Auto-fill details
                  </Button>
                  <Button variant="outline" onClick={handleSkipToManual} disabled={parsing}>
                    Enter manually
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Source URL</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-title">Job title *</Label>
                  <Input id="job-title" value={form.job_title}
                    onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="e.g. Denver, CO" value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Remote</Label>
                    <Select value={form.remote_status} onValueChange={(v) => setForm({ ...form, remote_status: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {REMOTE_STATUSES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Industry *</Label>
                    <Select value={form.industry} onValueChange={(v) => setForm({ ...form, industry: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Why you're sharing it (optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="A short note for athletes browsing this role."
                    rows={3}
                    value={form.expert_note}
                    onChange={(e) => setForm({ ...form, expert_note: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  {!editId && (
                    <Button variant="outline" onClick={() => setStep("url")}>Back</Button>
                  )}
                  {editId && (
                    <Button
                      variant="destructive"
                      disabled={submitting}
                      onClick={async () => {
                        if (!confirm("Delete this job post? This cannot be undone.")) return;
                        setSubmitting(true);
                        const { error } = await supabase.from("job_posts").delete().eq("id", editId);
                        setSubmitting(false);
                        if (error) {
                          toast.error("Failed to delete post.");
                        } else {
                          toast.success("Job post deleted.");
                          navigate("/jobs");
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}
                  <Button onClick={handlePublish} disabled={submitting}>
                    {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    {editId ? "Save changes" : "Publish"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostJob;
