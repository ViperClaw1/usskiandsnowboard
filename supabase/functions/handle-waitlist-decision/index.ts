import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { emailTemplate, sendEmail } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "U.S. Ski & Snowboard <notifications@athleteconnection.org>";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require admin auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify the caller is an admin
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const callerId = claimsData?.claims?.sub;

  if (!callerId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: roleCheck } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleCheck) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { applicant_id, action } = await req.json();

    if (!applicant_id || !["approve", "decline"].includes(action)) {
      return new Response(JSON.stringify({ error: "applicant_id and action ('approve'|'decline') are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the applicant
    const { data: applicant, error: fetchError } = await supabaseAdmin
      .from("waitlist_applicants")
      .select("*")
      .eq("id", applicant_id)
      .single();

    if (fetchError || !applicant) {
      return new Response(JSON.stringify({ error: "Applicant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

    if (action === "decline") {
      // Update status
      await supabaseAdmin
        .from("waitlist_applicants")
        .update({ status: "declined" })
        .eq("id", applicant_id);

      // Send decline email
      const bodyHtml = `
        <p style="font-size:16px;color:#333;">Hi ${applicant.full_name},</p>
        <p style="color:#555;">Thank you for your interest in joining the U.S. Ski & Snowboard Athlete Connection Platform.</p>
        <p style="color:#555;">After reviewing your application, we are unable to approve your account at this time. We appreciate your interest and encourage you to check back in the future.</p>
        <p style="color:#555;">If you believe this decision was made in error, please contact us directly.</p>
        <p style="margin-top:24px;color:#555;">Best regards,<br/><strong>U.S. Ski & Snowboard Team</strong></p>
      `;

      await sendEmail(resend, {
        from: FROM,
        to: [applicant.email],
        subject: "Update on Your Application — U.S. Ski & Snowboard",
        html: emailTemplate("Application Update", bodyHtml),
      });

      return new Response(JSON.stringify({ success: true, action: "declined" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === APPROVE FLOW ===

    const pd = applicant.profile_data as Record<string, any>;

    // 1. Create auth user (email auto-confirmed)
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: applicant.email,
      email_confirm: true,
      user_metadata: {
        full_name: applicant.full_name,
        user_type: applicant.user_type,
      },
    });

    if (createUserError || !newUser?.user) {
      // If user already exists, try to find them
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.find((u) => u.email === applicant.email);
      if (!existingUser) {
        return new Response(JSON.stringify({ error: `Failed to create user: ${createUserError?.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Re-fetch the user to get the confirmed ID
    const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers();
    const createdUser = allUsers?.find((u) => u.email === applicant.email);
    const userId = createdUser?.id;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Could not resolve user ID after creation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Ensure profile row exists (handle_new_user trigger may have created it)
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email: applicant.email, full_name: applicant.full_name }, { onConflict: "id" });

    // 3. Assign role (ignore conflict if already set by trigger)
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: applicant.user_type }, { onConflict: "user_id,role", ignoreDuplicates: true });

    // 4. Insert profile data
    if (applicant.user_type === "athlete") {
      await supabaseAdmin.from("athlete_profiles").upsert({
        user_id: userId,
        sport_discipline: pd.sport_discipline || null,
        bio: pd.bio || null,
        availability: pd.availability || null,
        home_mountain: pd.home_mountain || null,
        instagram_url: pd.instagram_url || null,
        professional_highlights: pd.professional_highlights || null,
        email: applicant.email,
      }, { onConflict: "user_id" });
    } else {
      await supabaseAdmin.from("employer_profiles").upsert({
        user_id: userId,
        company_name: pd.company_name || applicant.full_name,
        industry: pd.industry || null,
        company_size: pd.company_size || null,
        about: pd.about || null,
        website: pd.website || null,
        linkedin_url: pd.linkedin_url || null,
        hq_location: pd.hq_location || null,
        opportunities_offered: pd.opportunities_offered || null,
        contact_email: applicant.email,
      }, { onConflict: "user_id" });
    }

    // 5. Mark applicant approved
    await supabaseAdmin
      .from("waitlist_applicants")
      .update({ status: "approved" })
      .eq("id", applicant_id);

    // 6. Generate password reset link so the user can set their password
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: applicant.email,
    });

    const loginLink = resetData?.properties?.action_link || `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify`;

    // 7. Send approval email
    const roleLabel = applicant.user_type === "athlete" ? "Athlete" : "Partner";
    const bodyHtml = `
      <p style="font-size:16px;color:#333;">Hi ${applicant.full_name},</p>
      <p style="color:#555;">Great news — your application to join the U.S. Ski & Snowboard Athlete Connection Platform has been <strong>approved</strong>!</p>
      <p style="color:#555;">Your account has been created as a <strong>${roleLabel}</strong>. Click the button below to set your password and access your dashboard:</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${loginLink}" style="display:inline-block;background-color:#003c78;color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
          Set Password &amp; Sign In
        </a>
      </div>
      <p style="color:#888;font-size:13px;">This link expires in 24 hours. If you didn't apply for this account, you can safely ignore this email.</p>
      <p style="margin-top:24px;color:#555;">Welcome aboard!<br/><strong>U.S. Ski & Snowboard Team</strong></p>
    `;

    await sendEmail(resend, {
      from: FROM,
      to: [applicant.email],
      subject: "Your Application Has Been Approved — U.S. Ski & Snowboard",
      html: emailTemplate("Application Approved! 🎉", bodyHtml),
    });

    return new Response(JSON.stringify({ success: true, action: "approved", userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
