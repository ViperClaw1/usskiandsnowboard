import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { emailTemplate, sendEmail } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM = "U.S. Ski & Snowboard <notifications@athleteconnection.org>";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type VerificationSource = "signup" | "resend";

const SOURCE_COOLDOWN_SECONDS: Record<VerificationSource, number> = {
  signup: 60,
  resend: 90,
};

const IP_WINDOW_SECONDS = 300;
const IP_MAX_ATTEMPTS = 25;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getRequesterIp = (req: Request): string => {
  const forwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("X-Forwarded-For");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const cfIp = req.headers.get("cf-connecting-ip") || req.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp.trim();
  const realIp = req.headers.get("x-real-ip") || req.headers.get("X-Real-IP");
  if (realIp) return realIp.trim();
  return "unknown";
};

const getCooldownRemaining = (createdAt: string, cooldownSeconds: number): number => {
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return 0;
  const expiresMs = createdMs + cooldownSeconds * 1000;
  const remainingMs = expiresMs - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendKey);

    const body = await req.json().catch(() => ({}));
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const normalizedEmail = normalizeEmail(rawEmail);
    const source: VerificationSource = body?.source === "signup" ? "signup" : "resend";
    const redirectTo =
      typeof body?.redirect_to === "string" && body.redirect_to.trim()
        ? body.redirect_to.trim()
        : `${new URL(req.url).origin}/dashboard`;

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterIp = getRequesterIp(req);
    const sourceCooldown = SOURCE_COOLDOWN_SECONDS[source];
    const emailCutoffIso = new Date(Date.now() - sourceCooldown * 1000).toISOString();
    const ipCutoffIso = new Date(Date.now() - IP_WINDOW_SECONDS * 1000).toISOString();

    // Per-email cooldown by source.
    const { data: recentEmailSend, error: emailThrottleError } = await supabase
      .from("email_verification_send_log")
      .select("created_at")
      .eq("email", normalizedEmail)
      .eq("source", source)
      .gte("created_at", emailCutoffIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (emailThrottleError) {
      console.error("Email throttle lookup error:", emailThrottleError);
      return new Response(JSON.stringify({ error: "Unable to process request" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (recentEmailSend?.created_at) {
      const cooldownRemaining = getCooldownRemaining(recentEmailSend.created_at, sourceCooldown);
      return new Response(
        JSON.stringify({
          error: "Please wait before requesting another verification email.",
          cooldown_remaining: cooldownRemaining,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Per-IP burst protection.
    const { count: ipCount, error: ipThrottleError } = await supabase
      .from("email_verification_send_log")
      .select("id", { count: "exact", head: true })
      .eq("requester_ip", requesterIp)
      .gte("created_at", ipCutoffIso);

    if (ipThrottleError) {
      console.error("IP throttle lookup error:", ipThrottleError);
      return new Response(JSON.stringify({ error: "Unable to process request" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((ipCount ?? 0) >= IP_MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({
          error: "Too many verification requests from this network. Please try again later.",
          cooldown_remaining: 60,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate a verification-capable link.
    let linkData: any = null;
    let linkError: any = null;

    ({ data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: normalizedEmail,
      password: crypto.randomUUID(),
      options: { redirectTo },
    }));

    if (linkError && linkError.message?.toLowerCase().includes("already been registered")) {
      ({ data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
        options: { redirectTo },
      }));
    }

    if (linkError) {
      console.error("generateLink error:", linkError);
      return new Response(JSON.stringify({ error: "Failed to generate verification link." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verificationUrl = linkData?.properties?.action_link;
    if (!verificationUrl) {
      return new Response(JSON.stringify({ error: "Verification link unavailable." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyHtml = `
      <p style="margin: 0 0 20px; font-size: 16px;">
        Please confirm your email address to activate your account.
      </p>
      <p style="margin: 0 0 30px; font-size: 16px;">
        Click the button below to verify your email:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Confirm Email</a>
          </td>
        </tr>
      </table>
      <p style="margin: 30px 0 10px; font-size: 14px; color: #666;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0 0 30px; padding: 15px; background-color: #f4f4f4; border-radius: 5px; font-size: 12px; word-break: break-all; color: #333;">
        ${verificationUrl}
      </p>
      <p style="margin: 0; font-size: 14px; color: #999;">This link will expire in 24 hours.</p>
    `;

    await sendEmail(resend, {
      from: FROM,
      to: [normalizedEmail],
      subject: "Confirm your email address",
      html: emailTemplate("Welcome to U.S. Ski & Snowboard!", bodyHtml),
    });

    const { error: logError } = await supabase.from("email_verification_send_log").insert({
      email: normalizedEmail,
      source,
      requester_ip: requesterIp,
    });

    if (logError) {
      console.warn("Could not log verification send event:", logError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        cooldown_remaining: sourceCooldown,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("send-verification-email error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
