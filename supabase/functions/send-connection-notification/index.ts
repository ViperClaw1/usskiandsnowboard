import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  notification_type: "new_request" | "request_accepted" | "request_declined";
  request_id: string;
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
    // Don't fail the main request if admin notification fails
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_type, request_id }: NotificationRequest = await req.json();
    
    console.log(`Processing ${notification_type} notification for request ${request_id}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper function to check notification preferences
    const shouldSendEmail = async (userId: string, notificationType: string): Promise<boolean> => {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!prefs) return true; // Default to sending if no preferences found

      // Check if emails are completely off
      if (prefs.digest_frequency === 'off') {
        console.log('User has disabled all email notifications');
        return false;
      }

      // Check if digest is enabled (not instant)
      if (prefs.digest_frequency !== 'instant') {
        console.log(`User prefers ${prefs.digest_frequency} digest, skipping instant email`);
        return false;
      }

      // Check specific notification type preferences
      if (notificationType === 'new_request' && !prefs.email_new_requests) {
        console.log('User has disabled new request emails');
        return false;
      }

      if (notificationType === 'request_accepted' && !prefs.email_accepted_connections) {
        console.log('User has disabled accepted connection emails');
        return false;
      }

      return true;
    };

    // Fetch the connection request with all related data
    const { data: request, error: requestError } = await supabase
      .from("connection_requests")
      .select(`
        *,
        athlete_profiles (
          email,
          sport_discipline,
          bio,
          user_id,
          profiles (full_name)
        ),
        employer_profiles (
          company_name,
          industry,
          about,
          contact_email,
          user_id,
          profiles (full_name)
        )
      `)
      .eq("id", request_id)
      .single();

    if (requestError || !request) {
      console.error("Error fetching request:", requestError);
      throw new Error("Connection request not found");
    }

    // Get email addresses
    const athleteEmail = request.athlete_profiles.email;
    const employerEmail = request.employer_profiles.contact_email;

    if (notification_type === "new_request") {
      // Determine who initiated the request and send to the recipient
      const athleteName = request.athlete_profiles.profiles.full_name || "An athlete";
      const companyName = request.employer_profiles.company_name;
      const employerUserId = request.employer_profiles.user_id;
      
      // Check if employer wants to receive this email
      if (employerUserId && !(await shouldSendEmail(employerUserId, 'new_request'))) {
        console.log('Skipping email based on employer preferences');
        return new Response(
          JSON.stringify({ success: true, message: 'Email skipped due to user preferences' }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      // Send email to the recipient (opposite of who initiated)
      const recipientEmail = employerEmail; // Assuming athlete initiated
      const subject = `New Connection Request from ${athleteName}`;
      
      const html = `
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
              <div class="header">
                <h1>New Connection Request</h1>
              </div>
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
              <div class="footer">
                <p>This is an automated notification from US Ski & Snowboard Career Platform</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await resend.emails.send({
        from: "US Ski & Snowboard <onboarding@resend.dev>",
        to: [recipientEmail],
        subject,
        html,
      });

      console.log(`New request email sent to ${recipientEmail}`);

      // Notify admins about new connection request
      await notifyAdmins("new_connection_request", request_id);

    } else if (notification_type === "request_accepted") {
      // Send emails to both parties when a request is accepted
      const athleteName = request.athlete_profiles.profiles.full_name || "The athlete";
      const companyName = request.employer_profiles.company_name;
      const athleteUserId = request.athlete_profiles.user_id;
      const employerUserId = request.employer_profiles.user_id;

      // Check preferences for both parties
      const sendToAthlete = athleteUserId ? await shouldSendEmail(athleteUserId, 'request_accepted') : true;
      const sendToEmployer = employerUserId ? await shouldSendEmail(employerUserId, 'request_accepted') : true;
      
      // Email to athlete
      const athleteHtml = `
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
              <div class="header">
                <h1>🎉 Connection Accepted!</h1>
              </div>
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
              <div class="footer">
                <p>This is an automated notification from US Ski & Snowboard Career Platform</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Email to employer
      const employerHtml = `
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
              <div class="header">
                <h1>🎉 Connection Confirmed!</h1>
              </div>
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
              <div class="footer">
                <p>This is an automated notification from US Ski & Snowboard Career Platform</p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Send both emails
      if (sendToAthlete && athleteEmail) {
        await resend.emails.send({
          from: "US Ski & Snowboard <onboarding@resend.dev>",
          to: [athleteEmail],
          subject: `Connection Accepted - ${companyName} wants to connect!`,
          html: athleteHtml,
        });
        console.log(`Acceptance email sent to athlete: ${athleteEmail}`);
      }

      if (sendToEmployer && employerEmail) {
        await resend.emails.send({
          from: "US Ski & Snowboard <onboarding@resend.dev>",
          to: [employerEmail],
          subject: `Connection Confirmed - You're now connected with ${athleteName}!`,
          html: employerHtml,
        });
        console.log(`Acceptance email sent to employer: ${employerEmail}`);
      }

      // Notify admins about accepted connection
      await notifyAdmins("connection_accepted", request_id);
    }

    // Handle declined connections - notify admins
    if (notification_type === "request_declined") {
      console.log("Notifying admins about declined connection");
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            notification_type: "connection_declined",
            request_id,
          }),
        });
      } catch (adminNotifyError) {
        console.error("Error notifying admins:", adminNotifyError);
        // Don't fail the main request if admin notification fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification_type }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-connection-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
