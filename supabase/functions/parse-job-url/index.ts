// Parse a job posting URL into structured fields.
// Uses Firecrawl to scrape, then Lovable AI Gateway to extract structured data.
// Auth-guarded: requires a valid Supabase user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const EMPLOYMENT_TYPES = [
  "Full-time","Part-time","Contract","Internship","Seasonal","Temporary",
];
const REMOTE_STATUSES = ["Remote", "Hybrid", "On-site"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supa.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const url = (body?.url ?? "").trim();
    const industries: string[] = Array.isArray(body?.industries) ? body.industries : [];
    if (!url || !/^https?:\/\//i.test(url)) {
      return json({ error: "Valid URL required" }, 400);
    }

    // --- Scrape (best effort) ---
    let pageText = "";
    let metaTitle = "";
    if (FIRECRAWL_API_KEY) {
      try {
        const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });
        if (fcRes.ok) {
          const fc = await fcRes.json();
          pageText = (fc?.data?.markdown ?? fc?.markdown ?? "").slice(0, 8000);
          metaTitle = fc?.data?.metadata?.title ?? fc?.metadata?.title ?? "";
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // --- AI extract ---
    const parseStatus = pageText ? "scraped" : "blocked";
    let parsed: any = {
      job_title: "",
      company: "",
      location: "",
      employment_type: "",
      industry: "",
      remote_status: "",
    };

    if (LOVABLE_API_KEY && (pageText || metaTitle)) {
      try {
        const sys = `Extract job posting fields from the provided page content. Return ONLY a JSON object with these exact keys: job_title, company, location, employment_type, industry, remote_status. employment_type MUST be one of: ${EMPLOYMENT_TYPES.join(", ")}. remote_status MUST be one of: ${REMOTE_STATUSES.join(", ")}. industry should ideally be one of: ${(industries.length ? industries : ["Sports & Recreation","Marketing & Media","Finance","Technology","Hospitality","Healthcare","Education","Nonprofit","Sales","Operations","Other"]).join(", ")}. If a field is unknown, return an empty string for it. Do not invent data.`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Lovable-API-Key": LOVABLE_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: `URL: ${url}\nPage title: ${metaTitle}\n\nContent:\n${pageText || "(no body content; infer from URL/title only)"}` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          const text = data?.choices?.[0]?.message?.content ?? "{}";
          const obj = JSON.parse(text);
          parsed = {
            job_title: str(obj.job_title) || metaTitle || "",
            company: str(obj.company),
            location: str(obj.location),
            employment_type: EMPLOYMENT_TYPES.includes(obj.employment_type) ? obj.employment_type : "",
            industry: str(obj.industry),
            remote_status: REMOTE_STATUSES.includes(obj.remote_status) ? obj.remote_status : "",
          };
        } else if (aiRes.status === 429) {
          return json({ error: "AI rate limit, please try again shortly", parse_status: "blocked", parsed }, 429);
        } else if (aiRes.status === 402) {
          return json({ error: "AI credits exhausted", parse_status: "blocked", parsed }, 402);
        }
      } catch (e) {
        console.error("AI extract error:", e);
      }
    } else if (metaTitle) {
      parsed.job_title = metaTitle;
    }

    return json({ parse_status: parseStatus, parsed });
  } catch (e) {
    console.error("parse-job-url error:", e);
    return json({ error: "Internal error" }, 500);
  }
});

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
