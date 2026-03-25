import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { ExpertProfile } from "./ExpertDirectory";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

interface ExpertConnectionRequestDialogProps {
  expert: ExpertProfile;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ExpertConnectionRequestDialog = ({
  expert,
  userId,
  open,
  onOpenChange,
  onSuccess,
}: ExpertConnectionRequestDialogProps) => {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Get athlete profile id
      const { data: ap, error: apErr } = await supabase
        .from("athlete_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (apErr || !ap) throw new Error("Could not find your athlete profile.");

      // Insert connection request
      const { data: req, error: reqErr } = await supabase
        .from("expert_connection_requests")
        .insert({
          expert_id: expert.id,
          athlete_id: ap.id,
          initiated_by_user_id: userId,
          message: message.trim() || null,
          status: "pending",
        })
        .select("id")
        .single();

      if (reqErr) throw reqErr;

      // Trigger notification email
      await supabase.functions.invoke("send-expert-connection-notification", {
        body: { request_id: req.id },
      });

      toast.success("Connection request sent!");
      queryClient.invalidateQueries({ queryKey: ["expert-requests", userId] });
      setMessage("");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send request";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a Connection</DialogTitle>
          <DialogDescription>
            Send an introduction request to {expert.full_name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <Avatar className="h-12 w-12">
            <AvatarImage src={expert.photo_url ?? undefined} alt={expert.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(expert.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{expert.full_name}</p>
            {expert.job_title && (
              <p className="text-sm text-muted-foreground">{expert.job_title}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="learn-message">What are you hoping to learn? <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="learn-message"
            placeholder="Share a brief context note — 2–3 sentences about what you'd like to discuss or learn from this expert..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Sending..." : "Send Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
