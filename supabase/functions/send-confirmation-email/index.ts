import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import usLogo from "@/assets/us-logo-new.png";

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

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="
                padding: 50px 30px 40px;
                text-align: center;
                background-image: `url(${mountainHeaderBg})`;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                position: relative;
              ">
                <!-- Dark overlay for readability -->
                <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,60,120,0.72) 0%, rgba(0,30,80,0.82) 100%); border-radius: 0;"></div>
                <!-- Logo -->
                <div style="position: relative; z-index: 1; margin-bottom: 16px;">
                  <img
                    src="${usLogo}"
                    alt="U.S. Ski & Snowboard"
                    width="90"
                    height="90"
                    style="display: inline-block; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); object-fit: contain; background-color: rgba(255,255,255,0.1);"
                  />
                </div>
                <!-- Heading -->
                <h1 style="position: relative; z-index: 1; margin: 0; color: #ffffff; font-size: 26px; font-weight: bold; text-shadow: 0 1px 4px rgba(0,0,0,0.4); letter-spacing: 0.3px;">
                  Welcome to U.S. Ski &amp; Snowboard!
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 30px;">
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
              </td>
            </tr>
            <tr>
              <td style="padding: 30px; text-align: center; background-color: #f8f8f8; border-top: 1px solid #eee;">
                <p style="margin: 0; font-size: 12px; color: #999;">
                  U.S. Ski & Snowboard - Connecting Athletes with Career Opportunities
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: "U.S. Ski & Snowboard <notifications@athleteconnection.org>",
      to: [user.email],
      subject: "Confirm your email address",
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }

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
