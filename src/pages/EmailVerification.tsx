// ==============================
// Imports
// ==============================

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ==============================
// Component Definition
// Static confirmation screen shown after sign-up.
// Allows the user to resend the verification email.
// ==============================

export default function EmailVerification() {
  // ==============================
  // State & Hooks
  // ==============================
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const targetEmail = useMemo(() => {
    const fromState = typeof stateEmail === "string" ? stateEmail.trim().toLowerCase() : "";
    const fromStorage = (localStorage.getItem("pending_verification_email") || "").trim().toLowerCase();
    return fromState || fromStorage;
  }, [stateEmail]);

  const cooldownKey = useMemo(() => (targetEmail ? `auth:resend:${targetEmail}` : ""), [targetEmail]);

  useEffect(() => {
    if (!cooldownKey) return;
    const raw = localStorage.getItem(cooldownKey);
    const until = raw ? Number(raw) : 0;
    const now = Math.floor(Date.now() / 1000);
    const remaining = until > now ? until - now : 0;
    setCooldown(remaining);
  }, [cooldownKey]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // ==============================
  // Handlers
  // ==============================

  const handleResendEmail = async () => {
    if (!targetEmail) {
      toast({
        title: "Error",
        description: "No email found. Please sign in again.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (cooldown > 0) {
      toast({
        title: "Please wait",
        description: `You can resend again in ${cooldown}s.`,
      });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("send-verification-email", {
      body: {
        email: targetEmail,
        source: "resend",
        redirect_to: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);

    if (error || !data?.success) {
      let message = error?.message || data?.error || "Failed to send verification email.";
      let cooldownFromServer = Number(data?.cooldown_remaining || 0);
      try {
        if (error && typeof (error as any).context?.json === "function") {
          const body = await (error as any).context.json();
          message = body?.error || message;
          cooldownFromServer = Number(body?.cooldown_remaining || cooldownFromServer || 0);
        }
      } catch {
        // keep fallback message/cooldown
      }
      if (cooldownFromServer > 0) {
        const until = Math.floor(Date.now() / 1000) + cooldownFromServer;
        if (cooldownKey) localStorage.setItem(cooldownKey, String(until));
        setCooldown(cooldownFromServer);
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } else {
      setResent(true);
      const nextCooldown = Number(data?.cooldown_remaining || 90);
      const until = Math.floor(Date.now() / 1000) + nextCooldown;
      if (cooldownKey) localStorage.setItem(cooldownKey, String(until));
      setCooldown(nextCooldown);
      toast({
        title: "Email sent!",
        description: "Check your inbox for the verification link.",
      });
    }
  };

  // ==============================
  // Render
  // ==============================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="text-base">
            We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resent && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm">Verification email resent!</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email?
            </p>
            <Button
              onClick={handleResendEmail}
              disabled={loading || cooldown > 0 || !targetEmail}
              className="w-full"
              variant="outline"
            >
              {loading ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={() => navigate("/auth")}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to sign in
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Make sure to check your spam folder if you don't see the email in your inbox.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
