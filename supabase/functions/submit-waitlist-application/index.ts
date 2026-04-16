import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, user_type, profile_data } = await req.json();

    // Validate required fields
    if (!email || !full_name || !user_type) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, full_name, user_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["athlete", "employer", "expert"].includes(user_type)) {
      return new Response(JSON.stringify({ error: "user_type must be 'athlete', 'employer', or 'expert'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS (unauthenticated insert)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check for duplicate application
    const { data: existing } = await supabase
      .from("waitlist_applicants")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      if (existing.status === "pending") {
        return new Response(JSON.stringify({ error: "An application with this email is already pending review." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (existing.status === "approved") {
        return new Response(JSON.stringify({ error: "This email already has an approved account. Please sign in." }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data, error } = await supabase
      .from("waitlist_applicants")
      .insert({
        email,
        full_name,
        user_type,
        profile_data: profile_data || {},
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify admins about the new waitlist application (non-fatal)
    try {
      await supabase.functions.invoke("send-admin-notification", {
        body: {
          notification_type: "new_waitlist_application",
          applicant_name: full_name,
          applicant_email: email,
          applicant_role: user_type,
        },
      });
    } catch (notifyErr) {
      console.error("Failed to send admin notification (non-fatal):", notifyErr);
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
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
