import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);

    const today = new Date();
    const isMonday = today.getUTCDay() === 1;

    // 1. Get admin users with daily/weekly digest preferences
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (!adminRoles?.length) {
      return new Response(JSON.stringify({ message: "No admins found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminIds = adminRoles.map((r: any) => r.user_id);

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, digest_frequency")
      .in("user_id", adminIds)
      .in("digest_frequency", ["daily", "weekly"]);

    if (!prefs?.length) {
      return new Response(JSON.stringify({ message: "No admins opted into summaries" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter: daily always, weekly only on Monday
    const recipients = prefs.filter(
      (p: any) => p.digest_frequency === "daily" || (p.digest_frequency === "weekly" && isMonday)
    );

    if (!recipients.length) {
      return new Response(JSON.stringify({ message: "No summaries to send today" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch all dashboard data
    const [
      statsRes,
      signupsRes,
      connectionsRes,
      sportRes,
      industryRes,
      topAthletesRes,
      topEmployersRes,
    ] = await Promise.all([
      supabase.from("admin_analytics_summary").select("*").single(),
      supabase.from("user_signups_by_day").select("*").order("signup_date", { ascending: false }).limit(7),
      supabase.from("connections_by_day").select("*").order("request_date", { ascending: false }).limit(7),
      supabase.from("athletes_by_sport").select("*"),
      supabase.from("employers_by_industry").select("*"),
      supabase.from("top_athlete_profiles").select("*").limit(5),
      supabase.from("top_employer_profiles").select("*").limit(5),
    ]);

    const stats = statsRes.data || {};
    const signups = (signupsRes.data || []).reverse();
    const connections = (connectionsRes.data || []).reverse();
    const sports = sportRes.data || [];
    const industries = industryRes.data || [];
    const topAthletes = topAthletesRes.data || [];
    const topEmployers = topEmployersRes.data || [];

    // 3. Get recent users (last 10)
    const { data: recentProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    // Get roles for recent users
    const recentUserIds = (recentProfiles || []).map((p: any) => p.id);
    const { data: recentRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", recentUserIds);

    const roleMap: Record<string, string> = {};
    (recentRoles || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });

    // 4. Get admin emails
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", recipients.map((r: any) => r.user_id));

    const recipientMap: Record<string, any> = {};
    (adminProfiles || []).forEach((p: any) => { recipientMap[p.id] = p; });

    // 5. Build HTML email
    const frequencyLabel = (freq: string) => freq === "daily" ? "Daily" : "Weekly";

    const buildEmail = (freq: string) => {
      const cellStyle = `padding: 16px; text-align: center; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;`;
      const valueStyle = `font-size: 28px; font-weight: bold; color: #111827; margin: 0;`;
      const labelStyle = `font-size: 12px; color: #6b7280; margin: 4px 0 0; text-transform: uppercase; letter-spacing: 0.5px;`;
      const subtitleStyle = `font-size: 11px; color: #9ca3af; margin: 2px 0 0;`;
      const thStyle = `padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;`;
      const tdStyle = `padding: 10px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6;`;
      const tdAltStyle = `padding: 10px 12px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; background-color: #f9fafb;`;
      const sectionTitle = `font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;`;

      return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <!-- Header -->
    <tr>
      <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #0066cc 0%, #004999 100%);">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">${frequencyLabel(freq)} Analytics Summary</h1>
        <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </td>
    </tr>

    <!-- Stats Grid -->
    <tr>
      <td style="padding: 30px;">
        <h2 style="${sectionTitle}">Key Metrics</h2>
        <table width="100%" cellpadding="0" cellspacing="8">
          <tr>
            <td width="33%" style="${cellStyle}">
              <p style="${valueStyle}">${stats.total_users || 0}</p>
              <p style="${labelStyle}">Total Users</p>
              <p style="${subtitleStyle}">${stats.total_athletes || 0} athletes · ${stats.total_employers || 0} employers</p>
            </td>
            <td width="33%" style="${cellStyle}">
              <p style="${valueStyle}">${stats.accepted_connections || 0}</p>
              <p style="${labelStyle}">Total Connections</p>
              <p style="${subtitleStyle}">${stats.total_requests || 0} total requests</p>
            </td>
            <td width="33%" style="${cellStyle}">
              <p style="${valueStyle}">${stats.pending_requests || 0}</p>
              <p style="${labelStyle}">Pending Requests</p>
              <p style="${subtitleStyle}">Awaiting response</p>
            </td>
          </tr>
          <tr>
            <td width="33%" style="${cellStyle}">
              <p style="${valueStyle}">${stats.rejected_requests || 0}</p>
              <p style="${labelStyle}">Rejected</p>
              <p style="${subtitleStyle}">Declined requests</p>
            </td>
            <td width="33%" style="${cellStyle}">
              <p style="${valueStyle}">${stats.avg_athlete_completeness || 0}%</p>
              <p style="${labelStyle}">Athlete Profiles</p>
              <p style="${subtitleStyle}">Avg. completeness</p>
            </td>
            <td width="33%" style="${cellStyle}">
              <p style="${valueStyle}">${stats.avg_employer_completeness || 0}%</p>
              <p style="${labelStyle}">Employer Profiles</p>
              <p style="${subtitleStyle}">Avg. completeness</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- User Signups Table -->
    <tr>
      <td style="padding: 0 30px 30px;">
        <h2 style="${sectionTitle}">User Signups (Last 7 Days)</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #f9fafb;">
            <th style="${thStyle}">Date</th>
            <th style="${thStyle}">Athletes</th>
            <th style="${thStyle}">Employers</th>
            <th style="${thStyle}">Total</th>
          </tr>
          ${signups.map((s: any, i: number) => `<tr>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${s.signup_date || '-'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${s.athlete_signups || 0}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${s.employer_signups || 0}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${s.signups || 0}</td>
          </tr>`).join('')}
        </table>
      </td>
    </tr>

    <!-- Connection Requests Table -->
    <tr>
      <td style="padding: 0 30px 30px;">
        <h2 style="${sectionTitle}">Connection Requests (Last 7 Days)</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #f9fafb;">
            <th style="${thStyle}">Date</th>
            <th style="${thStyle}">Total</th>
            <th style="${thStyle}">Accepted</th>
            <th style="${thStyle}">Pending</th>
            <th style="${thStyle}">Rejected</th>
          </tr>
          ${connections.map((c: any, i: number) => `<tr>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${c.request_date || '-'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${c.total_requests || 0}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${c.accepted || 0}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${c.pending || 0}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${c.rejected || 0}</td>
          </tr>`).join('')}
        </table>
      </td>
    </tr>

    <!-- Athletes by Sport -->
    <tr>
      <td style="padding: 0 30px 30px;">
        <h2 style="${sectionTitle}">Athletes by Sport</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #f9fafb;">
            <th style="${thStyle}">Sport / Discipline</th>
            <th style="${thStyle}">Count</th>
          </tr>
          ${sports.map((s: any, i: number) => `<tr>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${s.sport_discipline || 'Not specified'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${s.count || 0}</td>
          </tr>`).join('')}
        </table>
      </td>
    </tr>

    <!-- Partners by Industry -->
    <tr>
      <td style="padding: 0 30px 30px;">
        <h2 style="${sectionTitle}">Partners by Industry</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #f9fafb;">
            <th style="${thStyle}">Industry</th>
            <th style="${thStyle}">Count</th>
          </tr>
          ${industries.map((ind: any, i: number) => `<tr>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${ind.industry || 'Not specified'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${ind.count || 0}</td>
          </tr>`).join('')}
        </table>
      </td>
    </tr>

    <!-- Top Athlete Profiles -->
    <tr>
      <td style="padding: 0 30px 30px;">
        <h2 style="${sectionTitle}">Top Athlete Profiles</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #f9fafb;">
            <th style="${thStyle}">Name</th>
            <th style="${thStyle}">Sport</th>
            <th style="${thStyle}">Views</th>
            <th style="${thStyle}">Complete</th>
          </tr>
          ${topAthletes.map((a: any, i: number) => `<tr>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${a.full_name || '-'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${a.sport_discipline || '-'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${a.profile_views || 0}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${a.profile_completeness || 0}%</td>
          </tr>`).join('')}
        </table>
      </td>
    </tr>

    <!-- Top Partner Profiles -->
    <tr>
      <td style="padding: 0 30px 30px;">
        <h2 style="${sectionTitle}">Top Partner Profiles</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #f9fafb;">
            <th style="${thStyle}">Company</th>
            <th style="${thStyle}">Industry</th>
            <th style="${thStyle}">Views</th>
            <th style="${thStyle}">Complete</th>
          </tr>
          ${topEmployers.map((e: any, i: number) => `<tr>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${e.company_name || '-'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${e.industry || '-'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${e.profile_views || 0}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${e.profile_completeness || 0}%</td>
          </tr>`).join('')}
        </table>
      </td>
    </tr>

    <!-- Recent Users -->
    <tr>
      <td style="padding: 0 30px 30px;">
        <h2 style="${sectionTitle}">Recent Users</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <tr style="background-color: #f9fafb;">
            <th style="${thStyle}">Name</th>
            <th style="${thStyle}">Email</th>
            <th style="${thStyle}">Role</th>
            <th style="${thStyle}">Joined</th>
          </tr>
          ${(recentProfiles || []).map((p: any, i: number) => `<tr>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${p.full_name || '-'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${p.email}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${roleMap[p.id] || '-'}</td>
            <td style="${i % 2 ? tdAltStyle : tdStyle}">${new Date(p.created_at).toLocaleDateString('en-US')}</td>
          </tr>`).join('')}
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 30px; text-align: center; background-color: #f8f8f8; border-top: 1px solid #eee;">
        <a href="https://usskiandsnowboard.lovable.app/dashboard" style="display: inline-block; padding: 12px 30px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; margin-bottom: 16px;">View Full Dashboard</a>
        <p style="margin: 16px 0 0; font-size: 12px; color: #999;">U.S. Ski & Snowboard - Connecting Athletes with Career Opportunities</p>
        <p style="margin: 4px 0 0; font-size: 11px; color: #bbb;">Manage your notification preferences in Settings.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
    };

    // 6. Send emails
    const results: any[] = [];
    for (const recipient of recipients) {
      const profile = recipientMap[recipient.user_id];
      if (!profile?.email) continue;

      const html = buildEmail(recipient.digest_frequency);
      const subject = `${frequencyLabel(recipient.digest_frequency)} Analytics Summary - US Ski & Snowboard`;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "U.S. Ski & Snowboard <notifications@athleteconnection.org>",
          to: [profile.email],
          subject,
          html,
        });

        results.push({
          email: profile.email,
          success: !emailError,
          error: emailError?.message,
        });
      } catch (e: any) {
        results.push({ email: profile.email, success: false, error: e.message });
      }
    }

    console.log("Summary email results:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, sent: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
