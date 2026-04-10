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

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const genericSuccessResponse = () =>
  new Response(
    JSON.stringify({
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );

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
    const redirectTo =
      typeof body?.redirect_to === "string" && body.redirect_to.trim()
        ? body.redirect_to.trim()
        : `${new URL(req.url).origin}/reset-password`;

    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      return genericSuccessResponse();
    }

    // Check whether user exists to avoid sending for unknown emails while still returning generic success.
    const { data: usersData, error: listUsersError } = await supabase.auth.admin.listUsers();
    if (listUsersError) {
      console.error("listUsers error:", listUsersError);
      return genericSuccessResponse();
    }

    const existingUser = usersData?.users?.find((u) => (u.email || "").toLowerCase() === normalizedEmail);
    if (!existingUser) {
      return genericSuccessResponse();
    }

    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo },
    });

    if (resetError) {
      console.error("generate recovery link error:", resetError);
      return genericSuccessResponse();
    }

    const resetUrl = resetData?.properties?.action_link;
    if (!resetUrl) {
      return genericSuccessResponse();
    }

    const bodyHtml = `
      <p style="margin: 0 0 20px; font-size: 16px;">
        We received a request to reset your password.
      </p>
      <p style="margin: 0 0 30px; font-size: 16px;">
        Click the button below to choose a new password:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Reset Password</a>
          </td>
        </tr>
      </table>
      <p style="margin: 30px 0 10px; font-size: 14px; color: #666;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0 0 30px; padding: 15px; background-color: #f4f4f4; border-radius: 5px; font-size: 12px; word-break: break-all; color: #333;">
        ${resetUrl}
      </p>
      <p style="margin: 0; font-size: 14px; color: #999;">
        If you did not request this, you can safely ignore this email.
      </p>
    `;

    await sendEmail(resend, {
      from: FROM,
      to: [normalizedEmail],
      subject: "Reset your password",
      html: emailTemplate("Reset your password", bodyHtml),
    });

    return genericSuccessResponse();
  } catch (error) {
    console.error("send-password-reset-email error:", error);
    return genericSuccessResponse();
  }
});
