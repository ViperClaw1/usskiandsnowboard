import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { emailTemplate, sendEmail, sleep } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FROM = "U.S. Ski & Snowboard <notifications@athleteconnection.org>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  notification_type: "new_account" | "connection_declined" | "new_connection_request" | "connection_accepted";
  user_id?: string;
  request_id?: string;
}

// === Email body builders ===

function newAccountBody(fullName: string, email: string, role: string): string {
  return `
    <p style="margin: 0 0 30px; font-size: 16px;">A new user has registered on the U.S. Ski &amp; Snowboard platform:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Name:</strong> ${fullName || "N/A"}</p>
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Email:</strong> ${email || "N/A"}</p>
          <p style="margin: 0; font-size: 15px;"><strong>Role:</strong> ${role || "N/A"}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 16px;">You can view all users in the admin dashboard.</p>`;
}

function newConnectionRequestBody(athleteName: string, sport: string, companyName: string, date: string): string {
  return `
    <p style="margin: 0 0 30px; font-size: 16px;">A new connection request has been made:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Athlete:</strong> ${athleteName}</p>
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Sport:</strong> ${sport}</p>
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Partner:</strong> ${companyName}</p>
          <p style="margin: 0; font-size: 15px;"><strong>Date:</strong> ${date}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 16px;">You can view all connection requests in the admin dashboard.</p>`;
}

function connectionAcceptedBody(athleteName: string, companyName: string, date: string): string {
  return `
    <p style="margin: 0 0 30px; font-size: 16px;">A connection has been established:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Athlete:</strong> ${athleteName}</p>
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Partner:</strong> ${companyName}</p>
          <p style="margin: 0; font-size: 15px;"><strong>Date:</strong> ${date}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 16px;">You can view all connections in the admin dashboard.</p>`;
}

function connectionDeclinedBody(athleteName: string, companyName: string, date: string): string {
  return `
    <p style="margin: 0 0 30px; font-size: 16px;">A connection request has been declined:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin: 0 0 30px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Athlete:</strong> ${athleteName}</p>
          <p style="margin: 0 0 10px; font-size: 15px;"><strong>Partner:</strong> ${companyName}</p>
          <p style="margin: 0; font-size: 15px;"><strong>Date:</strong> ${date}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 0; font-size: 16px;">You can view all connections in the admin dashboard.</p>`;
}

// === Handler ===

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_type, user_id, request_id }: AdminNotificationRequest = await req.json();
    console.log("Processing admin notification:", { notification_type, user_id, request_id });

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Get all admin users
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(JSON.stringify({ message: "No admin users" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminUserIds = adminRoles.map((r) => r.user_id);

    // Determine which preference column to check
    let preferenceColumn: string;
    switch (notification_type) {
      case "new_account":
        preferenceColumn = "email_new_accounts";
        break;
      case "connection_declined":
        preferenceColumn = "email_connections_declined";
        break;
      case "new_connection_request":
        preferenceColumn = "email_new_requests";
        break;
      case "connection_accepted":
        preferenceColumn = "email_accepted_connections";
        break;
      default:
        preferenceColumn = "email_new_requests";
    }

    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .in("user_id", adminUserIds)
      .eq(preferenceColumn, true);

    if (!preferences || preferences.length === 0) {
      console.log("No admins have this notification enabled");
      return new Response(JSON.stringify({ message: "No admins subscribed" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subscribedAdminIds = preferences.map((p) => p.user_id);
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("id", subscribedAdminIds);

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles found");
      return new Response(JSON.stringify({ message: "No admin profiles" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build email subject + HTML
    let emailSubject = "";
    let emailHtml = "";

    if (notification_type === "new_account" && user_id) {
      const { data: profile } = await supabase.from("profiles").select("email, full_name").eq("id", user_id).single();
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user_id).single();
      emailSubject = "New User Registration - US Ski & Snowboard";
      emailHtml = emailTemplate(
        "New User Registration",
        newAccountBody(profile?.full_name ?? "N/A", profile?.email ?? "N/A", roleData?.role ?? "N/A"),
      );
    } else if (notification_type === "new_connection_request" && request_id) {
      const { data: req_ } = await supabase
        .from("connection_requests")
        .select(
          `*, athlete:athlete_profiles!inner(user_id, sport_discipline), employer:employer_profiles!inner(user_id, company_name)`,
        )
        .eq("id", request_id)
        .single();
      if (req_) {
        const { data: ap } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", req_.athlete.user_id)
          .single();
        emailSubject = "New Connection Request - US Ski & Snowboard";
        emailHtml = emailTemplate(
          "New Connection Request",
          newConnectionRequestBody(
            ap?.full_name ?? "N/A",
            req_.athlete.sport_discipline ?? "N/A",
            req_.employer.company_name ?? "N/A",
            new Date(req_.created_at).toLocaleDateString(),
          ),
        );
      }
    } else if (notification_type === "connection_accepted" && request_id) {
      const { data: req_ } = await supabase
        .from("connection_requests")
        .select(`*, athlete:athlete_profiles!inner(user_id), employer:employer_profiles!inner(user_id, company_name)`)
        .eq("id", request_id)
        .single();
      if (req_) {
        const { data: ap } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", req_.athlete.user_id)
          .single();
        emailSubject = "Connection Accepted - US Ski & Snowboard";
        emailHtml = emailTemplate(
          "Connection Accepted",
          connectionAcceptedBody(
            ap?.full_name ?? "N/A",
            req_.employer.company_name ?? "N/A",
            new Date(req_.updated_at).toLocaleDateString(),
          ),
        );
      }
    } else if (notification_type === "connection_declined" && request_id) {
      const { data: req_ } = await supabase
        .from("connection_requests")
        .select(`*, athlete:athlete_profiles!inner(user_id), employer:employer_profiles!inner(user_id, company_name)`)
        .eq("id", request_id)
        .single();
      if (req_) {
        const { data: ap } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", req_.athlete.user_id)
          .single();
        emailSubject = "Connection Request Declined - US Ski & Snowboard";
        emailHtml = emailTemplate(
          "Connection Request Declined",
          connectionDeclinedBody(
            ap?.full_name ?? "N/A",
            req_.employer.company_name ?? "N/A",
            new Date(req_.updated_at).toLocaleDateString(),
          ),
        );
      }
    }

    // === Sequential send with 1000 ms gap to stay under the 2 req/s Resend limit ===
    let sent = 0;
    for (const admin of adminProfiles) {
      if (sent > 0) await sleep(1000);
      await sendEmail(resend, { from: FROM, to: [admin.email], subject: emailSubject, html: emailHtml });
      sent++;
    }

    console.log(`Sent ${sent} admin notification emails`);
    return new Response(JSON.stringify({ success: true, count: sent }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
