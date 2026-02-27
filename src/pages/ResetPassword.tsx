// ==============================
// Imports
// ==============================

import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";
import usSkiMobileLogo from "@/assets/us-ski-mobile-logo.png";

// ==============================
// Constants
// Password strength rules — defined outside component to prevent recreation
// ==============================

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At least one number", test: (p: string) => /\d/.test(p) },
  {
    label: "At least one special character",
    test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\\[\]/;'`~]/.test(p),
  },
];

// ==============================
// Component Definition
// Handles the password-reset step after the user clicks a reset/invite link.
// Verifies the OTP token before showing the form.
// ==============================

const ResetPassword = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isInvited = searchParams.get("invited") === "true";
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ==============================
  // Derived Values
  // ==============================
  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const allPasswordRulesPass = passwordRules.every((rule) => rule.test(password));
  const passwordsMatch = password === confirmPassword;
  const isFormValid = allPasswordRulesPass && passwordsMatch && confirmPassword !== "";

  // ==============================
  // Effects — Token Verification
  // Verifies the reset token before allowing the password form to render
  // ==============================
  useEffect(() => {
    const verifySession = async () => {
      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (error) {
          console.error("Token verification failed:", error);
          toast.error("Invalid or expired reset link");
          navigate("/auth");
        } else {
          setValidToken(true);
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setValidToken(true);
        } else {
          toast.error("Invalid or expired reset link");
          navigate("/auth");
        }
      }
      setVerifying(false);
    };
    verifySession();
  }, [navigate, tokenHash, type]);

  // ==============================
  // Handlers
  // ==============================

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("Password updated successfully!");
      if (isInvited) {
        localStorage.setItem("pending_ai_profile", "true");
        navigate("/dashboard");
      } else {
        navigate("/auth");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // Render — Guard
  // ==============================
  if (!validToken || verifying) return null;

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
            <CardTitle>Set New Password</CardTitle>
            <CardDescription>Enter your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* New password field */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => markTouched("password")}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {password.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {passwordRules.map((rule) => {
                      const passes = rule.test(password);
                      return (
                        <li key={rule.label} className="flex items-center gap-2 text-sm">
                          {passes ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className={passes ? "text-green-600" : "text-muted-foreground"}>
                            {rule.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Confirm password field */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => markTouched("confirmPassword")}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {touched.confirmPassword && confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-destructive">Passwords do not match.</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading || !isFormValid}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/auth">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
