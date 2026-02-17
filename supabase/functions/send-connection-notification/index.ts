import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

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
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: toPhone,
          Body: message,
        }),
      }
    );

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
  userId: string
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();

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
        "Authorization": `Bearer ${supabaseServiceKey}`,
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
  notificationType: string
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
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .profile-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .profile-info h3 { margin-top: 0; color: #667eea; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>New Connection Request</h1></div>
          <div class="content">
            <p>Hello ${companyName},</p>
            <p>You have received a new connection request from <strong>${athleteName}</strong>!</p>
            <div class="profile-info">
              <h3>Athlete Profile</h3>
              <p><strong>Name:</strong> ${athleteName}</p>
              ${request.athlete_profiles.sport_discipline ? `<p><strong>Sport:</strong> ${request.athlete_profiles.sport_discipline}</p>` : ""}
              ${request.athlete_profiles.bio ? `<p><strong>Bio:</strong> ${request.athlete_profiles.bio}</p>` : ""}
              ${request.message ? `<p><strong>Message:</strong> ${request.message}</p>` : ""}
            </div>
            <p>Log in to your dashboard to review this request and connect with ${athleteName}.</p>
            <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/dashboard" class="button">Review Request</a>
          </div>
          <div class="footer"><p>This is an automated notification from US Ski & Snowboard Career Platform</p></div>
        </div>
      </body>
    </html>`;
}

function acceptedAthleteEmailHtml(athleteName: string, companyName: string, request: any, employerEmail: string, supabaseUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .contact-info { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .contact-info h3 { margin-top: 0; color: #059669; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🎉 Connection Accepted!</h1></div>
          <div class="content">
            <p>Great news, ${athleteName}!</p>
            <p><strong>${companyName}</strong> has accepted your connection request.</p>
            <div class="contact-info">
              <h3>Partner Contact Information</h3>
              <p><strong>Company:</strong> ${companyName}</p>
              ${request.employer_profiles.industry ? `<p><strong>Industry:</strong> ${request.employer_profiles.industry}</p>` : ""}
              ${employerEmail ? `<p><strong>Email:</strong> ${employerEmail}</p>` : ""}
              ${request.employer_profiles.about ? `<p><strong>About:</strong> ${request.employer_profiles.about}</p>` : ""}
            </div>
            <p>You can now reach out directly to start exploring opportunities together!</p>
            <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/dashboard" class="button">View Dashboard</a>
          </div>
          <div class="footer"><p>This is an automated notification from US Ski & Snowboard Career Platform</p></div>
        </div>
      </body>
    </html>`;
}

function acceptedEmployerEmailHtml(companyName: string, athleteName: string, request: any, athleteEmail: string, supabaseUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .contact-info { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .contact-info h3 { margin-top: 0; color: #059669; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>🎉 Connection Confirmed!</h1></div>
          <div class="content">
            <p>Hello ${companyName},</p>
            <p>You've successfully connected with <strong>${athleteName}</strong>!</p>
            <div class="contact-info">
              <h3>Athlete Contact Information</h3>
              <p><strong>Name:</strong> ${athleteName}</p>
              ${request.athlete_profiles.sport_discipline ? `<p><strong>Sport:</strong> ${request.athlete_profiles.sport_discipline}</p>` : ""}
              ${athleteEmail ? `<p><strong>Email:</strong> ${athleteEmail}</p>` : ""}
              ${request.athlete_profiles.bio ? `<p><strong>Bio:</strong> ${request.athlete_profiles.bio}</p>` : ""}
            </div>
            <p>You can now reach out directly to discuss opportunities!</p>
            <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/dashboard" class="button">View Dashboard</a>
          </div>
          <div class="footer"><p>This is an automated notification from US Ski & Snowboard Career Platform</p></div>
        </div>
      </body>
    </html>`;
}

function declinedEmailHtml(recipientName: string, otherPartyName: string, supabaseUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
          .info-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Connection Request Update</h1></div>
          <div class="content">
            <p>Hello ${recipientName},</p>
            <p>Unfortunately, <strong>${otherPartyName}</strong> has declined your connection request at this time.</p>
            <div class="info-box">
              <p>Don't be discouraged! There are many other opportunities on the platform.</p>
              <p>Keep building your profile and exploring connections that align with your goals.</p>
            </div>
            <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/dashboard" class="button">Continue Exploring</a>
          </div>
          <div class="footer"><p>This is an automated notification from US Ski & Snowboard Career Platform</p></div>
        </div>
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
      .select(`
        *,
        athlete_profiles (
          email, sport_discipline, bio, user_id, phone,
          profiles (full_name)
        ),
        employer_profiles (
          company_name, industry, about, contact_email, user_id, phone,
          profiles (full_name)
        )
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
            `US Ski & Snowboard: New connection request from ${athleteName}. Log in to review.`
          );
        }
      }

      await notifyAdmins("new_connection_request", request_id);

    } else if (notification_type === "request_accepted") {
      const sendToAthlete = athleteUserId ? await shouldSendEmail(supabase, athleteUserId, "request_accepted") : true;
      const sendToEmployer = employerUserId ? await shouldSendEmail(supabase, employerUserId, "request_accepted") : true;

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
            `US Ski & Snowboard: ${companyName} accepted your connection request! Check your dashboard.`
          );
        }
      }
      if (employerUserId) {
        const smsCheck = await shouldSendSMS(supabase, employerUserId);
        if (smsCheck.send && smsCheck.phone) {
          await sendTwilioSMS(
            smsCheck.phone,
            `US Ski & Snowboard: You're now connected with ${athleteName}. View details on your dashboard.`
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
            `US Ski & Snowboard: ${otherPartyName} declined your connection request. Keep exploring!`
          );
        }
      }

      await notifyAdmins("connection_declined", request_id);
    }

    return new Response(
      JSON.stringify({ success: true, notification_type }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-connection-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
