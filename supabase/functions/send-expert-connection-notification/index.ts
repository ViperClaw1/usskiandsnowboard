import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { emailTemplate, sendEmail } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CC_ADDRESSES = ["michele.lowry@usskiandsnowboard.org"];

const uniqEmails = (arr: (string | null | undefined)[]) =>
  Array.from(new Set(arr.filter((x): x is string => !!x && x.trim().length > 0).map((x) => x.trim())));
const FROM_ADDRESS = "U.S. Ski & Snowboard <notifications@athleteconnection.org>";
const APP_URL = "https://usskiandsnowboard.lovable.app";

/** PostgREST may return a joined row as an object or a single-element array — normalize. */
function unwrapJoined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/**
 * Experts often have a null `expert_profiles.email` — the real inbox is on
 * `profiles.email` or Auth. Without this, request_created had no `to` address.
 */
async function resolveExpertInboxEmail(
  supabase: any,
  expert: { email?: string | null; user_id?: string | null },
): Promise<string | null> {
  if (typeof expert.email === "string" && expert.email.trim()) {
    return expert.email.trim();
  }
  const uid = expert.user_id;
  if (!uid) return null;

  const { data: prof } = (await supabase.from("profiles").select("email").eq("id", uid).maybeSingle()) as {
    data: { email?: string } | null;
  };
  const fromProfile = prof?.email;
  if (typeof fromProfile === "string" && fromProfile.trim()) {
    return fromProfile.trim();
  }

  const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(uid);
  if (authErr) {
    console.warn("[expert-notif] auth.admin.getUserById failed:", authErr.message);
    return null;
  }
  const fromAuth = authData.user?.email;
  return typeof fromAuth === "string" && fromAuth.trim() ? fromAuth.trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request_id, notification_type = "request_created" } = await req.json();
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
      .select(
        `
        id,
        message,
        expert_profiles!inner(
          id,
          user_id,
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
          bio,
          profiles!inner(full_name, email)
        )
      `,
      )
      .eq("id", request_id)
      .single();

    if (ecrErr || !ecr) {
      console.error("Failed to fetch expert connection request:", ecrErr);
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expert = unwrapJoined(ecr.expert_profiles as any);
    const athlete = unwrapJoined(ecr.athlete_profiles as any);
    const athleteProfile = unwrapJoined(athlete?.profiles) ?? athlete?.profiles;

    if (!expert || !athlete) {
      console.error("[expert-notif] Missing joined expert or athlete row", { request_id });
      return new Response(JSON.stringify({ error: "Request data incomplete" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expertFullName = expert.full_name ?? "Expert";
    const expertFirstName = expertFullName.split(" ")[0];
    const athleteFullName = athleteProfile?.full_name ?? "Athlete";
    const athleteFirstName = athleteFullName.split(" ")[0];

    // Resolve emails — athlete falls back to profiles.email
    const athleteEmail: string | null =
      (typeof athlete.email === "string" && athlete.email.trim() ? athlete.email.trim() : null) ||
      (typeof athleteProfile?.email === "string" && athleteProfile.email.trim() ? athleteProfile.email.trim() : null);

    const expertEmail: string | null = await resolveExpertInboxEmail(supabase, expert);

    const athleteSport = Array.isArray(athlete.sport_discipline)
      ? athlete.sport_discipline.join(", ")
      : (athlete.sport_discipline ?? "winter sports");

    console.log(
      `[expert-notif] type=${notification_type} request=${request_id} expertEmail=${expertEmail} athleteEmail=${athleteEmail}`,
    );

    if (notification_type === "request_created") {
      // ── Recipient: EXPERT only (CC admin) — structured "New Request" card ──
      const athleteBio = athlete.bio ?? "";
      const subject = `New Connection Request from ${athleteFullName}`;
      const bodyHtml = `
        <p style="font-size:16px; color:#333; margin:0 0 20px;">
          Hello <strong>${expertFirstName}</strong>,
        </p>
        <p style="font-size:15px; color:#444; margin:0 0 16px; line-height:1.6;">
          You have received a new connection request from <strong>${athleteFullName}</strong>!
        </p>
        <div style="background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px; padding:20px; margin:0 0 20px;">
          <p style="font-size:15px; color:#333; margin:0 0 8px;"><strong>${athleteFullName}</strong></p>
          <p style="font-size:14px; color:#666; margin:0 0 8px;">Sport: <strong>${athleteSport}</strong></p>
          ${athleteBio ? `<p style="font-size:14px; color:#555; margin:0 0 12px; line-height:1.5;">${athleteBio}</p>` : ""}
          ${
            ecr.message
              ? `
          <div style="border-top:1px solid #dee2e6; padding-top:12px; margin-top:12px;">
            <p style="font-size:13px; color:#666; margin:0 0 4px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Message from ${athleteFirstName}</p>
            <p style="font-size:14px; color:#333; margin:0; font-style:italic;">"${ecr.message}"</p>
          </div>
          `
              : ""
          }
        </div>
        <div style="text-align:center; margin:0 0 24px;">
          <a href="${APP_URL}/dashboard" style="display:inline-block; background:#0066cc; color:#ffffff; text-decoration:none; padding:12px 32px; border-radius:6px; font-size:15px; font-weight:600;">Review Request</a>
        </div>
        <p style="font-size:14px; color:#666; margin:0; line-height:1.6; border-top:1px solid #eee; padding-top:20px;">
          Cheers,<br/>
          <strong>US Ski &amp; Snowboard Athlete Development Team</strong>
        </p>
      `;
      const html = emailTemplate("New Connection Request", bodyHtml);

      if (expertEmail) {
        console.log(`[expert-notif] Sending request_created TO expert: ${expertEmail}`);
        await sendEmail(resend, {
          from: FROM_ADDRESS,
          to: [expertEmail],
          cc: CC_ADDRESSES,
          subject,
          html,
        });
      } else {
        console.warn(`[expert-notif] Expert email missing, sending to CC only`);
        await sendEmail(resend, {
          from: FROM_ADDRESS,
          to: CC_ADDRESSES,
          subject: `[Missing Expert Email] ${subject}`,
          html,
        });
      }
    } else if (notification_type === "request_accepted") {
      // ── Joint introduction email, but personalized separately for each recipient ──
      const athleteSubject = `${athleteFullName} <> ${expertFullName} — Athlete Connection Introduction`;
      const expertSubject = `${expertFullName} <> ${athleteFullName} — Expert Connection Introduction`;
      const expertiseLabel = expert.area_of_expertise ?? expert.job_title ?? "their field";
      const messageCard = (label: string) =>
        ecr.message
          ? `
        <div style="background:#f8f9fa; border-left:4px solid #0066cc; padding:12px 16px; margin:0 0 16px; border-radius:0 4px 4px 0;">
          <p style="font-size:13px; color:#666; margin:0 0 4px; font-weight:600; letter-spacing:0.5px;">${label}</p>
          <p style="font-size:14px; color:#333; margin:0; font-style:italic;">"${ecr.message}"</p>
        </div>
        `
          : "";

      const athleteBodyHtml = `
        <p style="font-size:16px; color:#333; margin:0 0 20px;">
          <strong>${athleteFirstName},</strong>
        </p>
        <p style="font-size:15px; color:#444; margin:0 0 16px; line-height:1.6;">
          Please meet <strong>${expertFullName}</strong>, an expert in <strong>${expertiseLabel}</strong> who is happy to speak to you about their professional experience.
        </p>
        <p style="font-size:15px; color:#444; margin:0 0 16px; line-height:1.6;">
          <strong>${expertFirstName},</strong> Please meet <strong>${athleteFullName}</strong>, an accomplished professional <strong>${athleteSport}</strong> athlete and member of US Ski &amp; Snowboard.
        </p>
        ${messageCard(`MESSAGE FROM ${athleteFirstName.toUpperCase()}`)}
        <p style="font-size:15px; color:#444; margin:0 0 24px; line-height:1.6;">
          <strong>${expertFirstName}</strong> will take it from here to introduce themselves and find time to connect.
        </p>
        <p style="font-size:14px; color:#666; margin:0; line-height:1.6; border-top:1px solid #eee; padding-top:20px;">
          Cheers,<br/>
          <strong>US Ski &amp; Snowboard Athlete Development Team</strong>
        </p>
      `;

      const expertBodyHtml = `
        <p style="font-size:16px; color:#333; margin:0 0 20px;">
          <strong>${expertFirstName},</strong>
        </p>
        <p style="font-size:15px; color:#444; margin:0 0 16px; line-height:1.6;">
          Please meet <strong>${athleteFullName}</strong>, an accomplished professional <strong>${athleteSport}</strong> athlete and member of US Ski &amp; Snowboard.
        </p>
        <p style="font-size:15px; color:#444; margin:0 0 16px; line-height:1.6;">
          <strong>${athleteFirstName},</strong> Please meet <strong>${expertFullName}</strong>, an expert in <strong>${expertiseLabel}</strong> who is happy to speak to you about their professional experience.
        </p>
        ${messageCard(`Message from ${athleteFirstName}`)}
        <p style="font-size:15px; color:#444; margin:0 0 24px; line-height:1.6;">
          <strong>${expertFirstName}</strong> will take it from here to introduce themselves and find time to connect.
        </p>
        <p style="font-size:14px; color:#666; margin:0; line-height:1.6; border-top:1px solid #eee; padding-top:20px;">
          Cheers,<br/>
          <strong>US Ski &amp; Snowboard Athlete Development Team</strong>
        </p>
      `;

      let athleteSent = false;
      let expertSent = false;

      // Disabled: duplicate athlete-directed intro email. The expert-directed
      // intro below CC's the athlete, so both parties still receive the
      // introduction in a single email thread.
      // if (athleteEmail) { ... athleteSubject send ... }
      void athleteSubject;
      void athleteBodyHtml;

      if (expertEmail) {
        const html = emailTemplate("Expert Connection Introduction", expertBodyHtml);
        console.log(
          `[expert-notif] Sending request_accepted expert intro TO: ${expertEmail} subject="${expertSubject}"`,
        );
        await sendEmail(resend, {
          from: FROM_ADDRESS,
          to: [expertEmail],
          cc: uniqEmails([...CC_ADDRESSES, ...CC_INTRO_EXTRA, athleteEmail]),
          subject: expertSubject,
          html,
        });
        expertSent = true;
      }

      if (!athleteSent && !expertSent) {
        console.warn("[expert-notif] Both athlete and expert emails missing; sending alert to CC only");
        const html = emailTemplate(
          "Athlete Connection Introduction",
          `<p style="font-size:15px; color:#444; margin:0 0 16px; line-height:1.6;">
             Could not deliver introduction email because both recipient emails are missing.
           </p>
           <p style="font-size:14px; color:#666; margin:0;">
             Request ID: <strong>${request_id}</strong>
           </p>`,
        );
        await sendEmail(resend, {
          from: FROM_ADDRESS,
          to: CC_ADDRESSES,
          subject: `[Missing Emails] ${athleteSubject}`,
          html,
        });
      }
    } else if (notification_type === "request_declined") {
      // ── Recipient: ATHLETE only (CC admin) ──
      const subject = "Connection Request Update";
      const bodyHtml = `
        <p style="font-size:16px; color:#333; margin:0 0 20px;">
          Hello <strong>${athleteFirstName}</strong>,
        </p>
        <p style="font-size:15px; color:#444; margin:0 0 16px; line-height:1.6;">
          <strong>${expertFullName}</strong> has declined your connection request at this time.
        </p>
        <p style="font-size:15px; color:#444; margin:0 0 24px; line-height:1.6;">
          Please keep exploring other experts and opportunities on Athlete Connection.
        </p>
        <p style="font-size:14px; color:#666; margin:0; line-height:1.6; border-top:1px solid #eee; padding-top:20px;">
          Cheers,<br/>
          <strong>US Ski &amp; Snowboard Athlete Development Team</strong>
        </p>
      `;
      const html = emailTemplate("Connection Request Update", bodyHtml);

      if (athleteEmail) {
        console.log(`[expert-notif] Sending request_declined TO athlete: ${athleteEmail}`);
        await sendEmail(resend, {
          from: FROM_ADDRESS,
          to: [athleteEmail],
          cc: CC_ADDRESSES,
          subject,
          html,
        });
      } else {
        console.warn(`[expert-notif] Athlete email missing, sending to CC only`);
        await sendEmail(resend, {
          from: FROM_ADDRESS,
          to: CC_ADDRESSES,
          subject: `[Missing Athlete Email] ${subject}`,
          html,
        });
      }
    } else {
      return new Response(JSON.stringify({ error: `Unsupported notification_type: ${notification_type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[expert-notif] Done. type=${notification_type} request=${request_id}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-expert-connection-notification error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
