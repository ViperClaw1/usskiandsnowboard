// ==============================
// Imports
// ==============================

import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";
import usSkiMobileLogo from "@/assets/us-ski-mobile-logo.png";

// ==============================
// Utilities
// Standalone validators — defined outside the component to avoid recreation on each render
// ==============================

const validateEmail = (value: string): string => {
  if (!value.trim()) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return "Please enter a valid email address";
  return "";
};

// ==============================
// Component Definition
// Handles the "forgot password" request flow.
// One-shot mutation — no caching needed.
// ==============================

const ForgotPassword = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState("");

  // ==============================
  // Handlers
  // ==============================

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success("Password reset link sent!", {
        description: `Check your email at ${email} for the reset link`,
        duration: 6000,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // Render
  // ==============================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link to="/">
            <img src={usSkiMobileLogo} alt="U.S. Ski & Snowboard" className="h-12 hover:opacity-80 transition-opacity md:hidden" />
            <img src={usSkiLogo} alt="U.S. Ski & Snowboard" className="h-16 hover:opacity-80 transition-opacity hidden md:block" />
          </Link>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    We've sent a password reset link to <strong>{email}</strong>.
                    Click the link in the email to reset your password.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link to="/auth">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailTouched) {
                        setEmailError(validateEmail(e.target.value));
                      }
                    }}
                    onBlur={() => {
                      setEmailTouched(true);
                      setEmailError(validateEmail(email));
                    }}
                    className={emailTouched && emailError ? "border-destructive" : ""}
                    required
                  />
                  {emailTouched && emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || (emailTouched && !!emailError) || !email.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/auth">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
