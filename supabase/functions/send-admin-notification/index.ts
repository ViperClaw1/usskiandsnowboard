import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  notification_type: 'new_account' | 'connection_declined';
  user_id?: string;
  request_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_type, user_id, request_id }: AdminNotificationRequest = await req.json();
    
    console.log("Processing admin notification:", { notification_type, user_id, request_id });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all admin users with email notifications enabled for this type
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(JSON.stringify({ message: "No admin users" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminUserIds = adminRoles.map(r => r.user_id);

    // Get admin notification preferences
    const preferenceColumn = notification_type === 'new_account' 
      ? 'email_new_accounts' 
      : 'email_connections_declined';

    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .in('user_id', adminUserIds)
      .eq(preferenceColumn, true);

    if (!preferences || preferences.length === 0) {
      console.log("No admins have this notification enabled");
      return new Response(JSON.stringify({ message: "No admins subscribed" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const subscribedAdminIds = preferences.map(p => p.user_id);

    // Get admin emails
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('id', subscribedAdminIds);

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles found");
      return new Response(JSON.stringify({ message: "No admin profiles" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let emailSubject = "";
    let emailHtml = "";

    if (notification_type === 'new_account' && user_id) {
      // Get new user details
      const { data: newUserProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user_id)
        .single();

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id)
        .single();

      emailSubject = "New User Registration - US Ski & Snowboard";
      emailHtml = `
        <h2>New User Registration</h2>
        <p>A new user has registered on the US Ski & Snowboard platform:</p>
        <ul>
          <li><strong>Name:</strong> ${newUserProfile?.full_name || 'N/A'}</li>
          <li><strong>Email:</strong> ${newUserProfile?.email || 'N/A'}</li>
          <li><strong>Role:</strong> ${userRole?.role || 'N/A'}</li>
        </ul>
        <p>You can view all users in the admin dashboard.</p>
      `;
    } else if (notification_type === 'connection_declined' && request_id) {
      // Get connection request details
      const { data: request } = await supabase
        .from('connection_requests')
        .select(`
          *,
          athlete:athlete_profiles(user_id),
          employer:employer_profiles(user_id, company_name)
        `)
        .eq('id', request_id)
        .single();

      if (request) {
        const { data: athleteProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', request.athlete.user_id)
          .single();

        emailSubject = "Connection Request Declined - US Ski & Snowboard";
        emailHtml = `
          <h2>Connection Request Declined</h2>
          <p>A connection request has been declined:</p>
          <ul>
            <li><strong>Athlete:</strong> ${athleteProfile?.full_name || 'N/A'}</li>
            <li><strong>Partner:</strong> ${request.employer.company_name || 'N/A'}</li>
            <li><strong>Date:</strong> ${new Date(request.updated_at).toLocaleDateString()}</li>
          </ul>
          <p>You can view all connection requests in the admin dashboard.</p>
        `;
      }
    }

    // Send emails to all subscribed admins
    const emailPromises = adminProfiles.map(admin => 
      resend.emails.send({
        from: "US Ski & Snowboard <onboarding@resend.dev>",
        to: [admin.email],
        subject: emailSubject,
        html: emailHtml,
      })
    );

    await Promise.all(emailPromises);

    console.log(`Sent ${adminProfiles.length} admin notification emails`);

    return new Response(
      JSON.stringify({ success: true, count: adminProfiles.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-admin-notification:", error);
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
