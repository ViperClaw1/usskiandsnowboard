import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Authorizes a caller as either:
 *  1. The platform backend itself (service-role key in the Authorization header — used by DB triggers), or
 *  2. A real signed-in user (valid Supabase user JWT).
 *
 * Returns null when authorized, or a ready-to-return 401 Response when not.
 */
export async function requireUserOrService(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (serviceKey && token === serviceKey) {
    return null; // internal/system caller
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return null;
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
