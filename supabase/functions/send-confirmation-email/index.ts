import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { emailTemplate, sendEmail } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const hookSecret = Deno.env.get("SEND_CONFIRMATION_EMAIL_HOOK_SECRET") as string;

Deno.serve(async (req) => {
  console.log("Confirmation email function called");

  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return new Response("Method not allowed", { status: 400 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret);

  try {
    console.log("Verifying webhook signature...");
    const {
      user,
      email_data: { token_hash, redirect_to },
    } = wh.verify(payload, headers) as {
      user: {
        email: string;
      };
      email_data: {
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
      };
    };

    console.log("Webhook verified. Sending confirmation email to:", user.email);

    const confirmationUrl = `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify?token=${token_hash}&type=email&redirect_to=${redirect_to}`;

    const bodyHtml = `
      <p style="margin: 0 0 20px; font-size: 16px;">
        Thank you for signing up with <strong>${user.email}</strong>.
      </p>
      <p style="margin: 0 0 30px; font-size: 16px;">
        To complete your registration and access your dashboard, please confirm your email address by clicking the button below:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Confirm Email Address</a>
          </td>
        </tr>
      </table>
      <p style="margin: 30px 0 10px; font-size: 14px; color: #666;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0 0 30px; padding: 15px; background-color: #f4f4f4; border-radius: 5px; font-size: 12px; word-break: break-all; color: #333;">
        ${confirmationUrl}
      </p>
      <p style="margin: 0; font-size: 14px; color: #999;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    `;

    await sendEmail(resend, {
      from: "U.S. Ski & Snowboard <notifications@athleteconnection.org>",
      to: [user.email],
      subject: "Confirm your email address",
      html: emailTemplate("Welcome to U.S. Ski & Snowboard!", bodyHtml),
    });

    console.log("Confirmation email sent successfully to:", user.email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({
        error: {
          http_code: error?.code || 500,
          message: error?.message || "Unknown error",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
