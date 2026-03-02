import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
const MOUNTAIN_BG_URL = "https://usskiandsnowboard.lovable.app/email/mountain-header-bg.png";
const US_LOGO_URL = "https://usskiandsnowboard.lovable.app/email/us-logo-new.png";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Twilio credentials
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  notification_type: "new_request" | "request_accepted" | "request_declined";
  request_id: string;
}

// Send SMS via Twilio REST API
async function sendTwilioSMS(toPhone: string, message: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("Twilio credentials not configured, skipping SMS");
    return;
  }

  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: toPhone,
        Body: message,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Twilio SMS failed (${response.status}):`, errorBody);
    } else {
      console.log(`SMS sent successfully to ${toPhone}`);
    }
  } catch (error) {
    console.error("Error sending Twilio SMS:", error);
    // Don't throw - SMS failure should not block the main notification
  }
}

// Check if user has SMS enabled and has a phone number
async function shouldSendSMS(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ send: boolean; phone: string | null }> {
  // Check notification preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("sms_notifications_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!prefs?.sms_notifications_enabled) {
    return { send: false, phone: null };
  }

  // Get phone number from profiles
  const { data: profile } = await supabase.from("profiles").select("phone").eq("id", userId).maybeSingle();

  if (!profile?.phone) {
    console.log("SMS enabled but no phone number on file for user", userId);
    return { send: false, phone: null };
  }

  return { send: true, phone: profile.phone };
}

// Helper function to notify admins
async function notifyAdmins(notificationType: string, requestId: string) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        notification_type: notificationType,
        request_id: requestId,
      }),
    });
    console.log(`Notified admins about ${notificationType}`);
  } catch (error) {
    console.error("Error notifying admins:", error);
  }
}

// Check email notification preferences
async function shouldSendEmail(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  notificationType: string,
): Promise<boolean> {
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!prefs) return true;

  if (prefs.digest_frequency === "off") {
    console.log("User has disabled all email notifications");
    return false;
  }

  if (prefs.digest_frequency !== "instant") {
    console.log(`User prefers ${prefs.digest_frequency} digest, skipping instant email`);
    return false;
  }

  if (notificationType === "new_request" && !prefs.email_new_requests) {
    console.log("User has disabled new request emails");
    return false;
  }

  if (notificationType === "request_accepted" && !prefs.email_accepted_connections) {
    console.log("User has disabled accepted connection emails");
    return false;
  }

  return true;
}

// Email HTML templates
function newRequestEmailHtml(companyName: string, athleteName: string, request: any, supabaseUrl: string): string {
  return `
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
              background-image: url('${MOUNTAIN_BG_URL}');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              position: relative;
            ">
              <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,60,120,0.72) 0%, rgba(0,30,80,0.82) 100%); border-radius: 0;"></div>
              <div style="position: relative; z-index: 1; margin-bottom: 16px;">
                <img
                  src="${US_LOGO_URL}"
                  alt="U.S. Ski & Snowboard"
                  width="90"
                  height="90"
                  style="display: inline-block; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); object-fit: contain; background-color: rgba(255,255,255,0.1);"
                />
              </div>
              <h1 style="position: relative; z-index: 1; margin: 0; color: #ffffff; font-size: 26px; font-weight: bold; text-shadow: 0 1px 4px rgba(0,0,0,0.4); letter-spacing: 0.3px;">
                New Connection Request
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px;">Hello <strong>${companyName}</strong>,</p>
              <p style="margin: 0 0 30px; font-size: 16px;">
                You have received a new connection request from <strong>${athleteName}</strong>!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 15px; font-weight: bold; color: #0066cc;">Athlete Profile</p>
                    <p style="margin: 0 0 8px; font-size: 15px;"><strong>Name:</strong> ${athleteName}</p>
                    ${request.athlete_profiles.sport_discipline ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>Sport:</strong> ${request.athlete_profiles.sport_discipline}</p>` : ""}
                    ${request.athlete_profiles.bio ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>Bio:</strong> ${request.athlete_profiles.bio}</p>` : ""}
                    ${request.message ? `<p style="margin: 0; font-size: 15px;"><strong>Message:</strong> ${request.message}</p>` : ""}
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 30px; font-size: 16px;">
                Log in to your dashboard to review this request and connect with ${athleteName}.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/dashboard" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Review Request</a>
                  </td>
                </tr>
              </table>
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
    </html>`;
}

function acceptedAthleteEmailHtml(
  athleteName: string,
  companyName: string,
  request: any,
  employerEmail: string,
  supabaseUrl: string,
): string {
  return `
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
              background-image: url('${MOUNTAIN_BG_URL}');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              position: relative;
            ">
              <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,60,120,0.72) 0%, rgba(0,30,80,0.82) 100%); border-radius: 0;"></div>
              <div style="position: relative; z-index: 1; margin-bottom: 16px;">
                <img
                  src="${US_LOGO_URL}"
                  alt="U.S. Ski & Snowboard"
                  width="90"
                  height="90"
                  style="display: inline-block; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); object-fit: contain; background-color: rgba(255,255,255,0.1);"
                />
              </div>
              <h1 style="position: relative; z-index: 1; margin: 0; color: #ffffff; font-size: 26px; font-weight: bold; text-shadow: 0 1px 4px rgba(0,0,0,0.4); letter-spacing: 0.3px;">
                🎉 Connection Accepted!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px;">Great news, ${athleteName}!</p>
              <p style="margin: 0 0 30px; font-size: 16px;">
                <strong>${companyName}</strong> has accepted your connection request.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 15px; font-weight: bold; color: #0066cc;">Partner Contact Information</p>
                    <p style="margin: 0 0 8px; font-size: 15px;"><strong>Company:</strong> ${companyName}</p>
                    ${request.employer_profiles.industry ? `<p><strong>Industry:</strong> ${request.employer_profiles.industry}</p>` : ""}
    				${employerEmail ? `<p><strong>Email:</strong> ${employerEmail}</p>` : ""}
    				${request.employer_profiles.about ? `<p><strong>About:</strong> ${request.employer_profiles.about}</p>` : ""}
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 30px; font-size: 16px;">
                You can now reach out directly to start exploring opportunities together!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/dashboard" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">View Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #f8f8f8; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                This is an automated notification from US Ski & Snowboard Career Platform
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}

function acceptedEmployerEmailHtml(
  companyName: string,
  athleteName: string,
  request: any,
  athleteEmail: string,
  supabaseUrl: string,
): string {
  return `
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
              background-image: url('${MOUNTAIN_BG_URL}');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              position: relative;
            ">
              <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,60,120,0.72) 0%, rgba(0,30,80,0.82) 100%); border-radius: 0;"></div>
              <div style="position: relative; z-index: 1; margin-bottom: 16px;">
                <img
                  src="${US_LOGO_URL}"
                  alt="U.S. Ski & Snowboard"
                  width="90"
                  height="90"
                  style="display: inline-block; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); object-fit: contain; background-color: rgba(255,255,255,0.1);"
                />
              </div>
              <h1 style="position: relative; z-index: 1; margin: 0; color: #ffffff; font-size: 26px; font-weight: bold; text-shadow: 0 1px 4px rgba(0,0,0,0.4); letter-spacing: 0.3px;">
                🎉 Connection Confirmed!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px;">Hello ${companyName},</p>
              <p style="margin: 0 0 30px; font-size: 16px;">
                You've successfully connected with <strong>${athleteName}</strong>!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 15px; font-weight: bold; color: #0066cc;">Athlete Contact Information</p>
                    <p style="margin: 0 0 8px; font-size: 15px;"><strong>Name:</strong> ${athleteName}</p>
                    ${request.athlete_profiles.sport_discipline ? `<p><strong>Sport:</strong> ${request.athlete_profiles.sport_discipline}</p>` : ""}
    				${athleteEmail ? `<p><strong>Email:</strong> ${athleteEmail}</p>` : ""}
    				${request.athlete_profiles.bio ? `<p><strong>Bio:</strong> ${request.athlete_profiles.bio}</p>` : ""}
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 30px; font-size: 16px;">
                You can now reach out directly to discuss opportunities!
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/dashboard" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">View Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #f8f8f8; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                This is an automated notification from US Ski & Snowboard Career Platform
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}

function declinedEmailHtml(recipientName: string, otherPartyName: string, supabaseUrl: string): string {
  return `
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
              background-image: url('${MOUNTAIN_BG_URL}');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              position: relative;
            ">
              <div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,60,120,0.72) 0%, rgba(0,30,80,0.82) 100%); border-radius: 0;"></div>
              <div style="position: relative; z-index: 1; margin-bottom: 16px;">
                <img
                  src="${US_LOGO_URL}"
                  alt="U.S. Ski & Snowboard"
                  width="90"
                  height="90"
                  style="display: inline-block; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); object-fit: contain; background-color: rgba(255,255,255,0.1);"
                />
              </div>
              <h1 style="position: relative; z-index: 1; margin: 0; color: #ffffff; font-size: 26px; font-weight: bold; text-shadow: 0 1px 4px rgba(0,0,0,0.4); letter-spacing: 0.3px;">
                Connection Request Update
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px;">Hello <strong>${recipientName}</strong>,</p>
              <p style="margin: 0 0 30px; font-size: 16px;">
                Unfortunately, <strong>${otherPartyName}</strong> has declined your connection request at this time.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 15px;">Don't be discouraged! There are many other opportunities on the platform.</p>
                    <p style="margin: 0; font-size: 15px;">Keep building your profile and exploring connections that align with your goals.</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${supabaseUrl.replace(".supabase.co", ".lovable.app")}/dashboard" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Continue Exploring</a>
                  </td>
                </tr>
              </table>
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
    </html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_type, request_id }: NotificationRequest = await req.json();
    console.log(`Processing ${notification_type} notification for request ${request_id}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the connection request with all related data
    const { data: request, error: requestError } = await supabase
      .from("connection_requests")
      .select(
        `
        *,
        athlete_profiles (
          email, sport_discipline, bio, user_id, phone,
          profiles (full_name)
        ),
        employer_profiles (
          company_name, industry, about, contact_email, user_id, phone,
          profiles (full_name)
        )
      `,
      )
      .eq("id", request_id)
      .single();

    if (requestError || !request) {
      console.error("Error fetching request:", requestError);
      throw new Error("Connection request not found");
    }

    const athleteEmail = request.athlete_profiles.email;
    const employerEmail = request.employer_profiles.contact_email;
    const athleteName = request.athlete_profiles.profiles.full_name || "An athlete";
    const companyName = request.employer_profiles.company_name;
    const athleteUserId = request.athlete_profiles.user_id;
    const employerUserId = request.employer_profiles.user_id;

    if (notification_type === "new_request") {
      // Check email preferences
      const sendEmail = employerUserId ? await shouldSendEmail(supabase, employerUserId, "new_request") : true;

      if (sendEmail && employerEmail) {
        await resend.emails.send({
          from: "U.S. Ski & Snowboard <notifications@athleteconnection.org>",
          to: [employerEmail],
          subject: `New Connection Request from ${athleteName}`,
          html: newRequestEmailHtml(companyName, athleteName, request, supabaseUrl),
        });
        console.log(`New request email sent to ${employerEmail}`);
      }

      // SMS to employer
      if (employerUserId) {
        const smsCheck = await shouldSendSMS(supabase, employerUserId);
        if (smsCheck.send && smsCheck.phone) {
          await sendTwilioSMS(
            smsCheck.phone,
            `US Ski & Snowboard: New connection request from ${athleteName}. Log in to review.`,
          );
        }
      }

      await notifyAdmins("new_connection_request", request_id);
    } else if (notification_type === "request_accepted") {
      const sendToAthlete = athleteUserId ? await shouldSendEmail(supabase, athleteUserId, "request_accepted") : true;
      const sendToEmployer = employerUserId
        ? await shouldSendEmail(supabase, employerUserId, "request_accepted")
        : true;

      if (sendToAthlete && athleteEmail) {
        await resend.emails.send({
          from: "U.S. Ski & Snowboard <notifications@athleteconnection.org>",
          to: [athleteEmail],
          subject: `Connection Accepted - ${companyName} wants to connect!`,
          html: acceptedAthleteEmailHtml(athleteName, companyName, request, employerEmail, supabaseUrl),
        });
        console.log(`Acceptance email sent to athlete: ${athleteEmail}`);
      }

      if (sendToEmployer && employerEmail) {
        await resend.emails.send({
          from: "U.S. Ski & Snowboard <notifications@athleteconnection.org>",
          to: [employerEmail],
          subject: `Connection Confirmed - You're now connected with ${athleteName}!`,
          html: acceptedEmployerEmailHtml(companyName, athleteName, request, athleteEmail, supabaseUrl),
        });
        console.log(`Acceptance email sent to employer: ${employerEmail}`);
      }

      // SMS to both parties
      if (athleteUserId) {
        const smsCheck = await shouldSendSMS(supabase, athleteUserId);
        if (smsCheck.send && smsCheck.phone) {
          await sendTwilioSMS(
            smsCheck.phone,
            `US Ski & Snowboard: ${companyName} accepted your connection request! Check your dashboard.`,
          );
        }
      }
      if (employerUserId) {
        const smsCheck = await shouldSendSMS(supabase, employerUserId);
        if (smsCheck.send && smsCheck.phone) {
          await sendTwilioSMS(
            smsCheck.phone,
            `US Ski & Snowboard: You're now connected with ${athleteName}. View details on your dashboard.`,
          );
        }
      }

      await notifyAdmins("connection_accepted", request_id);
    } else if (notification_type === "request_declined") {
      const initiatorUserId = request.initiated_by_user_id;
      let recipientEmail: string | null = null;
      let recipientName = "";
      let otherPartyName = "";

      if (initiatorUserId === athleteUserId) {
        recipientEmail = athleteEmail;
        recipientName = athleteName;
        otherPartyName = companyName;
      } else if (initiatorUserId === employerUserId) {
        recipientEmail = employerEmail;
        recipientName = companyName;
        otherPartyName = athleteName;
      }

      // Check email preferences
      const sendEmail = initiatorUserId ? await shouldSendEmail(supabase, initiatorUserId, "request_declined") : true;

      if (sendEmail && recipientEmail) {
        await resend.emails.send({
          from: "U.S. Ski & Snowboard <notifications@athleteconnection.org>",
          to: [recipientEmail],
          subject: `Connection Request Update`,
          html: declinedEmailHtml(recipientName, otherPartyName, supabaseUrl),
        });
        console.log(`Declined notification sent to ${recipientEmail}`);
      }

      // SMS to initiator
      if (initiatorUserId) {
        const smsCheck = await shouldSendSMS(supabase, initiatorUserId);
        if (smsCheck.send && smsCheck.phone) {
          await sendTwilioSMS(
            smsCheck.phone,
            `US Ski & Snowboard: ${otherPartyName} declined your connection request. Keep exploring!`,
          );
        }
      }

      await notifyAdmins("connection_declined", request_id);
    }

    return new Response(JSON.stringify({ success: true, notification_type }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-connection-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
