import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXPERT_TOOL = {
  type: "function",
  function: {
    name: "populate_expert_profile",
    description: "Populate an expert professional profile with extracted data from LinkedIn.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string" },
        job_title: { type: "string", description: "Current role/title" },
        area_of_expertise: { type: "string", description: "Primary area of professional expertise" },
        bio: { type: "string", description: "Professional bio, 2-4 sentences" },
        photo_url: { type: "string", description: "URL to profile headshot" },
        linkedin_url: { type: "string" },
      },
      required: ["full_name"],
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
        }),
      });

      const scrapeData = await scrapeResp.json();
      if (scrapeResp.ok) {
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        truncatedMarkdown = markdown.slice(0, 15000);
      } else {
        console.warn("Firecrawl scrape failed, falling back to AI-only:", scrapeData?.error);
      }
    } catch (scrapeErr) {
      console.warn("Firecrawl request error, falling back to AI-only:", scrapeErr);
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
    const mustCallInstruction = `You MUST call the ${isExpert ? "populate_expert_profile" : isEmployer ? "populate_employer_profile" : "populate_athlete_profile"} function. Do NOT ask clarifying questions. Do NOT respond with text. Fill every field with your best guess based on the name, URL, and any available context. Every field should have a value.`;
    const systemPrompt = isExpert
      ? `You are extracting professional profile information from a LinkedIn profile for a U.S. Ski & Snowboard expert directory. The person's name is "${name}". Extract all available fields from the scraped content. Focus on their current role, area of expertise, and professional bio. ${mustCallInstruction}`
      : isEmployer
      ? `You are extracting company profile information from a website for a U.S. Ski & Snowboard partner directory. The company name is "${name}". Extract all available fields from the scraped content. For any field that cannot be determined from the content, make a reasonable suggestion based on the company name, industry context, and any other available information. ${mustCallInstruction}`
      : `You are extracting athlete profile information from an Instagram profile for a U.S. Ski & Snowboard athlete directory. The athlete's name is "${name}". Extract all available fields from the scraped content. For any field that cannot be determined from the content, make a reasonable suggestion based on the person's name, their background, and winter sports context. The athlete is associated with U.S. Ski & Snowboard. ${mustCallInstruction}`;

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

    const models = ["google/gemini-2.5-flash", "openai/gpt-5-mini", "google/gemini-2.5-flash-lite"];
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
