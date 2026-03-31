import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Globe, User, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIProfilePopulatorProps {
  role: "athlete" | "employer" | "expert";
  userId: string;
  onComplete: () => void;
}

const LOADING_MESSAGES = [
  "Scanning website...",
  "Reading page content...",
  "Extracting profile details...",
  "Analyzing with AI...",
  "Polishing your profile...",
  "Almost done...",
];

export const AIProfilePopulator = ({ role, userId, onComplete }: AIProfilePopulatorProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "loading" | "done">("input");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState("");

  const isEmployer = role === "employer";
  const isExpert = role === "expert";
  const nameLabel = isEmployer ? "Company Name" : "Full Name";
  const namePlaceholder = isEmployer ? "Acme Corporation" : "Jane Smith";
  const urlLabel = isExpert ? "LinkedIn Profile URL" : isEmployer ? "Company Website" : "Instagram Profile URL";
  const urlPlaceholder = isExpert ? "https://linkedin.com/in/username" : isEmployer ? "https://www.example.com" : "https://www.instagram.com/username";

  // Animate loading messages and progress
  useEffect(() => {
    if (step !== "loading") return;
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = Math.min(msgIndex + 1, LOADING_MESSAGES.length - 1);
      setLoadingMsg(LOADING_MESSAGES[msgIndex]);
    }, 3000);

    const progInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 90));
    }, 500);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
    };
  }, [step]);

  // Prefill name from existing profile data when dialog opens.
  useEffect(() => {
    if (!open || step !== "input") return;

    let isMounted = true;
    const loadDefaultName = async () => {
      try {
        if (isEmployer) {
          const { data } = await supabase
            .from("employer_profiles")
            .select("company_name")
            .eq("user_id", userId)
            .maybeSingle();
          if (isMounted && data?.company_name) setName(data.company_name);
          return;
        }

        if (isExpert) {
          const { data } = await supabase
            .from("expert_profiles")
            .select("full_name")
            .eq("user_id", userId)
            .maybeSingle();
          if (isMounted && data?.full_name) setName(data.full_name);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();
        if (isMounted && data?.full_name) setName(data.full_name);
      } catch {
        // Silent fallback: keep manual entry/placeholder behavior if lookup fails.
      }
    };

    void loadDefaultName();
    return () => {
      isMounted = false;
    };
  }, [open, step, userId, isEmployer, isExpert]);

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim()) {
      setError("Please fill in both fields.");
      return;
    }
    setError("");
    setStep("loading");
    setProgress(5);

    try {
      // Call edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-populate-profile", {
        body: { role, url: url.trim(), name: name.trim() },
      });

      if (fnError) throw new Error(fnError.message || "Failed to process");
      if (!fnData?.success || !fnData?.data) {
        throw new Error(fnData?.error || "AI could not extract profile data");
      }

      const profileData = fnData.data;
      setProgress(92);

      // Upsert profile data
      if (isExpert) {
        // Expert profile upsert
        const { data: existing } = await supabase
          .from("expert_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const expertFields = {
          full_name: profileData.full_name || name.trim(),
          job_title: profileData.job_title || null,
          area_of_expertise: profileData.area_of_expertise || null,
          bio: profileData.bio || null,
          photo_url: profileData.photo_url || null,
          linkedin_url: profileData.linkedin_url || url.trim(),
        };

        if (existing) {
          const { error: updateErr } = await supabase
            .from("expert_profiles")
            .update(expertFields)
            .eq("user_id", userId);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from("expert_profiles")
            .insert({ user_id: userId, ...expertFields });
          if (insertErr) throw insertErr;
        }
      } else if (isEmployer) {
        // Check if employer profile exists first
        const { data: existing } = await supabase
          .from("employer_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const employerFields = {
          company_name: profileData.company_name,
          industry: profileData.industry || null,
          company_size: profileData.company_size || null,
          hq_location: profileData.hq_location || null,
          about: profileData.about || null,
          website: profileData.website || url.trim(),
          logo_url: profileData.logo_url || null,
          linkedin_url: profileData.linkedin_url || null,
          contact_person: profileData.contact_person || null,
          contact_email: profileData.contact_email || null,
          contact_title: profileData.contact_title || null,
          phone: profileData.phone || null,
          opportunities_offered: profileData.opportunities_offered || null,
          connection_to_ussa: profileData.connection_to_ussa || null,
          job_board_url: profileData.job_board_url || null,
        };

        if (existing) {
          const { error: updateErr } = await supabase
            .from("employer_profiles")
            .update(employerFields)
            .eq("user_id", userId);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from("employer_profiles")
            .insert({ user_id: userId, ...employerFields });
          if (insertErr) throw insertErr;
        }
      } else {
        // Update profiles table with name
        if (profileData.first_name || profileData.last_name) {
          await supabase
            .from("profiles")
            .update({
              first_name: profileData.first_name || null,
              last_name: profileData.last_name || null,
            })
            .eq("id", userId);
        }

        // Check if athlete profile exists
        const { data: existing } = await supabase.from("athlete_profiles").select("id").eq("user_id", userId).maybeSingle();

        const athleteFields = {
          sport_discipline: profileData.sport_discipline || null,
          bio: profileData.bio || null,
          career_interests: profileData.career_interests || [],
          skills: profileData.skills || [],
          availability: profileData.availability || null,
          affiliation: ["Current Team Member", "Former Team Member"].includes(profileData.affiliation) ? profileData.affiliation : "Current Team Member",
          home_mountain: profileData.home_mountain || null,
          photo_url: profileData.photo_url || null,
          instagram_url: profileData.instagram_url || null,
          sponsors: profileData.sponsors || [],
          professional_highlights: profileData.professional_highlights || null,
          is_public: true,
        };

        // Calculate real completeness based on filled fields
        const completenessFields = Object.values(athleteFields).filter((_, i) => i < 12); // exclude is_public
        const filledCount = completenessFields.filter(v =>
          v !== null && v !== undefined && v !== "" &&
          !(Array.isArray(v) && v.length === 0)
        ).length;
        const completeness = Math.round((filledCount / completenessFields.length) * 100);
        (athleteFields as any).profile_completeness = completeness;

        if (existing) {
          const { error: updateErr } = await supabase
            .from("athlete_profiles")
            .update(athleteFields)
            .eq("user_id", userId);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from("athlete_profiles")
            .insert({ user_id: userId, ...athleteFields });
          if (insertErr) throw insertErr;
        }
      }

      setProgress(100);
      setStep("done");
      toast.success("Profile auto-populated successfully!");

      // Small delay then close
      setTimeout(() => {
        setOpen(false);
        setStep("input");
        setProgress(0);
        setName("");
        setUrl("");
        onComplete();
      }, 1500);
    } catch (err: unknown) {
      console.error("AI populate error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setStep("input");
      setProgress(0);
      toast.error(message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setStep("input");
          setError("");
          setProgress(0);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-0 h-auto text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Complete with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {step === "input" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Auto-fill Profile with AI
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {isEmployer
                ? "Enter your company details and we'll extract your profile info from your website."
                : "Enter your name and LinkedIn URL and we'll build your profile automatically."}
            </p>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="ai-name">
                  <User className="inline h-3.5 w-3.5 mr-1" />
                  {nameLabel}
                </Label>
                <Input
                  id="ai-name"
                  placeholder={namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-url">
                  <Globe className="inline h-3.5 w-3.5 mr-1" />
                  {urlLabel}
                </Label>
                <Input
                  id="ai-url"
                  type="url"
                  placeholder={urlPlaceholder}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={handleSubmit}>
                <Sparkles className="mr-2 h-4 w-4" />
                Auto-fill my profile
              </Button>
            </div>
          </>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Sparkles className="h-8 w-8 text-primary animate-spin" style={{ animationDuration: "3s" }} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Building your profile</h3>
              <p className="text-sm text-muted-foreground animate-pulse">{loadingMsg}</p>
            </div>
            <div className="w-full max-w-xs space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}%</p>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Our AI is scanning the website and extracting relevant information to build your complete profile.
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Profile Complete!</h3>
              <p className="text-sm text-muted-foreground">Your profile has been auto-filled successfully.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
