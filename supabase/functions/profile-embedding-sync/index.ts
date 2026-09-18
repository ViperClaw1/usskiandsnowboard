import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMBEDDING_MODEL = "google/gemini-embedding-2";
const EMBEDDING_DIMS = 3072;

const buildAthleteContent = (p: any): string => {
  const parts: string[] = [];
  const fullName = p?.profiles?.full_name || p?.email || "";
  if (fullName) parts.push(`Athlete: ${fullName}`);
  if (p?.sport_discipline?.length) parts.push(`Sport disciplines: ${p.sport_discipline.join(", ")}`);
  if (p?.bio) parts.push(`Bio: ${p.bio}`);
  if (p?.professional_highlights) parts.push(`Highlights: ${p.professional_highlights}`);
  if (p?.career_interests?.length) parts.push(`Career interests: ${p.career_interests.join(", ")}`);
  if (p?.skills?.length) parts.push(`Skills: ${p.skills.join(", ")}`);
  if (p?.geographic_preferences?.length) parts.push(`Location preferences: ${p.geographic_preferences.join(", ")}`);
  if (p?.sponsors?.length) parts.push(`Sponsors: ${p.sponsors.join(", ")}`);
  if (p?.home_mountain) parts.push(`Home mountain: ${p.home_mountain}`);
  if (p?.availability) parts.push(`Availability: ${p.availability}`);
  return parts.join("\n").slice(0, 8000);
};

const buildExpertContent = (p: any): string => {
  const parts: string[] = [];
  if (p?.full_name) parts.push(`Expert: ${p.full_name}`);
  if (p?.job_title) parts.push(`Job title: ${p.job_title}`);
  if (p?.company_name) parts.push(`Company: ${p.company_name}`);
  if (p?.area_of_expertise) parts.push(`Area of expertise: ${p.area_of_expertise}`);
  if (p?.industry) parts.push(`Industry: ${p.industry}`);
  if (p?.bio) parts.push(`Bio: ${p.bio}`);
  if (p?.ussa_affiliate && p.ussa_affiliate !== "No formal affiliation") {
    parts.push(`U.S. Ski & Snowboard affiliation: ${p.ussa_affiliate}`);
  }
  return parts.join("\n").slice(0, 8000);
};

const callEmbedding = async (apiKey: string, content: string): Promise<number[] | null> => {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Lovable-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: content }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Embedding error:", res.status, errText);
    return null;
  }

  const json = await res.json();
  const embedding = json?.data?.[0]?.embedding;
  return Array.isArray(embedding) && embedding.length === EMBEDDING_DIMS ? embedding : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s*/i, "").trim();
    // DB triggers (pg_net) may reach this function without a usable secret, so an
    // absent token or the public anon key is treated as an internal trigger call.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const isServiceCall = token === serviceKey || token === anonKey || token === "";

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const { profile_id: profileId, role } = body;

    if (!profileId || (role !== "athlete" && role !== "expert")) {
      return new Response(JSON.stringify({ error: "Missing or invalid profile_id / role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate-limit unauthenticated (trigger-style) calls: skip if embedded recently.
    if (token === anonKey || token === "") {
      const { data: recent } = await supabase
        .from("profile_embeddings")
        .select("updated_at")
        .eq("profile_id", profileId)
        .gte("updated_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
        .maybeSingle();
      if (recent) {
        return new Response(JSON.stringify({ success: true, skipped: "rate_limited" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // User calls must own the profile.
    if (!isServiceCall) {
      const { data: userData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const table = role === "athlete" ? "athlete_profiles" : "expert_profiles";
      const { data: owned } = await supabase.from(table).select("id, user_id").eq("id", profileId).maybeSingle();
      if (!owned || owned.user_id !== userData.user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const table = role === "athlete" ? "athlete_profiles" : "expert_profiles";
    const selectCols =
      role === "athlete"
        ? "*, profiles(full_name)"
        : "*";
    const { data: profile, error: fetchErr } = await supabase
      .from(table)
      .select(selectCols)
      .eq("id", profileId)
      .maybeSingle();

    if (fetchErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = role === "athlete" ? buildAthleteContent(profile) : buildExpertContent(profile);
    if (!content.trim()) {
      // Nothing meaningful to embed — remove any stale vector.
      await supabase.from("profile_embeddings").delete().eq("profile_id", profileId);
      return new Response(JSON.stringify({ success: true, skipped: "empty_content" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embedding = await callEmbedding(lovableKey, content);
    if (!embedding) {
      return new Response(JSON.stringify({ error: "Failed to compute embedding" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertErr } = await supabase.from("profile_embeddings").upsert(
      {
        profile_id: profileId,
        role,
        content,
        embedding,
        model: EMBEDDING_MODEL,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" },
    );

    if (upsertErr) {
      console.error("Upsert error:", upsertErr);
      return new Response(JSON.stringify({ error: "Failed to store embedding" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("profile-embedding-sync error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
