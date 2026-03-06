// ==============================
// Imports
// ==============================

import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Globe,
  Instagram,
} from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";
import usSkiMobileLogo from "@/assets/us-ski-mobile-logo.png";

// ==============================
// Utilities
// ==============================

const mapAuthError = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "Incorrect email or password. Please try again.";
  if (lower.includes("user already registered")) return "An account with this email already exists.";
  if (lower.includes("email not confirmed")) return "EMAIL_NOT_CONFIRMED";
  if (lower.includes("signup requires a valid password")) return "Please enter a valid password.";
  return message;
};

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "At least one number", test: (p: string) => /\d/.test(p) },
  { label: "At least one special character", test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\\[\]/;'`~]/.test(p) },
];

/**
 * Returns true if the user account was created within the last 60 seconds.
 * Used to detect brand-new OAuth sign-ups that should be blocked.
 */
const isNewOAuthUser = (createdAt: string): boolean => {
  const createdMs = new Date(createdAt).getTime();
  const nowMs = Date.now();
  return nowMs - createdMs < 60_000;
};

// ==============================
// Types
// Step machine: landing → invite-code | signup-no-code → profile-data → (submit to waitlist)
// OR:           landing → invite-code (confirmed) → signup (normal flow with invite code)
// OR:           landing → sign-in
// ==============================
type AuthStep = "landing" | "sign-in" | "invite-code" | "signup-with-code" | "signup-no-code" | "profile-data";

// ==============================
// Stable sub-components (module-level to prevent remount on parent re-render)
// ==============================

const LogoHeader = ({ title, description }: { title: string; description: string }) => (
  <CardHeader className="space-y-4 pb-8">
    <div className="flex justify-center mb-2">
      <Link to="/" className="hover:opacity-80 transition-opacity">
        <img
          src={usSkiLogo}
          alt="U.S. Ski & Snowboard"
          className="h-16 object-contain hidden sm:block"
          fetchPriority="high"
        />
        <img
          src={usSkiMobileLogo}
          alt="U.S. Ski & Snowboard"
          className="h-12 object-contain sm:hidden"
          fetchPriority="high"
        />
      </Link>
    </div>
    <div className="space-y-2 text-center">
      <CardTitle className="text-2xl font-bold text-foreground">{title}</CardTitle>
      <CardDescription className="text-muted-foreground">{description}</CardDescription>
    </div>
  </CardHeader>
);

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
  >
    <ArrowLeft className="h-3.5 w-3.5" /> Back
  </button>
);

// ==============================
// Component
// ==============================

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const typeParam = searchParams.get("type");
  const initialType = typeParam === "athlete" || typeParam === "employer" ? typeParam : null;

  // ---- Step machine ----
  const [step, setStep] = useState<AuthStep>("landing");

  // ---- Shared form state ----
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [userType, setUserType] = useState<"athlete" | "employer">(initialType || "athlete");
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [formError, setFormError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [oauthRedirectError, setOauthRedirectError] = useState<string | null>(null);

  // ---- Invite code step ----
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteCodeError, setInviteCodeError] = useState("");
  const [inviteCodeTouched, setInviteCodeTouched] = useState(false);

  // ---- Profile data (waitlist) ----
  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  // ==============================
  // Derived
  // ==============================
  const markTouched = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const allPasswordRulesPass = passwordRules.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword;

  const isSignUp = step === "signup-with-code" || step === "signup-no-code";

  const fieldErrors = {
    fullName: isSignUp && touched.fullName && !fullName.trim() ? "Full name is required." : "",
    email:
      touched.email && !email.trim()
        ? "Email is required."
        : touched.email && !isValidEmail(email)
          ? "Please enter a valid email address."
          : "",
    password: touched.password && !password ? "Password is required." : "",
    confirmPassword:
      isSignUp && touched.confirmPassword && !confirmPassword
        ? "Please confirm your password."
        : isSignUp && touched.confirmPassword && !passwordsMatch
          ? "Passwords do not match."
          : "",
    inviteCode:
      step === "signup-with-code" && touched.inviteCode && !inviteCode.trim() ? "Invite code is required." : "",
  };

  const isSignUpFormValid =
    fullName.trim() !== "" &&
    email.trim() !== "" &&
    isValidEmail(email) &&
    allPasswordRulesPass &&
    passwordsMatch &&
    confirmPassword !== "" &&
    (step === "signup-no-code" || inviteCode.trim() !== "");
  const isSignInFormValid = email.trim() !== "" && password !== "";
  const isSubmitDisabled = loading || (isSignUp ? !isSignUpFormValid : !isSignInFormValid);

  // ==============================
  // Effects
  // ==============================

  useEffect(() => {
    setFormError("");
  }, [email, password, confirmPassword, fullName, inviteCode, step]);
  useEffect(() => {
    setTouched({});
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Handle OAuth error redirects: read from the real URL so we're not dependent on
  // React Router's location (which can be stale on full-page redirect).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = window.location.search || (window.location.hash ? window.location.hash.slice(1) : "");
    const params = new URLSearchParams(search);
    const errorDescription = params.get("error_description");
    const error = params.get("error");
    if (!errorDescription && !error) return;

    const msg = (errorDescription || error || "").trim();
    const lower = msg.toLowerCase();
    const isOAuthBlock =
      error === "access_denied" ||
      error === "server_error" ||
      lower.includes("oauth") ||
      lower.includes("google") ||
      lower.includes("apple") ||
      lower.includes("sign-up via") ||
      lower.includes("invite") ||
      lower.includes("vendor") ||
      lower.includes("failed to sign in");
    const friendlyMessage = isOAuthBlock
      ? "Sign-up via Google or Apple is not available. Please use an invite code or apply via the waitlist."
      : msg || "Sign-up via Google or Apple is not available. Please use an invite code or apply via the waitlist.";

    setOauthRedirectError(friendlyMessage);
    setStep("landing");
    setOauthLoading(null);
    setTimeout(() => toast.error(friendlyMessage, { duration: 6000 }), 0);
    // Intentionally run only on mount: read real URL so we see params after full-page OAuth redirect
  }, []);

  // Clean the URL after we've shown the error (deferred so the message state is committed first)
  useEffect(() => {
    if (!oauthRedirectError) return;
    const t = setTimeout(() => {
      if (typeof window !== "undefined") window.history.replaceState({}, "", window.location.pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [oauthRedirectError]);

  useEffect(() => {
    if (step !== "landing") setOauthRedirectError(null);
  }, [step]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return;

      const user = session.user;

      // Secondary safety net: if somehow an OAuth user got through without a role, block them.
      const isOAuthProvider = user.app_metadata?.provider && user.app_metadata.provider !== "email";
      if (event === "SIGNED_IN" && isOAuthProvider) {
        const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();

        if (!roleRow) {
          await supabase.auth.signOut();
          setOauthLoading(null);
          toast.error(
            "Sign-up via Google or Apple is not available. Please use an invite code or apply via the waitlist.",
            { duration: 6000 },
          );
          setStep("landing");
          return;
        }
      }

      // Existing approved user — navigate normally.
      navigate("/dashboard");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/dashboard");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // ==============================
  // Handlers
  // ==============================

  const handleResendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Verification email sent! Check your inbox.");
      setResendCooldown(60);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email.");
    }
  };

  const handleInviteCodeConfirm = () => {
    setInviteCodeTouched(true);
    if (!inviteCodeInput.trim()) {
      setInviteCodeError("Please enter your invite code.");
      return;
    }
    if (inviteCodeInput.trim().toUpperCase() !== "GOBIG25") {
      setInviteCodeError("Invalid invite code. Please check and try again.");
      return;
    }
    setInviteCodeError("");
    setInviteCode(inviteCodeInput.trim().toUpperCase());
    setStep("signup-with-code");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!allPasswordRulesPass) {
      setFormError("Please meet all password requirements.");
      return;
    }
    if (!passwordsMatch) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (step === "signup-with-code") {
        const validInviteCode = "GOBIG25";
        if (inviteCode.trim().toLowerCase() !== validInviteCode.toLowerCase()) {
          setFormError("Invalid invite code.");
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, user_type: userType },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      if (data.user?.identities?.length === 0) {
        setFormError("An account with this email already exists. Try signing in instead.");
        setLoading(false);
        return;
      }

      toast.success("Account created! Please check your email to verify your account.");
      navigate("/email-verification");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setInviteCode("");
    } catch (error: any) {
      setFormError(mapAuthError(error.message || "Failed to create account"));
    } finally {
      setLoading(false);
    }
  };

  // Step 3 → 4: collect form data and advance to profile-data step (no account created yet)
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!allPasswordRulesPass) {
      setFormError("Please meet all password requirements.");
      return;
    }
    if (!passwordsMatch) {
      setFormError("Passwords do not match.");
      return;
    }
    // Store basic info for waitlist submission
    setProfileData({ full_name: fullName, email, user_type: userType });
    setStep("profile-data");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in successfully!");
    } catch (error: any) {
      const mapped = mapAuthError(error.message || "Failed to sign in");
      setFormError(mapped === "EMAIL_NOT_CONFIRMED" ? "EMAIL_NOT_CONFIRMED" : mapped);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      // Important: the before_user_created hook can block OAuth sign-ups and Supabase
      // redirects back with `error` / `error_description` query params.
      // We need those params to land on this page so the toast handler above can show them.
      const redirectUri = `${window.location.origin}/auth`;
      const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectUri });
      if (error) throw error;
      // On success the browser will redirect; oauthLoading stays set until
      // onAuthStateChange resolves (new user → cleared there, existing user → navigates away).
    } catch (error: any) {
      toast.error(error.message || `Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
  };

  const handleRequestAccess = async (additionalProfileData: Record<string, any>) => {
    setWaitlistSubmitting(true);
    // Strip password from profile_data — it should never be persisted
    const { password: _pw, ...cleanProfileData } = additionalProfileData;
    try {
      const { error } = await supabase.functions.invoke("submit-waitlist-application", {
        body: {
          email: profileData.email,
          full_name: profileData.full_name,
          user_type: profileData.user_type,
          profile_data: cleanProfileData,
        },
      });
      if (error) {
        // FunctionsHttpError: try multiple ways to get the actual JSON body
        let errMsg = error.message || "";
        try {
          // Method 1: context is a Response object
          if (typeof (error as any).context?.json === "function") {
            const body = await (error as any).context.json();
            errMsg = body?.error || errMsg;
            // Method 2: context is already parsed
          } else if ((error as any).context?.error) {
            errMsg = (error as any).context.error;
            // Method 3: message contains the JSON string
          } else if (error.message?.includes("{")) {
            const match = error.message.match(/\{.*\}/s);
            if (match) {
              const body = JSON.parse(match[0]);
              errMsg = body?.error || errMsg;
            }
          }
        } catch {
          // fall back to error.message
        }
        if (errMsg.includes("already pending") || errMsg.includes("pending review")) {
          toast.info("You already have a pending application. We'll be in touch!");
          navigate("/waitlist");
          return;
        }
        if (errMsg.includes("approved account") || errMsg.includes("already has an approved")) {
          toast.info("You already have an account. Please sign in.");
          setStep("sign-in");
          return;
        }
        throw new Error(errMsg || "Failed to submit application.");
      }
      navigate("/waitlist");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application. Please try again.");
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  // ==============================
  // STEP: landing
  // ==============================
  if (step === "landing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md shadow-2xl border-border/50">
          <LogoHeader title="Welcome" description="U.S. Ski & Snowboard — Athlete Connection Platform" />
          <CardContent className="space-y-4">
            {oauthRedirectError && (
              <Alert variant="destructive" className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <AlertDescription>{oauthRedirectError}</AlertDescription>
              </Alert>
            )}
            <Button className="w-full h-12 text-base" onClick={() => setStep("sign-in")}>
              Sign In
            </Button>
            <Button variant="outline" className="w-full h-12 text-base" onClick={() => setStep("invite-code")}>
              Join the Platform
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==============================
  // STEP: invite-code
  // ==============================
  if (step === "invite-code") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md shadow-2xl border-border/50">
          <LogoHeader title="Please, enter your invite code" description="Enter your 7-digit invite code" />
          <CardContent className="space-y-6">
            <BackButton onClick={() => setStep("landing")} />

            <div className="space-y-2">
              <Label htmlFor="inviteCodeInput">Invite Code</Label>
              <Input
                id="inviteCodeInput"
                type="text"
                placeholder="e.g. GOBIG25"
                value={inviteCodeInput}
                onChange={(e) => {
                  setInviteCodeInput(e.target.value.toUpperCase());
                  if (inviteCodeTouched) setInviteCodeError("");
                }}
                onBlur={() => setInviteCodeTouched(true)}
                maxLength={10}
                className="text-center tracking-widest text-lg font-mono uppercase"
              />
              {inviteCodeTouched && inviteCodeError && <p className="text-sm text-destructive">{inviteCodeError}</p>}
            </div>

            <div className="space-y-3">
              <Button className="w-full" onClick={handleInviteCodeConfirm}>
                Confirm
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setStep("signup-no-code")}
              >
                Don't have an invite code?
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==============================
  // STEP: profile-data (waitlist profile collection)
  // ==============================
  if (step === "profile-data") {
    return (
      <WaitlistProfileStep
        fullName={profileData.full_name || ""}
        userType={profileData.user_type as "athlete" | "employer"}
        onBack={() => setStep("signup-no-code")}
        onRequestAccess={handleRequestAccess}
        isSubmitting={waitlistSubmitting}
      />
    );
  }

  // ==============================
  // STEP: sign-in / signup-with-code / signup-no-code
  // ==============================
  const isSignUpStep = step === "signup-with-code" || step === "signup-no-code";
  const isNoCodeSignup = step === "signup-no-code";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <LogoHeader
          title={isSignUpStep ? "Create Account" : "Welcome Back"}
          description={isSignUpStep ? "Join the U.S. Ski & Snowboard community" : "Sign in to access your dashboard"}
        />

        <CardContent className="space-y-6">
          <BackButton
            onClick={() =>
              setStep(
                step === "signup-with-code" ? "invite-code" : step === "signup-no-code" ? "invite-code" : "landing",
              )
            }
          />

          {/* Inline error alert */}
          {formError && formError !== "EMAIL_NOT_CONFIRMED" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {formError === "EMAIL_NOT_CONFIRMED" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>Your email address has not been verified. Please check your inbox.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification email"}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* SSO buttons — sign-in only */}
          {step === "sign-in" && (
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 relative"
                onClick={() => handleOAuthLogin("google")}
                disabled={loading || oauthLoading !== null}
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>
              <Button
                type="button"
                className="w-full h-11 bg-black text-white hover:bg-black/90"
                onClick={() => handleOAuthLogin("apple")}
                disabled={loading || oauthLoading !== null}
              >
                {oauthLoading === "apple" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                )}
                Continue with Apple
              </Button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>
            </div>
          )}

          {/* Role selector — signup only */}
          {isSignUpStep && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={userType === "athlete" ? "default" : "outline"}
                onClick={() => setUserType("athlete")}
                className="w-full"
              >
                Athlete
              </Button>
              <Button
                type="button"
                variant={userType === "employer" ? "default" : "outline"}
                onClick={() => setUserType("employer")}
                className="w-full"
              >
                Partner
              </Button>
            </div>
          )}

          <form
            onSubmit={isSignUpStep ? (isNoCodeSignup ? handleNextStep : handleSignUp) : handleSignIn}
            className="space-y-4"
            noValidate
          >
            {isSignUpStep && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => markTouched("fullName")}
                  disabled={loading}
                />
                {fieldErrors.fullName && <p className="text-sm text-destructive">{fieldErrors.fullName}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched("email")}
                disabled={loading}
              />
              {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => markTouched("password")}
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}

              {isSignUpStep && password.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {passwordRules.map((rule) => {
                    const passes = rule.test(password);
                    return (
                      <li key={rule.label} className="flex items-center gap-2 text-sm">
                        {passes ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className={passes ? "text-primary" : "text-muted-foreground"}>{rule.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {isSignUpStep && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => markTouched("confirmPassword")}
                  disabled={loading}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Invite code field — only for signup-with-code step */}
            {step === "signup-with-code" && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onBlur={() => markTouched("inviteCode")}
                  disabled={loading}
                />
                {fieldErrors.inviteCode && <p className="text-sm text-destructive">{fieldErrors.inviteCode}</p>}
              </div>
            )}

            {step === "sign-in" && (
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUpStep ? (isNoCodeSignup ? "Processing..." : "Creating account...") : "Signing in..."}
                </>
              ) : isSignUpStep ? (
                isNoCodeSignup ? (
                  "Next Step"
                ) : (
                  "Create Account"
                )
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            {isSignUpStep ? (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setStep("sign-in")}
                  className="text-primary hover:underline font-medium"
                  disabled={loading}
                >
                  Sign in
                </button>
              </p>
            ) : step === "sign-in" ? (
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setStep("invite-code")}
                  className="text-primary hover:underline font-medium"
                  disabled={loading}
                >
                  Join the Platform
                </button>
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==============================
// WaitlistProfileStep — Step 4: profile data collection before waitlist submission
// ==============================

interface WaitlistProfileStepProps {
  userType: "athlete" | "employer";
  fullName: string;
  onBack: () => void;
  onRequestAccess: (profileData: Record<string, any>) => void;
  isSubmitting: boolean;
}

const AI_LOADING_MESSAGES = [
  "Scanning website...",
  "Reading page content...",
  "Extracting profile details...",
  "Analyzing with AI...",
  "Polishing your profile...",
  "Almost done...",
];

const WaitlistProfileStep = ({
  userType,
  fullName,
  onBack,
  onRequestAccess,
  isSubmitting,
}: WaitlistProfileStepProps) => {
  const [mode, setMode] = useState<"choice" | "manual" | "ai" | "ai-loading">("choice");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [aiUrl, setAiUrl] = useState("");
  const [aiLinkedin, setAiLinkedin] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLoadingMsg, setAiLoadingMsg] = useState(AI_LOADING_MESSAGES[0]);

  const athleteWelcome = {
    header: "Welcome, Athlete!",
    body: "You're one step away from connecting with top employers. Tell us about yourself to complete your profile.",
  };
  const partnerWelcome = {
    header: "Welcome, Partner!",
    body: "You're one step away from discovering top athletes. Share your company details to complete your profile.",
  };

  const welcome = userType === "athlete" ? athleteWelcome : partnerWelcome;

  const updateField = (key: string, value: any) => setFormData((prev) => ({ ...prev, [key]: value }));

  // AI mode — collect URL(s) then fire edge function
  const handleAiSubmit = async () => {
    if (!aiUrl.trim()) {
      setAiError("Please enter a URL.");
      return;
    }
    setAiError("");
    setMode("ai-loading");
    setAiProgress(5);

    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = Math.min(msgIndex + 1, AI_LOADING_MESSAGES.length - 1);
      setAiLoadingMsg(AI_LOADING_MESSAGES[msgIndex]);
    }, 3000);
    const progInterval = setInterval(() => {
      setAiProgress((prev) => Math.min(prev + 2, 90));
    }, 500);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-populate-profile", {
        body: { role: userType, url: aiUrl.trim(), name: fullName },
      });
      clearInterval(msgInterval);
      clearInterval(progInterval);
      if (fnError || !fnData?.success) throw new Error(fnData?.error || fnError?.message || "AI extraction failed");
      const merged = { ...fnData.data, ...(userType === "employer" && aiLinkedin ? { linkedin_url: aiLinkedin } : {}) };
      setAiProgress(100);
      await new Promise((r) => setTimeout(r, 600));
      onRequestAccess(merged);
    } catch (err: unknown) {
      clearInterval(msgInterval);
      clearInterval(progInterval);
      setAiError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setMode("ai");
      setAiProgress(0);
    }
  };

  if (mode === "choice") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-lg shadow-2xl border-border/50">
          <CardHeader className="space-y-4 pb-6">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold">{welcome.header}</CardTitle>
              <CardDescription>{welcome.body}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">How would you like to complete your profile?</p>
            <Button className="w-full h-12" onClick={() => setMode("ai")}>
              <Sparkles className="mr-2 h-4 w-4" /> Complete with AI
            </Button>
            <Button variant="outline" className="w-full h-12" onClick={() => setMode("manual")}>
              Complete Manually
            </Button>
            <Button
              variant="ghost"
              className="w-full h-10 text-muted-foreground text-sm"
              onClick={() => onRequestAccess({ ai_populate: true })}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Skip for now"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "ai" || mode === "ai-loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md shadow-2xl border-border/50">
          {mode === "ai-loading" ? (
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <Sparkles className="h-8 w-8 text-primary animate-spin" style={{ animationDuration: "3s" }} />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold">Building your profile</h3>
                <p className="text-sm text-muted-foreground animate-pulse">{aiLoadingMsg}</p>
              </div>
              <div className="w-full max-w-xs space-y-1">
                <Progress value={aiProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{Math.round(aiProgress)}%</p>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-3 pb-4">
                <button
                  type="button"
                  onClick={() => setMode("choice")}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="h-5 w-5 text-primary" /> Auto-fill Profile with AI
                </CardTitle>
                <CardDescription>
                  {userType === "athlete"
                    ? "Enter your Instagram URL and we'll extract your profile automatically."
                    : "Enter your company website and we'll extract your profile automatically."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userType === "athlete" ? (
                  <div className="space-y-2">
                    <Label htmlFor="ai-url" className="flex items-center gap-1">
                      <Instagram className="h-3.5 w-3.5" /> Instagram Profile URL
                    </Label>
                    <Input
                      id="ai-url"
                      type="url"
                      placeholder="https://www.instagram.com/username"
                      value={aiUrl}
                      onChange={(e) => setAiUrl(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="ai-url" className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" /> Company Website
                      </Label>
                      <Input
                        id="ai-url"
                        type="url"
                        placeholder="https://www.example.com"
                        value={aiUrl}
                        onChange={(e) => setAiUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ai-linkedin" className="flex items-center gap-1">
                        <Globe className="h-3.5 w-3.5" /> LinkedIn URL
                      </Label>
                      <Input
                        id="ai-linkedin"
                        type="url"
                        placeholder="https://linkedin.com/company/..."
                        value={aiLinkedin}
                        onChange={(e) => setAiLinkedin(e.target.value)}
                      />
                    </div>
                  </>
                )}
                {aiError && <p className="text-sm text-destructive">{aiError}</p>}
                <Button className="w-full" onClick={handleAiSubmit}>
                  <Sparkles className="mr-2 h-4 w-4" /> Build My Profile with AI
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    );
  }

  // Manual form
  return (
    <div className="min-h-screen flex items-start justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4 pt-8">
      <Card className="w-full max-w-2xl shadow-2xl border-border/50">
        <CardHeader className="space-y-2 pb-4">
          <button
            type="button"
            onClick={() => setMode("choice")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <CardTitle className="text-xl font-bold">
            {userType === "athlete" ? "Your Athlete Profile" : "Your Company Profile"}
          </CardTitle>
          <CardDescription>Fill in as much as you can — you can update this later after approval.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userType === "athlete" ? (
            <WaitlistAthleteForm formData={formData} updateField={updateField} />
          ) : (
            <WaitlistEmployerForm formData={formData} updateField={updateField} />
          )}

          <Button className="w-full mt-6" onClick={() => onRequestAccess(formData)} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Application...
              </>
            ) : (
              "Request Access"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ==============================
// WaitlistAthleteForm — simplified athlete fields
// ==============================
const WaitlistAthleteForm = ({
  formData,
  updateField,
}: {
  formData: Record<string, any>;
  updateField: (k: string, v: any) => void;
}) => {
  const SPORTS = [
    "Alpine Skiing",
    "Cross Country",
    "Freestyle Skiing",
    "Snowboarding",
    "Ski Jumping",
    "Nordic Combined",
    "Freeskiing",
  ];
  const AVAILABILITY = ["Available Now", "Off-Season Only", "Post-Retirement", "Part-Time", "Flexible"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sport / Discipline</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.sport_discipline || ""}
            onChange={(e) => updateField("sport_discipline", e.target.value)}
          >
            <option value="">Select sport</option>
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Availability</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.availability || ""}
            onChange={(e) => updateField("availability", e.target.value)}
          >
            <option value="">Select availability</option>
            {AVAILABILITY.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Bio</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
          placeholder="Tell us about yourself..."
          value={formData.bio || ""}
          onChange={(e) => updateField("bio", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Home Mountain</Label>
        <Input
          placeholder="e.g. Park City Mountain"
          value={formData.home_mountain || ""}
          onChange={(e) => updateField("home_mountain", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Instagram URL</Label>
        <Input
          placeholder="https://instagram.com/..."
          value={formData.instagram_url || ""}
          onChange={(e) => updateField("instagram_url", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Professional Highlights</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
          placeholder="Key achievements, records, competition history..."
          value={formData.professional_highlights || ""}
          onChange={(e) => updateField("professional_highlights", e.target.value)}
        />
      </div>
    </div>
  );
};

// ==============================
// WaitlistEmployerForm — simplified employer fields
// ==============================
const WaitlistEmployerForm = ({
  formData,
  updateField,
}: {
  formData: Record<string, any>;
  updateField: (k: string, v: any) => void;
}) => {
  const INDUSTRIES = [
    "Technology",
    "Finance",
    "Healthcare",
    "Sports & Recreation",
    "Media & Entertainment",
    "Retail",
    "Manufacturing",
    "Consulting",
    "Education",
    "Non-Profit",
    "Government",
    "Other",
  ];
  const SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          Company Name <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="Enter company name"
          value={formData.company_name || ""}
          onChange={(e) => updateField("company_name", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Industry</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.industry || ""}
            onChange={(e) => updateField("industry", e.target.value)}
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Company Size</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.company_size || ""}
            onChange={(e) => updateField("company_size", e.target.value)}
          >
            <option value="">Select size</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>About</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
          placeholder="Tell us about your company..."
          value={formData.about || ""}
          onChange={(e) => updateField("about", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Website</Label>
        <Input
          placeholder="https://..."
          value={formData.website || ""}
          onChange={(e) => updateField("website", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>LinkedIn URL</Label>
        <Input
          placeholder="https://linkedin.com/company/..."
          value={formData.linkedin_url || ""}
          onChange={(e) => updateField("linkedin_url", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>HQ Location</Label>
        <Input
          placeholder="e.g. Park City, UT"
          value={formData.hq_location || ""}
          onChange={(e) => updateField("hq_location", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Opportunities Offered</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none"
          placeholder="Internships, full-time roles, sponsorships..."
          value={formData.opportunities_offered || ""}
          onChange={(e) => updateField("opportunities_offered", e.target.value)}
        />
      </div>
    </div>
  );
};

export default Auth;
