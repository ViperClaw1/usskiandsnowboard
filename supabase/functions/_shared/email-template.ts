// === Shared Email Template ===
// Branded header (mountain background + US Ski & Snowboard logo) reused by all notification functions.
// Also exports sleep() and sendEmail() with built-in rate-limit protection (≥600 ms between sends).

import { Resend } from "https://esm.sh/resend@4.0.0";

const MOUNTAIN_BG_URL = "https://usskiandsnowboard.lovable.app/email/mountain-header-bg.png";
const US_LOGO_URL = "https://usskiandsnowboard.lovable.app/email/us-logo-new.png";

/** Pause execution for `ms` milliseconds. */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wrap body HTML in the full branded email layout.
 * @param title  Text shown in the hero header (e.g. "New Connection Request")
 * @param bodyHtml  Inner HTML for the content area (everything inside the white card)
 */
export function emailTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <style>
      /* Keep header text white even when mail clients force dark mode */
      .hero-title { color: #ffffff !important; }
      .hero-title font { color: #ffffff !important; }
      @media (prefers-color-scheme: dark) {
        .hero-title, .hero-title font { color: #ffffff !important; }
      }
      /* Outlook.com / Gmail dark-mode overrides */
      [data-ogsc] .hero-title,
      [data-ogsb] .hero-title,
      u + .body .hero-title { color: #ffffff !important; }
    </style>
  </head>
  <body class="body" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <!-- Branded hero header -->
      <tr>
        <td style="padding: 50px 30px 40px; text-align: center; background-image: url('${MOUNTAIN_BG_URL}'); background-size: cover; background-position: center; background-repeat: no-repeat; background-color: #002a5c; position: relative;">
          <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,60,120,0.72) 0%, rgba(0,30,80,0.82) 100%); border-radius: 0;"></div>
          <div style="position: relative; z-index: 1; margin-bottom: 16px;">
            <img
              src="${US_LOGO_URL}"
              alt="U.S. Ski &amp; Snowboard"
              width="90"
              height="90"
              style="display: inline-block; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); object-fit: contain; background-color: rgba(255,255,255,0.1);"
            />
          </div>
          <h1 class="hero-title" style="position: relative; z-index: 1; margin: 0; color: #ffffff !important; font-size: 26px; font-weight: bold; text-shadow: 0 1px 4px rgba(0,0,0,0.4); letter-spacing: 0.3px;">
            <font color="#ffffff"><span style="color:#ffffff !important;">${title}</span></font>
          </h1>
        </td>
      </tr>
      <!-- Body content -->
      <tr>
        <td style="padding: 40px 30px;">
          ${bodyHtml}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="padding: 30px; text-align: center; background-color: #f8f8f8; border-top: 1px solid #eee;">
          <p style="margin: 0; font-size: 12px; color: #999;">
            U.S. Ski &amp; Snowboard - Connecting Athletes with Career Opportunities
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export interface EmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  cc?: string[];
  replyTo?: string | string[];
}

/**
 * Default Reply-To for all outbound mail. The `notifications@athleteconnection.org`
 * sender is an unmonitored no-reply mailbox, so we redirect any replies (including
 * "Reply All") to a monitored address to prevent bounces / "Address Not Found".
 */
export const DEFAULT_REPLY_TO = "michele.lowry@usskiandsnowboard.org";

/**
 * Send a single email via Resend.
 * Callers are responsible for inserting sleep() between sequential sends to avoid the 2 req/s limit.
 */
export async function sendEmail(resend: Resend, payload: EmailPayload): Promise<void> {
  const sendPayload: any = {
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    reply_to: payload.replyTo ?? DEFAULT_REPLY_TO,
  };
  if (payload.cc && payload.cc.length > 0) {
    sendPayload.cc = payload.cc;
  }
  let { error } = await resend.emails.send(sendPayload);
  if (error && (error as any).statusCode === 429) {
    console.warn("Resend rate limit hit, retrying after 1500ms...");
    await sleep(1500);
    ({ error } = await resend.emails.send(sendPayload));
  }
  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send email to ${payload.to.join(", ")}: ${error.message}`);
  }
}
