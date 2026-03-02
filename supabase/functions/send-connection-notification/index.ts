import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { emailTemplate, sendEmail, sleep } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const FROM = "U.S. Ski & Snowboard <notifications@athleteconnection.org>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  notification_type: "new_request" | "request_accepted" | "request_declined";
  request_id: string;
}

// === SMS helper ===
async function sendTwilioSMS(toPhone: string, message: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("Twilio credentials not configured, skipping SMS");
    return;
  }
  try {
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ From: TWILIO_PHONE_NUMBER, To: toPhone, Body: message }),
      },
    );
    if (!response.ok) {
      console.error(`Twilio SMS failed (${response.status}):`, await response.text());
    } else {
      console.log(`SMS sent to ${toPhone}`);
    }
  } catch (err) {
    console.error("Error sending Twilio SMS:", err);
  }
}

async function shouldSendSMS(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ send: boolean; phone: string | null }> {
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("sms_notifications_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (!prefs?.sms_notifications_enabled) return { send: false, phone: null };
  const { data: profile } = await supabase.from("profiles").select("phone").eq("id", userId).maybeSingle();
  if (!profile?.phone) return { send: false, phone: null };
  return { send: true, phone: profile.phone };
}

async function notifyAdmins(notificationType: string, requestId: string) {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify({ notification_type: notificationType, request_id: requestId }),
    });
    console.log(`Notified admins about ${notificationType}`);
  } catch (err) {
    console.error("Error notifying admins:", err);
  }
}

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
  if (prefs.digest_frequency === "off") return false;
  if (prefs.digest_frequency !== "instant") return false;
  if (notificationType === "new_request" && !prefs.email_new_requests) return false;
  if (notificationType === "request_accepted" && !prefs.email_accepted_connections) return false;
  return true;
}

// === Email body builders (produce inner HTML only; wrapper applied by emailTemplate()) ===

function newRequestBody(companyName: string, athleteName: string, request: any, appUrl: string): string {
  return `
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
          <a href="${appUrl}/dashboard" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Review Request</a>
        </td>
      </tr>
    </table>`;
}

function acceptedAthleteBody(
  athleteName: string,
  companyName: string,
  request: any,
  employerEmail: string,
  appUrl: string,
): string {
  return `
    <p style="margin: 0 0 20px; font-size: 16px;">Great news, ${athleteName}!</p>
    <p style="margin: 0 0 30px; font-size: 16px;">
      <strong>${companyName}</strong> has accepted your connection request.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px; font-size: 15px; font-weight: bold; color: #0066cc;">Partner Contact Information</p>
          <p style="margin: 0 0 8px; font-size: 15px;"><strong>Company:</strong> ${companyName}</p>
          ${request.employer_profiles.industry ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>Industry:</strong> ${request.employer_profiles.industry}</p>` : ""}
          ${employerEmail ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>Email:</strong> ${employerEmail}</p>` : ""}
          ${request.employer_profiles.about ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>About:</strong> ${request.employer_profiles.about}</p>` : ""}
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 30px; font-size: 16px;">
      You can now reach out directly to start exploring opportunities together!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${appUrl}/dashboard" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">View Dashboard</a>
        </td>
      </tr>
    </table>`;
}

function acceptedEmployerBody(
  companyName: string,
  athleteName: string,
  request: any,
  athleteEmail: string,
  appUrl: string,
): string {
  return `
    <p style="margin: 0 0 20px; font-size: 16px;">Hello ${companyName},</p>
    <p style="margin: 0 0 30px; font-size: 16px;">
      You've successfully connected with <strong>${athleteName}</strong>!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 12px; font-size: 15px; font-weight: bold; color: #0066cc;">Athlete Contact Information</p>
          <p style="margin: 0 0 8px; font-size: 15px;"><strong>Name:</strong> ${athleteName}</p>
          ${request.athlete_profiles.sport_discipline ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>Sport:</strong> ${request.athlete_profiles.sport_discipline}</p>` : ""}
          ${athleteEmail ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>Email:</strong> ${athleteEmail}</p>` : ""}
          ${request.athlete_profiles.bio ? `<p style="margin: 0 0 8px; font-size: 15px;"><strong>Bio:</strong> ${request.athlete_profiles.bio}</p>` : ""}
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 30px; font-size: 16px;">
      You can now reach out directly to discuss opportunities!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${appUrl}/dashboard" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">View Dashboard</a>
        </td>
      </tr>
    </table>`;
}

function declinedBody(recipientName: string, otherPartyName: string, appUrl: string): string {
  return `
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
          <a href="${appUrl}/dashboard" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Continue Exploring</a>
        </td>
      </tr>
    </table>`;
}

// === Handler ===

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_type, request_id }: NotificationRequest = await req.json();
    console.log(`Processing ${notification_type} notification for request ${request_id}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const appUrl = "https://usskiandsnowboard.lovable.app";

    const { data: request, error: requestError } = await supabase
      .from("connection_requests")
      .select(`
        *,
        athlete_profiles (email, sport_discipline, bio, user_id, phone, profiles (full_name)),
        employer_profiles (company_name, industry, about, contact_email, user_id, phone, profiles (full_name))
      `)
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
      const sendEmail_ = employerUserId ? await shouldSendEmail(supabase, employerUserId, "new_request") : true;
      if (sendEmail_ && employerEmail) {
        await sendEmail(resend, {
          from: FROM,
          to: [employerEmail],
          subject: `New Connection Request from ${athleteName}`,
          html: emailTemplate("New Connection Request", newRequestBody(companyName, athleteName, request, appUrl)),
        });
        console.log(`New request email sent to ${employerEmail}`);
      }
      if (employerUserId) {
        const sms = await shouldSendSMS(supabase, employerUserId);
        if (sms.send && sms.phone) {
          await sendTwilioSMS(sms.phone, `US Ski & Snowboard: New connection request from ${athleteName}. Log in to review.`);
        }
      }
      await notifyAdmins("new_connection_request", request_id);

    } else if (notification_type === "request_accepted") {
      const sendToAthlete = athleteUserId ? await shouldSendEmail(supabase, athleteUserId, "request_accepted") : true;
      const sendToEmployer = employerUserId ? await shouldSendEmail(supabase, employerUserId, "request_accepted") : true;

      if (sendToAthlete && athleteEmail) {
        await sendEmail(resend, {
          from: FROM,
          to: [athleteEmail],
          subject: `Connection Accepted - ${companyName} wants to connect!`,
          html: emailTemplate("🎉 Connection Accepted!", acceptedAthleteBody(athleteName, companyName, request, employerEmail, appUrl)),
        });
        console.log(`Acceptance email sent to athlete: ${athleteEmail}`);
      }

      // Rate limit guard: 600 ms between the two acceptance emails
      if (sendToAthlete && athleteEmail && sendToEmployer && employerEmail) {
        await sleep(600);
      }

      if (sendToEmployer && employerEmail) {
        await sendEmail(resend, {
          from: FROM,
          to: [employerEmail],
          subject: `Connection Confirmed - You're now connected with ${athleteName}!`,
          html: emailTemplate("🎉 Connection Confirmed!", acceptedEmployerBody(companyName, athleteName, request, athleteEmail, appUrl)),
        });
        console.log(`Acceptance email sent to employer: ${employerEmail}`);
      }

      if (athleteUserId) {
        const sms = await shouldSendSMS(supabase, athleteUserId);
        if (sms.send && sms.phone) {
          await sendTwilioSMS(sms.phone, `US Ski & Snowboard: ${companyName} accepted your connection request! Check your dashboard.`);
        }
      }
      if (employerUserId) {
        const sms = await shouldSendSMS(supabase, employerUserId);
        if (sms.send && sms.phone) {
          await sendTwilioSMS(sms.phone, `US Ski & Snowboard: You're now connected with ${athleteName}. View details on your dashboard.`);
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

      const sendEmail_ = initiatorUserId ? await shouldSendEmail(supabase, initiatorUserId, "request_declined") : true;
      if (sendEmail_ && recipientEmail) {
        await sendEmail(resend, {
          from: FROM,
          to: [recipientEmail],
          subject: `Connection Request Update`,
          html: emailTemplate("Connection Request Update", declinedBody(recipientName, otherPartyName, appUrl)),
        });
        console.log(`Declined notification sent to ${recipientEmail}`);
      }

      if (initiatorUserId) {
        const sms = await shouldSendSMS(supabase, initiatorUserId);
        if (sms.send && sms.phone) {
          await sendTwilioSMS(sms.phone, `US Ski & Snowboard: ${otherPartyName} declined your connection request. Keep exploring!`);
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
