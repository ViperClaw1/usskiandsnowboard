import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { emailTemplate, sendEmail } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const FROM = "U.S. Ski & Snowboard <notifications@athleteconnection.org>";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (roleError || !roleData) throw new Error("Only admins can invite users");

    const { email, firstName, lastName, role } = await req.json();
    if (!email || !role) throw new Error("Email and role are required");

    console.log("Creating user:", email, "with role:", role);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find((u) => u.email === email);
    let userId: string;

    if (existingUser) {
      console.log("User already exists, resending invitation:", existingUser.id);
      userId = existingUser.id;

      if (firstName || lastName) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            first_name: firstName || existingUser.user_metadata?.first_name || "",
            last_name: lastName || existingUser.user_metadata?.last_name || "",
            full_name:
              `${firstName || existingUser.user_metadata?.first_name || ""} ${lastName || existingUser.user_metadata?.last_name || ""}`.trim(),
          },
        });
      }

      const { data: existingProfile } = await supabaseAdmin.from("profiles").select("id").eq("id", userId).single();
      if (existingProfile) {
        await supabaseAdmin
          .from("profiles")
          .update({
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: `${firstName || ""} ${lastName || ""}`.trim() || null,
          })
          .eq("id", userId);
      } else {
        await supabaseAdmin.from("profiles").insert({
          id: userId,
          email,
          first_name: firstName || null,
          last_name: lastName || null,
          full_name: `${firstName || ""} ${lastName || ""}`.trim() || null,
        });
      }

      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", role)
        .single();
      if (!existingRole) {
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
      }
    } else {
      const tempPassword = crypto.randomUUID().slice(0, 16);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName || "",
          last_name: lastName || "",
          full_name: `${firstName || ""} ${lastName || ""}`.trim(),
        },
      });
      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      console.log("User created successfully:", newUser.user.id);
      userId = newUser.user.id;

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            email,
            first_name: firstName || null,
            last_name: lastName || null,
            full_name: `${firstName || ""} ${lastName || ""}`.trim() || null,
          },
          { onConflict: "id" },
        );
      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw profileError;
      }

      const { error: roleAssignError } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
      if (roleAssignError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw roleAssignError;
      }
    }

    // Generate password-set link
    const appUrl = "https://athleteconnection.org/";
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw resetError;
    }

    const directLink = `${appUrl}/reset-password?invited=true&token_hash=${resetData.properties.hashed_token}&type=recovery`;
    console.log("Sending invitation email to:", email);

    const bodyHtml = `
      <p style="margin: 0 0 20px; font-size: 16px;">
        You've been invited to join the U.S. Ski &amp; Snowboard platform as a <strong>${role}</strong>.
      </p>
      <p style="margin: 0 0 30px; font-size: 16px;">
        To get started, please set your password by clicking the button below:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <a href="${directLink}" style="display: inline-block; padding: 16px 40px; background-color: #0066cc; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Set Your Password</a>
          </td>
        </tr>
      </table>
      <p style="margin: 30px 0 10px; font-size: 14px; color: #666;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin: 0 0 30px; padding: 15px; background-color: #f4f4f4; border-radius: 5px; font-size: 12px; word-break: break-all; color: #333;">
        ${directLink}
      </p>
      <p style="margin: 0 0 10px; font-size: 14px; color: #666;">
        Your login email is: <strong>${email}</strong>
      </p>
      <p style="margin: 0; font-size: 14px; color: #999;">This link will expire in 24 hours.</p>`;

    try {
      await sendEmail(resend, {
        from: FROM,
        to: [email],
        subject: "Welcome to U.S. Ski & Snowboard - Set Your Password",
        html: emailTemplate("Welcome to U.S. Ski & Snowboard!", bodyHtml),
      });
      console.log("Invitation email sent successfully");
    } catch (emailErr) {
      console.error("Error sending email:", emailErr);
      return new Response(
        JSON.stringify({ success: true, user, emailError: "User created but email failed to send" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, user }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in invite-user function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
