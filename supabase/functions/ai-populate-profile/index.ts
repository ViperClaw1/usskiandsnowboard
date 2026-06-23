import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPERT_INDUSTRY_OPTIONS = [
  "Technology & Software",
  "Finance & Banking",
  "Healthcare & Medical",
  "Retail & E-commerce",
  "Manufacturing",
  "Construction & Real Estate",
  "Education & Training",
  "Hospitality & Tourism",
  "Transportation & Logistics",
  "Media & Entertainment",
  "Consulting & Professional Services",
  "Energy & Utilities",
  "Telecommunications",
  "Automotive",
  "Aerospace & Defense",
  "Agriculture & Farming",
  "Biotechnology & Pharmaceuticals",
  "Consumer Goods",
  "Fashion & Apparel",
  "Food & Beverage",
  "Insurance",
  "Legal Services",
  "Marketing & Advertising",
  "Mining & Metals",
  "Non-Profit & Social Services",
  "Publishing",
  "Sports & Recreation",
  "Government & Public Sector",
  "Environmental Services",
  "Other",
] as const;

const STOP_WORDS = new Set(["and", "or", "the", "of", "services", "service"]);

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toKeywordSet = (value: string): Set<string> =>
  new Set(
    normalizeText(value)
      .split(" ")
      .map((part) => part.trim())
      .filter((part) => part.length > 2 && !STOP_WORDS.has(part)),
  );

const getIndustryMatchScore = (input: string, option: string): number => {
  const inputNorm = normalizeText(input);
  const optionNorm = normalizeText(option);
  if (!inputNorm || !optionNorm) return 0;
  if (inputNorm === optionNorm) return 1;
  if (inputNorm.includes(optionNorm) || optionNorm.includes(inputNorm)) return 0.8;

  const inputTokens = toKeywordSet(inputNorm);
  const optionTokens = toKeywordSet(optionNorm);
  if (inputTokens.size === 0 || optionTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of inputTokens) {
    if (optionTokens.has(token)) overlap += 1;
  }

  const denominator = Math.max(inputTokens.size, optionTokens.size);
  return denominator > 0 ? overlap / denominator : 0;
};

const findBestIndustryMatch = (industryValue: string): string | null => {
  const input = industryValue.trim();
  if (!input) return null;

  let bestOption: string | null = null;
  let bestScore = 0;

  for (const option of EXPERT_INDUSTRY_OPTIONS) {
    const score = getIndustryMatchScore(input, option);
    if (score > bestScore) {
      bestScore = score;
      bestOption = option;
    }
  }

  return bestScore >= 0.35 ? bestOption : null;
};

const toShortIndustry = (industryValue: string): string => {
  const compact = industryValue
    .replace(/\([^)]*\)/g, " ")
    .split(/[|;,/]/)[0]
    .replace(/\s+/g, " ")
    .trim();

  const shortValue = compact.slice(0, 48).trim();
  return shortValue || "Other";
};

const EXPERT_TOOL = {
  type: "function",
  function: {
    name: "populate_expert_profile",
    description: "Populate an expert professional profile using ONLY information explicitly present in the scraped LinkedIn content. Never fabricate or guess.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        job_title: { type: "string", description: "Current role/title exactly as stated on the profile. If not present in the content, use 'Unknown' — do not guess." },
        company_name: { type: "string", description: "Current employer exactly as stated in the experience section. Omit if not present." },
        area_of_expertise: { type: "string", description: "Short phrase reflecting the person's stated professional domain. If not derivable from the content, use 'Unknown'." },
        industry: {
          type: "string",
          description: `Industry. Prefer one of: ${EXPERT_INDUSTRY_OPTIONS.join(", ")}. Otherwise a short 2-5 word industry phrase taken from the content. Omit if not derivable.`,
        },
        bio: { type: "string", description: "2-4 sentence professional bio summarizing ONLY facts present in the scraped content. If almost nothing is available, write a single sentence stating the person's name and that no public details were available." },
        photo_url: { type: "string", description: "URL to profile headshot" },
        linkedin_url: { type: "string" },
      },
      required: ["full_name", "job_title", "area_of_expertise", "bio"],
      additionalProperties: false,
    },
  },
};

const EMPLOYER_TOOL = {
  type: "function",
  function: {
    name: "populate_employer_profile",
    description: "Populate an employer/partner profile with extracted data.",
    parameters: {
      type: "object",
      properties: {
        company_name: { type: "string" },
        industry: { type: "string" },
        company_size: { type: "string", description: "e.g. 1-10, 11-50, 51-200, 201-500, 500+" },
        hq_location: { type: "string", description: "Short location name only, e.g. 'Denver, CO' or 'Mountain West'. No parenthetical notes, explanations, or extra context." },
        about: { type: "string", description: "Company description, 2-4 sentences" },
        website: { type: "string" },
        logo_url: { type: "string", description: "URL to the company logo image found on the website. Look for img tags with 'logo' in src, alt, or class." },
        linkedin_url: { type: "string" },
        contact_person: { type: "string" },
        contact_email: { type: "string" },
        contact_title: { type: "string" },
        phone: { type: "string" },
        opportunities_offered: { type: "string", description: "Types of opportunities: internships, jobs, sponsorships, etc." },
        connection_to_ussa: { type: "string", description: "Any connection to U.S. Ski & Snowboard. If unknown, suggest something reasonable." },
        job_board_url: { type: "string" },
      },
      required: ["company_name", "industry", "about"],
      additionalProperties: false,
    },
  },
};

const ATHLETE_TOOL = {
  type: "function",
  function: {
    name: "populate_athlete_profile",
    description: "Populate an athlete profile with extracted data.",
    parameters: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        sport_discipline: {
          type: "string",
          description: "Athlete's primary sport discipline (e.g. Alpine Skiing, Moguls, Snowboard Halfpipe). Use exactly the discipline provided in the prompt.",
        },
        bio: { type: "string", description: "Athletic bio, 2-4 sentences" },
        career_interests: {
          type: "array",
          items: { type: "string" },
          description: "Career interests from: Marketing, Sales, Finance, Operations, Technology, Media, Coaching, Event Management, Product Development, Public Relations, Sponsorship Management, Hospitality, Sports Medicine, Broadcasting, Education",
        },
        skills: {
          type: "array",
          items: { type: "string" },
          description: "Skills from: Leadership, Public Speaking, Team Management, Social Media, Brand Development, Event Planning, Data Analysis, Project Management, Content Creation, Fundraising, Community Outreach, Athlete Training, Sports Analytics, Digital Marketing, Negotiation",
        },
        availability: {
          type: "string",
          enum: ["Immediate", "Off-Season Only", "Post-Retirement", "Part-Time", "Flexible"],
        },
        affiliation: { type: "string", enum: ["Current Team Member", "Former Team Member"], description: "Athlete's affiliation with U.S. Ski & Snowboard" },
        home_mountain: { type: "string", description: "Short location or mountain name only, e.g. 'Park City, UT' or 'Vail'. No parenthetical notes, explanations, or extra context." },
        photo_url: { type: "string", description: "URL to the athlete's profile photo or headshot image found on the page." },
        instagram_url: { type: "string" },
        sponsors: {
          type: "array",
          items: { type: "string" },
        },
        professional_highlights: { type: "string" },
      },
      required: ["first_name", "last_name", "sport_discipline", "bio"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { role, name } = body;
    const url: string | undefined = body.url;
    const companyName: string | undefined = body.companyName;
    const companyWebsite: string | undefined = body.companyWebsite;
    const linkedinUrl: string | undefined = body.linkedinUrl;
    const discipline: string | undefined = body.discipline;
    const instagramUrl: string | undefined = body.instagramUrl;

    if (!role || !name) {
      return new Response(JSON.stringify({ error: "Missing required fields: role, name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEmployer = role === "employer";
    const isExpert = role === "expert";
    const isAthlete = role === "athlete";

    if (isExpert) {
      if (!companyName) {
        return new Response(
          JSON.stringify({ error: "Missing required field for experts: companyName" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else if (isAthlete) {
      if (!discipline) {
        return new Response(
          JSON.stringify({ error: "Missing required field for athletes: discipline" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else if (!url) {
      return new Response(JSON.stringify({ error: "Missing required field: url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY_1") || Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ensureProtocol = (u: string) => {
      const t = u.trim();
      if (!t) return "";
      if (t.startsWith("http://") || t.startsWith("https://")) return t;
      return `https://${t}`;
    };

    const scrapeUrl = async (target: string, opts?: { waitFor?: number }): Promise<string> => {
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: target,
            formats: ["markdown"],
            onlyMainContent: true,
            waitFor: opts?.waitFor ?? 0,
            timeout: 30000,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          console.warn("Firecrawl scrape failed:", target, data?.error);
          return "";
        }
        return (data.data?.markdown || data.markdown || "").toString();
      } catch (err) {
        console.warn("Firecrawl scrape error:", target, err);
        return "";
      }
    };

    const searchWeb = async (query: string, limit = 4): Promise<string> => {
      try {
        const resp = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit,
            scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
          }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          console.warn("Firecrawl search failed:", data?.error);
          return "";
        }
        const results = (data.data || data.results || []) as Array<{
          url?: string;
          title?: string;
          description?: string;
          markdown?: string;
        }>;
        return results
          .map((r) => {
            const parts = [
              r.title ? `# ${r.title}` : "",
              r.url ? `Source: ${r.url}` : "",
              r.description || "",
              (r.markdown || "").slice(0, 4000),
            ].filter(Boolean);
            return parts.join("\n");
          })
          .join("\n\n---\n\n");
      } catch (err) {
        console.warn("Firecrawl search error:", err);
        return "";
      }
    };

    let combinedContent = "";
    let formattedUrl = "";
    let isLinkedIn = false;

    if (isExpert) {
      const segments: string[] = [];

      // 1) Company website (or search for it)
      let site = companyWebsite ? ensureProtocol(companyWebsite) : "";
      if (site) {
        console.log("Scraping company website:", site);
        const md = await scrapeUrl(site);
        if (md) segments.push(`## Company website (${site})\n\n${md.slice(0, 8000)}`);
      }

      // 2) Web search for the person at the company (always run — finds bio/about/team pages and press)
      const searchQuery = `"${name}" "${companyName}"`;
      console.log("Searching web:", searchQuery);
      const searchMd = await searchWeb(searchQuery, 4);
      if (searchMd) segments.push(`## Web search results for ${searchQuery}\n\n${searchMd}`);

      // 3) Optional LinkedIn (best-effort; do NOT fail if blocked)
      if (linkedinUrl) {
        const lnUrl = ensureProtocol(linkedinUrl);
        console.log("Scraping LinkedIn (best effort):", lnUrl);
        const lnMd = await scrapeUrl(lnUrl, { waitFor: 3000 });
        const lnTrim = lnMd.trim();
        const looksLikeWall =
          lnTrim.length < 600 ||
          /sign in to (view|see)|join linkedin|to view .* profile|security verification|authwall/i.test(
            lnTrim.toLowerCase(),
          );
        if (lnMd && !looksLikeWall) {
          segments.push(`## LinkedIn profile (${lnUrl})\n\n${lnMd.slice(0, 8000)}`);
        } else {
          console.log("LinkedIn unusable, skipping.");
        }
      }

      combinedContent = segments.join("\n\n===\n\n").slice(0, 28000);

      if (!combinedContent.trim()) {
        return new Response(
          JSON.stringify({
            error:
              "We couldn't find enough public information about this person. Try adding the company website or LinkedIn URL, or fill the fields in manually.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else if (isAthlete) {
      const segments: string[] = [];

      // 1) Instagram (optional)
      let ig = instagramUrl ? ensureProtocol(instagramUrl) : "";
      if (ig) {
        console.log("Scraping Instagram (best effort):", ig);
        const md = await scrapeUrl(ig, { waitFor: 3000 });
        const trim = md.trim();
        const looksLikeWall =
          trim.length < 400 ||
          /log in to see|see photos and videos|please wait|sign up to see|something went wrong/i.test(trim.toLowerCase());
        if (md && !looksLikeWall) {
          segments.push(`## Instagram profile (${ig})\n\n${md.slice(0, 8000)}`);
        } else {
          console.log("Instagram unusable, skipping.");
        }
      }

      // 2) Web search for athlete + discipline
      const query = `"${name}" ${discipline} U.S. Ski Snowboard`;
      console.log("Searching web:", query);
      const searchMd = await searchWeb(query, 5);
      if (searchMd) segments.push(`## Web search results for ${query}\n\n${searchMd}`);

      combinedContent = segments.join("\n\n===\n\n").slice(0, 28000);
      formattedUrl = ig;

      if (!combinedContent.trim()) {
        return new Response(
          JSON.stringify({
            error:
              "We couldn't find enough public information about this athlete. Try adding an Instagram URL, or fill the fields in manually.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      formattedUrl = ensureProtocol(url!);
      isLinkedIn = /(^|\.)linkedin\.com/i.test(formattedUrl);
      console.log("Scraping URL:", formattedUrl);
      const md = await scrapeUrl(formattedUrl, { waitFor: isLinkedIn ? 3000 : 0 });
      combinedContent = md.slice(0, 15000);
    }

    // Step 2: Call Lovable AI with tool calling
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mustCallInstruction = `You MUST call the ${isExpert ? "populate_expert_profile" : isEmployer ? "populate_employer_profile" : "populate_athlete_profile"} function. Do NOT ask clarifying questions. Do NOT respond with text.`;
    const systemPrompt = isExpert
      ? `You are extracting a professional profile for "${name}" who currently works at "${companyName}". The provided content includes the company's website, public web search results that mention the person, and (optionally) their LinkedIn profile.

ABSOLUTE RULES — read carefully:
- NEVER invent, guess, or infer facts that are not literally in the provided content. Do not guess based on the person's name, the URL slug, or what's common in their industry.
- Only attribute information to "${name}" if the content explicitly mentions them by name (or by an obvious variation/initials). Do NOT attribute generic company information to this individual.
- If a field is not clearly supported by the content, OMIT it. For required fields (job_title, area_of_expertise, bio): if you can't derive them from content that explicitly mentions the person, use "Unknown" for job_title / area_of_expertise, and write a one-sentence bio stating the person's name, the company, and that no further public details were available.
- company_name MUST be "${companyName}" unless content clearly shows they no longer work there.
- bio: 2-4 sentences, ONLY facts found about this specific person in the content.
- job_title: their CURRENT role at "${companyName}" as stated in the content.
- area_of_expertise: short phrase reflecting their actual stated domain.
- industry: prefer one of: ${EXPERT_INDUSTRY_OPTIONS.join(", ")}. Otherwise a short 2-5 word phrase taken from the content.
- photo_url: only if an actual headshot URL appears in the content.

${mustCallInstruction}`
      : isEmployer
      ? `You are extracting company profile information from a website for a U.S. Ski & Snowboard partner directory. The company name is "${name}". Extract ONLY fields explicitly supported by the scraped content. Do NOT invent or guess. If a field is not present, omit it. Do NOT assume the company is sports-related unless the content explicitly says so. ${mustCallInstruction}`
      : `You are extracting an athlete profile for "${name}", a "${discipline}" athlete in the U.S. Ski & Snowboard community. The provided content includes public web search results that mention the athlete, and (optionally) their Instagram profile.

ABSOLUTE RULES — read carefully:
- NEVER invent, guess, or infer facts that are not literally in the provided content. Do not guess based on the athlete's name, the URL, or what's common in their discipline.
- Only attribute information to "${name}" if the content explicitly mentions them by name (or an obvious variation). Do NOT attribute generic team/discipline information to this individual.
- sport_discipline MUST be "${discipline}" — do not change it.
- first_name and last_name: split from "${name}".
- bio: 2-4 sentences summarizing ONLY facts found about this specific athlete in the content. If almost nothing is available, write one sentence stating the athlete's name and discipline.
- home_mountain, sponsors, professional_highlights, photo_url, instagram_url: only include if explicitly stated in the content.
- Do NOT fabricate career_interests, skills, availability, or affiliation if not stated.

${mustCallInstruction}`;

    const tool = role === "expert" ? EXPERT_TOOL : isEmployer ? EMPLOYER_TOOL : ATHLETE_TOOL;
    const toolName = role === "expert" ? "populate_expert_profile" : isEmployer ? "populate_employer_profile" : "populate_athlete_profile";
    const urlFieldName = role === "expert" ? "linkedin_url" : isEmployer ? "website" : "instagram_url";

    console.log("Calling Lovable AI for extraction...");

    const userMessage = isExpert
      ? `Here is the gathered content about "${name}" at "${companyName}":\n\n${combinedContent}\n\nCall the ${toolName} function using ONLY information about this specific person found in the content above. ${linkedinUrl ? `Set linkedin_url to ${ensureProtocol(linkedinUrl)}.` : ""}`
      : isAthlete
      ? `Here is the gathered content about "${name}" (${discipline}):\n\n${combinedContent}\n\nCall the ${toolName} function using ONLY information about this specific athlete found in the content above. Set sport_discipline to "${discipline}". ${instagramUrl ? `Set instagram_url to ${ensureProtocol(instagramUrl)}.` : ""}`
      : combinedContent
      ? `Here is the scraped content from ${formattedUrl}:\n\n${combinedContent}\n\nCall the ${toolName} function using ONLY information explicitly found in the content above. Use ${formattedUrl} as the ${urlFieldName} value.`
      : `I could not scrape ${formattedUrl}. Call the ${toolName} function with ONLY the values you can derive from the URL itself and the name "${name}". Set ${urlFieldName} to ${formattedUrl}. Do NOT invent any other content — leave all other fields empty.`;

    const makeAiCall = async (model: string) => {
      return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: toolName } },
          temperature: 0.1,
        }),
      });
    };

    // Experts & athletes: prefer the stronger model first since content is sparse and identity matters.
    const models = isExpert || isAthlete
      ? ["openai/gpt-5-mini", "google/gemini-3-flash-preview", "google/gemini-2.5-flash"]
      : ["google/gemini-3-flash-preview", "openai/gpt-5-mini", "google/gemini-2.5-flash"];
    let aiResp: Response | null = null;
    for (const model of models) {
      console.log("Trying model:", model);
      aiResp = await makeAiCall(model);
      if (aiResp.ok) break;
      console.error(`Model ${model} failed with status ${aiResp.status}`);
    }



    if (!aiResp || !aiResp.ok) {
      const status = aiResp?.status || 0;
      const errText = aiResp ? await aiResp.text() : "No response";
      console.error("AI error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI extraction failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    let profileData: Record<string, unknown>;
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const toolArgs = toolCall?.function?.arguments;

    if (toolArgs) {
      try {
        profileData = JSON.parse(toolArgs);
      } catch {
        console.error("Failed to parse tool args:", toolArgs);
        return new Response(JSON.stringify({ error: "AI returned invalid data. Please try again." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Fallback: some model/provider paths occasionally return JSON in content
      // instead of tool_calls even when tools are requested.
      const content = aiData.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        console.error("No tool call/content in AI response:", JSON.stringify(aiData));
        return new Response(JSON.stringify({ error: "AI could not extract profile data. Please try a different URL." }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("No JSON object in AI content:", content);
        return new Response(JSON.stringify({ error: "AI could not extract profile data. Please try a different URL." }), {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        profileData = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      } catch {
        console.error("Failed to parse JSON content:", content);
        return new Response(JSON.stringify({ error: "AI returned invalid data. Please try again." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("Extracted profile data:", JSON.stringify(profileData));

    if (isExpert) {
      const extractedIndustry =
        (typeof profileData.industry === "string" && profileData.industry.trim()) ||
        (typeof profileData.area_of_expertise === "string" && profileData.area_of_expertise.trim()) ||
        "";

      if (extractedIndustry) {
        const matchedIndustry = findBestIndustryMatch(extractedIndustry);
        profileData.industry = matchedIndustry ?? toShortIndustry(extractedIndustry);
      }
    }

    if (isEmployer && typeof profileData.industry === "string" && profileData.industry.trim()) {
      profileData.industry = toShortIndustry(profileData.industry);
    }

    // Step 3: Download and re-upload external images to Supabase Storage (server-side, no CORS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const pickFirstString = (obj: Record<string, unknown>, keys: string[]): string | null => {
      for (const key of keys) {
        const value = obj[key];
        if (typeof value === "string" && value.trim()) return value.trim();
      }
      return null;
    };

    const uploadImage = async (externalUrl: string | undefined | null, bucket: string, userId: string): Promise<string | null> => {
      if (!externalUrl || typeof externalUrl !== "string") return null;
      const trimmed = externalUrl.trim();
      if (!trimmed || !trimmed.startsWith("http")) return null;
      // Skip if already a Supabase URL
      if (trimmed.includes(supabaseUrl)) return trimmed;

      try {
        const imgResp = await fetch(trimmed, {
          headers: {
            "user-agent": "Mozilla/5.0 (compatible; AIProfileBot/1.0)",
            accept: "image/*,*/*;q=0.8",
          },
        });
        if (!imgResp.ok) { console.warn("Image fetch failed:", imgResp.status); return null; }
        const blob = await imgResp.blob();
        if (!blob.type.startsWith("image/")) return null;
        const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg";
        const fileName = `${userId}/ai-profile-${Date.now()}.${ext}`;

        const uploadResp = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": blob.type,
            "x-upsert": "true",
          },
          body: blob,
        });
        if (!uploadResp.ok) { console.warn("Storage upload failed:", await uploadResp.text()); return null; }

        return `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
      } catch (err) {
        console.warn("Image upload error:", err);
        return null;
      }
    };

    // Get user ID from auth header for storage path
    const authHeader = req.headers.get("authorization") || "";
    let callerUserId: string | null = null;
    try {
      const sb = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await sb.auth.getUser();
      callerUserId = caller?.id || null;
    } catch { /* ignore */ }

    if (callerUserId) {
      if (isExpert || (!isEmployer && !isExpert)) {
        // Expert or Athlete: upload photo_url
        const bucket = isExpert ? "expert-photos" : "athlete-photos";
        const sourcePhotoUrl = pickFirstString(profileData, [
          "photo_url",
          "image_url",
          "profile_image_url",
          "avatar_url",
          "headshot_url",
        ]);
        const uploaded = await uploadImage(sourcePhotoUrl, bucket, callerUserId);
        if (uploaded) profileData.photo_url = uploaded;
      }
      if (isEmployer) {
        // Employer: upload logo_url
        const sourceLogoUrl = pickFirstString(profileData, ["logo_url", "image_url"]);
        const uploaded = await uploadImage(sourceLogoUrl, "company-logos", callerUserId);
        if (uploaded) profileData.logo_url = uploaded;
      }
    }

    return new Response(JSON.stringify({ success: true, data: profileData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-populate-profile error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
