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
    description: "Populate an expert professional profile with extracted data from LinkedIn. You MUST provide job_title, area_of_expertise, and bio — never leave them empty. If the scraped content is sparse, infer reasonable values from the person's name, URL, and any available context.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        job_title: { type: "string", description: "Current role/title as shown on their profile. If not explicitly found, infer from any available context (e.g. headline, experience section). Never leave blank." },
        company_name: { type: "string", description: "Current company/employer name where the person works, as shown on their LinkedIn experience section." },
        area_of_expertise: { type: "string", description: "Primary area of professional expertise based on their actual profile content — use their real industry/domain, NOT sports unless their profile is actually sports-related. Never leave blank." },
        industry: {
          type: "string",
          description: `LinkedIn industry/domain. Prefer one of: ${EXPERT_INDUSTRY_OPTIONS.join(", ")}. If none clearly fit, provide a short industry phrase from profile content.`,
        },
        bio: { type: "string", description: "Professional bio, 2-4 sentences summarizing their career based on actual profile data. Never leave blank." },
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
          enum: [
            "Alpine Skiing", "Cross-Country Skiing", "Freestyle Skiing",
            "Ski Jumping", "Nordic Combined", "Snowboarding", "Biathlon",
            "Freeski", "Other",
          ],
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
    const { role, url, name } = await req.json();
    if (!role || !url || !name) {
      return new Response(JSON.stringify({ error: "Missing required fields: role, url, name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Scrape URL with Firecrawl
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY_1") || Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);
    let truncatedMarkdown = "";
    const isLinkedIn = /(^|\.)linkedin\.com/i.test(formattedUrl);

    try {
      const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ["markdown", "links"],
          onlyMainContent: true,
          waitFor: isLinkedIn ? 3000 : 0,
          timeout: 30000,
        }),
      });

      const scrapeData = await scrapeResp.json();
      if (scrapeResp.ok) {
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        truncatedMarkdown = markdown.slice(0, 15000);
      } else {
        console.warn("Firecrawl scrape failed:", scrapeData?.error);
      }
    } catch (scrapeErr) {
      console.warn("Firecrawl request error:", scrapeErr);
    }

    // Step 2: Call Lovable AI with tool calling
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEmployer = role === "employer";
    const isExpert = role === "expert";
    const mustCallInstruction = `You MUST call the ${isExpert ? "populate_expert_profile" : isEmployer ? "populate_employer_profile" : "populate_athlete_profile"} function. Do NOT ask clarifying questions. Do NOT respond with text.`;
    const systemPrompt = isExpert
      ? `You are extracting professional profile information from a LinkedIn profile. The person's name is "${name}". This profile will be listed in a U.S. Ski & Snowboard expert/mentor directory, but the person themselves may or may NOT be related to sports at all — they could be from ANY industry (tech, finance, law, marketing, etc.). Your job is to ACCURATELY extract their REAL information as shown on their LinkedIn profile. Do NOT invent or assume sports-related content. Use the person's ACTUAL job title, industry, expertise, and bio as found on their profile.

CRITICAL RULES for job_title, area_of_expertise, and bio:
- These three fields MUST ALWAYS be filled — never return them as null or empty.
- Extract them directly from the LinkedIn profile content (headline, experience, about section, etc.).
- If the scraped content is empty or blocked, make a reasonable inference from the person's name and the LinkedIn URL slug (e.g. "linkedin.com/in/john-doe-cto" → job_title could be "CTO").
- For area_of_expertise, use their ACTUAL professional domain (e.g. "Software Engineering", "Corporate Finance", "Digital Marketing") — NOT sports.
- For bio, write 2-4 professional sentences based on available data. If data is very limited, write a brief generic professional bio using their name and any inferred role.
CRITICAL RULES for industry:
- Always return the industry field.
- First, try to map the profile to one of these exact values: ${EXPERT_INDUSTRY_OPTIONS.join(", ")}.
- If no close match exists, return a short industry phrase exactly as inferred from LinkedIn (2-5 words, no long explanation).
${mustCallInstruction}`
      : isEmployer
      ? `You are extracting company profile information from a website for a U.S. Ski & Snowboard partner directory. The company name is "${name}". Extract all available fields ACCURATELY from the scraped content. Use the company's ACTUAL industry, description, and details as found on their website. Do NOT assume the company is sports-related unless the content explicitly says so. For fields that cannot be determined, make reasonable suggestions based on actual scraped content. If no content was scraped, use only the company name — leave fields empty rather than inventing details. ${mustCallInstruction}`
      : `You are extracting athlete profile information from an Instagram profile for a U.S. Ski & Snowboard athlete directory. The athlete's name is "${name}". Extract all available fields from the scraped content. The athlete is associated with U.S. Ski & Snowboard. For fields that cannot be determined from the content, make a reasonable suggestion based on winter sports context. ${mustCallInstruction}`;

    const tool = role === "expert" ? EXPERT_TOOL : isEmployer ? EMPLOYER_TOOL : ATHLETE_TOOL;
    const toolName = role === "expert" ? "populate_expert_profile" : isEmployer ? "populate_employer_profile" : "populate_athlete_profile";
    const urlFieldName = role === "expert" ? "linkedin_url" : isEmployer ? "website" : "instagram_url";

    console.log("Calling Lovable AI for extraction...");

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
            { role: "user", content: truncatedMarkdown
              ? `Here is the scraped content from ${formattedUrl}:\n\n${truncatedMarkdown}\n\nPlease call the ${toolName} function with all extracted data.`
              : `I could not scrape the URL ${formattedUrl}. Based on the name "${name}" and the URL provided, please call the ${toolName} function with your best suggestions for all fields. Use the URL as the ${urlFieldName} value when relevant.` },
          ],
          tools: [tool],
          tool_choice: { type: "function", function: { name: toolName } },
        }),
      });
    };

    const models = [
      "google/gemini-3-flash-preview",
      "openai/gpt-5-mini",
      "google/gemini-2.5-flash",
    ];
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
