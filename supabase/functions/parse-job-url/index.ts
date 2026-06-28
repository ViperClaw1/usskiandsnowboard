// Parse a job posting URL into structured fields.
// Tries Firecrawl first; falls back to LinkedIn's public guest endpoint and
// to URL-derived hints so the confirmation step is always populated.

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
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

    // Always-available URL-derived hints so confirmation form is never empty.
    const urlHints = deriveHintsFromUrl(url);

    // --- Try Firecrawl ---
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
          body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 1500 }),
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

    const looksLikeAuthWall =
      !pageText ||
      /sign in to (linkedin|view)/i.test(pageText) ||
      /join linkedin/i.test(pageText) ||
      pageText.length < 200;

    // --- LinkedIn fallback: guest endpoint (no auth required) ---
    const isLinkedIn = /linkedin\.com/i.test(url);
    if (isLinkedIn && looksLikeAuthWall) {
      const jobId = extractLinkedInJobId(url);
      if (jobId) {
        try {
          const guestUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
          const r = await fetch(guestUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; AthleteConnectionBot/1.0)",
              "Accept": "text/html,application/xhtml+xml",
            },
          });
          if (r.ok) {
            const html = await r.text();
            const stripped = stripHtml(html).slice(0, 8000);
            if (stripped.length > 100) {
              pageText = stripped;
              const t = html.match(/<h2[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)<\/h2>/i)
                || html.match(/<title>([^<]+)<\/title>/i);
              if (t && !metaTitle) metaTitle = t[1].trim();
            }
          }
        } catch (e) {
          console.error("LinkedIn guest fetch error:", e);
        }
      }
    }

    const parseStatus = pageText ? "scraped" : "blocked";
    let parsed: any = {
      job_title: urlHints.job_title,
      company: urlHints.company,
      location: "",
      employment_type: "",
      industry: "",
      remote_status: "",
    };

    if (LOVABLE_API_KEY && (pageText || metaTitle)) {
      try {
        const sys = `Extract job posting fields from the provided page content. Return ONLY a JSON object with these exact keys: job_title, company, location, employment_type, industry, remote_status. employment_type MUST be one of: ${EMPLOYMENT_TYPES.join(", ")}. remote_status MUST be one of: ${REMOTE_STATUSES.join(", ")}. industry MUST be chosen from this list (best fit): ${(industries.length ? industries : ["Other"]).join(", ")}. If a field is unknown, return an empty string. Do not invent data.`;

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
              { role: "user", content: `URL: ${url}\nPage title: ${metaTitle}\nURL-derived hints: ${JSON.stringify(urlHints)}\n\nContent:\n${pageText || "(no body content; infer from URL/title only)"}` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          const text = data?.choices?.[0]?.message?.content ?? "{}";
          const obj = JSON.parse(text);
          parsed = {
            job_title: str(obj.job_title) || metaTitle || urlHints.job_title || "",
            company: str(obj.company) || urlHints.company || "",
            location: str(obj.location),
            employment_type: EMPLOYMENT_TYPES.includes(obj.employment_type) ? obj.employment_type : "",
            industry: industries.includes(obj.industry) ? obj.industry : (str(obj.industry) || ""),
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
    } else if (metaTitle && !parsed.job_title) {
      parsed.job_title = metaTitle;
    }

    // Final guarantees: never return entirely blank confirmation
    if (!parsed.job_title) parsed.job_title = metaTitle || urlHints.job_title || "";
    if (!parsed.company) parsed.company = urlHints.company || "";

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

function extractLinkedInJobId(url: string): string | null {
  const m1 = url.match(/\/jobs\/view\/(\d+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]currentJobId=(\d+)/);
  if (m2) return m2[1];
  const m3 = url.match(/\/jobs\/[^\/]*-(\d{6,})/);
  if (m3) return m3[1];
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveHintsFromUrl(url: string): { job_title: string; company: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    let company = "";
    // greenhouse/lever/ashby-style: company.greenhouse.io, jobs.lever.co/company, boards.greenhouse.io/company
    const greenhouseMatch = u.pathname.match(/^\/([^\/]+)\//);
    if (/greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com/i.test(host) && greenhouseMatch) {
      company = decodeURIComponent(greenhouseMatch[1]).replace(/[-_]/g, " ");
    } else if (!/linkedin\.com|indeed\.com|glassdoor\.com|ziprecruiter\.com/i.test(host)) {
      company = host.split(".")[0].replace(/[-_]/g, " ");
    }
    // Last path segment is often a job-title slug
    const segs = u.pathname.split("/").filter(Boolean);
    const last = segs[segs.length - 1] ?? "";
    let title = "";
    if (last && !/^\d+$/.test(last)) {
      title = decodeURIComponent(last)
        .replace(/\.(html|aspx|php)$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      // Drop trailing numeric job-id tokens
      title = title.replace(/\s+\d{4,}$/, "").trim();
    }
    return {
      job_title: title,
      company: company ? company.replace(/\b\w/g, (c) => c.toUpperCase()).trim() : "",
    };
  } catch {
    return { job_title: "", company: "" };
  }
}
