import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Globe, User, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AI_LOADING_MESSAGES, useAiLoadingProgress } from "./aiLoadingProgress";
import { upsertAthleteProfile, upsertEmployerProfile, upsertExpertProfile } from "@/services/profileUpsertService";

interface AIProfilePopulatorProps {
  role: "athlete" | "employer" | "expert";
  userId: string;
  onComplete: () => void;
}

export const AIProfilePopulator = ({ role, userId, onComplete }: AIProfilePopulatorProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "loading" | "done">("input");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState(AI_LOADING_MESSAGES[0]);
  const [error, setError] = useState("");

  const isEmployer = role === "employer";
  const isExpert = role === "expert";
  const nameLabel = isEmployer ? "Company Name" : "Full Name";
  const namePlaceholder = isEmployer ? "Acme Corporation" : "Jane Smith";
  const urlLabel = isExpert ? "LinkedIn Profile URL" : isEmployer ? "Company Website" : "Instagram Profile URL";
  const urlPlaceholder = isExpert ? "https://linkedin.com/in/username" : isEmployer ? "https://www.example.com" : "https://www.instagram.com/username";

  useAiLoadingProgress({
    isLoadingStep: step === "loading",
    setLoadingMsg,
    setProgress,
  });

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

      if (isExpert) {
        await upsertExpertProfile(userId, profileData, name, url);
      } else if (isEmployer) {
        await upsertEmployerProfile(userId, profileData, url);
      } else {
        await upsertAthleteProfile(userId, profileData);
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
