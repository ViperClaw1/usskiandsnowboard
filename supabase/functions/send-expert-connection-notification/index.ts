import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { emailTemplate, sendEmail, sleep } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CC_ADDRESS = "michele.lowry@usskiandsnowboard.org";
const FROM_ADDRESS = "U.S. Ski & Snowboard <notifications@athleteconnection.org>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: "Missing request_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendKey);

    // Fetch the request with expert and athlete data
    const { data: ecr, error: ecrErr } = await supabase
      .from("expert_connection_requests")
      .select(`
        id,
        message,
        expert_profiles!inner(
          id,
          full_name,
          job_title,
          area_of_expertise,
          email
        ),
        athlete_profiles!inner(
          id,
          user_id,
          sport_discipline,
          email,
          profiles!inner(full_name, email)
        )
      `)
      .eq("id", request_id)
      .single();

    if (ecrErr || !ecr) {
      console.error("Failed to fetch expert connection request:", ecrErr);
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expert = ecr.expert_profiles as any;
    const athlete = ecr.athlete_profiles as any;
    const athleteProfile = athlete.profiles;

    const expertFirstName = expert.full_name?.split(" ")[0] ?? "Expert";
    const athleteFullName = athleteProfile?.full_name ?? "Athlete";
    const athleteFirstName = athleteFullName.split(" ")[0];

    const athleteSport = Array.isArray(athlete.sport_discipline)
      ? athlete.sport_discipline.join(", ")
      : athlete.sport_discipline ?? "winter sports";

    const expertEmail = expert.email;
    const athleteEmail = athlete.email || athleteProfile?.email;

    const subject = `${athleteFullName} <> ${expert.full_name} — Athlete Connection Introduction`;

    const bodyHtml = `
      <p style="font-size:16px; color:#333; margin:0 0 20px;">
        <strong>${expertFirstName},</strong>
      </p>
      <p style="font-size:15px; color:#444; margin:0 0 16px; line-height:1.6;">
        Please meet <strong>${athleteFullName}</strong>, an accomplished professional <strong>${athleteSport}</strong> athlete and member of US Ski &amp; Snowboard.
      </p>
      <p style="font-size:15px; color:#444; margin:0 0 16px; line-height:1.6;">
        <strong>${athleteFirstName},</strong> Please meet <strong>${expert.full_name}</strong>, an expert in <strong>${expert.area_of_expertise ?? expert.job_title ?? "their field"}</strong> who is happy to speak to you about their professional experience.
      </p>
      ${ecr.message ? `
      <div style="background:#f8f9fa; border-left:4px solid #0066cc; padding:12px 16px; margin:0 0 16px; border-radius:0 4px 4px 0;">
        <p style="font-size:13px; color:#666; margin:0 0 4px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Message from ${athleteFirstName}</p>
        <p style="font-size:14px; color:#333; margin:0; font-style:italic;">"${ecr.message}"</p>
      </div>
      ` : ""}
      <p style="font-size:15px; color:#444; margin:0 0 24px; line-height:1.6;">
        <strong>${expertFirstName}</strong> will take it from here to introduce themselves and find time to connect.
      </p>
      <p style="font-size:14px; color:#666; margin:0; line-height:1.6; border-top:1px solid #eee; padding-top:20px;">
        Cheers,<br/>
        <strong>US Ski &amp; Snowboard Athlete Development Team</strong>
      </p>
    `;

    const html = emailTemplate("Athlete Connection Introduction", bodyHtml);

    // Send to expert (if email available)
    if (expertEmail) {
      await sendEmail(resend, {
        from: FROM_ADDRESS,
        to: [expertEmail],
        cc: [CC_ADDRESS],
        subject,
        html,
      });
      await sleep(1000);
    }

    // Send to athlete (if email available)
    if (athleteEmail && athleteEmail !== expertEmail) {
      await sendEmail(resend, {
        from: FROM_ADDRESS,
        to: [athleteEmail],
        cc: [CC_ADDRESS],
        subject,
        html,
      });
    }

    // If neither email found, still CC Michele
    if (!expertEmail && !athleteEmail) {
      await sendEmail(resend, {
        from: FROM_ADDRESS,
        to: [CC_ADDRESS],
        subject: `[No Expert/Athlete Email] ${subject}`,
        html,
      });
    }

    console.log("Expert connection notification sent for request:", request_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-expert-connection-notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
