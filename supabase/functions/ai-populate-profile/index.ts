import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
        hq_location: { type: "string" },
        about: { type: "string", description: "Company description, 2-4 sentences" },
        website: { type: "string" },
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
        affiliation: { type: "string" },
        home_mountain: { type: "string" },
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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      }),
    });

    const scrapeData = await scrapeResp.json();
    if (!scrapeResp.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(JSON.stringify({ error: "Failed to scrape the website. Please check the URL and try again." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const truncatedMarkdown = markdown.slice(0, 15000); // Keep within token limits

    // Step 2: Call Lovable AI with tool calling
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEmployer = role === "employer";
    const systemPrompt = isEmployer
      ? `You are extracting company profile information from a website for a U.S. Ski & Snowboard partner directory. The company name is "${name}". Extract all available fields from the scraped content. For any field that cannot be determined from the content, make a reasonable suggestion based on the company name, industry context, and any other available information. Every field should have a value - do not leave fields empty.`
      : `You are extracting athlete profile information from a LinkedIn profile for a U.S. Ski & Snowboard athlete directory. The athlete's name is "${name}". Extract all available fields from the scraped content. For any field that cannot be determined from the content, make a reasonable suggestion based on the person's name, their background, and winter sports context. Every field should have a value - do not leave fields empty. The athlete is associated with U.S. Ski & Snowboard.`;

    const tool = isEmployer ? EMPLOYER_TOOL : ATHLETE_TOOL;
    const toolName = isEmployer ? "populate_employer_profile" : "populate_athlete_profile";

    console.log("Calling Lovable AI for extraction...");
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the scraped content from ${formattedUrl}:\n\n${truncatedMarkdown}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: toolName } },
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const errText = await aiResp.text();
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
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI could not extract profile data. Please try a different URL." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let profileData: Record<string, unknown>;
    try {
      profileData = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse tool args:", toolCall.function.arguments);
      return new Response(JSON.stringify({ error: "AI returned invalid data. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Extracted profile data:", JSON.stringify(profileData));

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
