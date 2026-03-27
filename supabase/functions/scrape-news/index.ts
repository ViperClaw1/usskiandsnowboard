import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NewsArticle {
  title: string;
  url: string;
  date: string | null;
  excerpt: string;
  image_url: string | null;
  source_order: number;
  updated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require a valid JWT and admin role
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = authHeader.replace("Bearer ", "");

  // Allow service role key to bypass user/admin checks (trusted server calls like cron jobs)
  const isServiceRoleCall = token === serviceRoleKey;

  if (!isServiceRoleCall) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log("Starting news scraping via Firecrawl...");

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY_1") || Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://www.usskiandsnowboard.org/news",
        formats: ["markdown", "links"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error("Firecrawl API error:", scrapeData);
      return new Response(JSON.stringify({ success: false, error: scrapeData.error || "Firecrawl scrape failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const markdown: string = scrapeData.data?.markdown || scrapeData.markdown || "";
    const links: string[] = scrapeData.data?.links || scrapeData.links || [];

    console.log("Firecrawl returned markdown length:", markdown.length, "links:", links.length);

    const newsLinks = links
      .filter((link: string) => /usskiandsnowboard\.org\/news\//.test(link))
      .map((link: string) => link.split("?")[0].split("#")[0])
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

    console.log("Filtered news article links:", newsLinks.length);

    const articles: NewsArticle[] = [];
    const seenUrls = new Set<string>();
    const currentTimestamp = new Date().toISOString();
    let sourceOrderCounter = 0;

    // Build a map of article URL -> image URL from markdown image-link patterns
    // Pattern: [![alt](IMAGE_URL)](ARTICLE_URL)
    const imageMap = new Map<string, string>();
    const imageLinkPattern = /\[!\[[^\]]*\]\(([^)]+)\)\]\(((?:https?:\/\/(?:www\.)?usskiandsnowboard\.org)?\/news\/[^)]+)\)/g;
    let imgMatch;
    while ((imgMatch = imageLinkPattern.exec(markdown)) !== null) {
      let articleUrl = imgMatch[2].trim();
      if (articleUrl.startsWith("/")) {
        articleUrl = `https://www.usskiandsnowboard.org${articleUrl}`;
      }
      articleUrl = articleUrl.split("?")[0].split("#")[0];
      const imageUrl = imgMatch[1].trim();
      if (!imageMap.has(articleUrl)) {
        imageMap.set(articleUrl, imageUrl);
      }
    }
    console.log("Image map entries:", imageMap.size);

    // Strategy 1: Extract from markdown link patterns
    const linkPattern = /\[([^\]]{10,})\]\(((?:https?:\/\/(?:www\.)?usskiandsnowboard\.org)?\/news\/[^)]+)\)/g;
    let match;

    while ((match = linkPattern.exec(markdown)) !== null) {
      const title = match[1].trim();
      let url = match[2].trim();

      // Skip image-wrapped links (already captured in imageMap)
      if (title.startsWith("![")) continue;

      if (url.startsWith("/")) {
        url = `https://www.usskiandsnowboard.org${url}`;
      }
      url = url.split("?")[0].split("#")[0];

      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const afterMatch = markdown.substring(match.index + match[0].length, match.index + match[0].length + 500);

      let date: string | null = null;

      const updatedMatch = afterMatch.match(/(?:Last\s+)?Updated[:\s]+(\w+ \d{1,2},?\s*\d{4})/i);
      if (updatedMatch) {
        const parsed = new Date(updatedMatch[1]);
        if (!isNaN(parsed.getTime())) {
          date = parsed.toISOString().split("T")[0];
        }
      }

      if (!date) {
        const dateMatch = afterMatch.match(/(\w+ \d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/);
        if (dateMatch) {
          const parsed = new Date(dateMatch[1]);
          if (!isNaN(parsed.getTime())) {
            date = parsed.toISOString().split("T")[0];
          }
        }
      }

      // Extract excerpt with improved filtering
      const lines = afterMatch
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      let excerpt = title;
      for (const line of lines) {
        if (
          line.length > 20 &&
          !/^\d/.test(line) &&
          !line.startsWith("[") &&
          !line.startsWith("#") &&
          !line.startsWith("- ") &&
          !line.startsWith("*") &&
          !/!\[/.test(line) &&
          !/simpleads/i.test(line) &&
          !/https?:\/\//i.test(line) &&
          !/^(Last\s+)?Updated/i.test(line) &&
          !/^\d{1,2}\/\d{1,2}\/\d{4}/.test(line) &&
          !/\]\(/.test(line)
        ) {
          excerpt = line.substring(0, 200);
          break;
        }
      }

      const image_url = imageMap.get(url) || null;

      articles.push({
        title,
        url,
        date,
        excerpt,
        image_url,
        source_order: sourceOrderCounter++,
        updated_at: currentTimestamp,
      });
      console.log(`Parsed article: ${title} (date: ${date}, image: ${!!image_url}, order: ${sourceOrderCounter - 1})`);
    }

    // Strategy 2: fallback for links not found in markdown
    if (articles.length < 3) {
      for (const link of newsLinks) {
        if (seenUrls.has(link)) continue;
        seenUrls.add(link);

        const slug = link.split("/news/")[1] || "";
        const title = slug
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim();

        if (title.length < 10) continue;

        articles.push({
          title,
          url: link,
          date: null,
          excerpt: title,
          image_url: imageMap.get(link) || null,
          source_order: sourceOrderCounter++,
          updated_at: currentTimestamp,
        });
      }
    }

    console.log(`Total articles parsed: ${articles.length}`);

    if (articles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No articles found from Firecrawl response.", articlesProcessed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = serviceClient;

    const { error } = await supabase
      .from("news_articles")
      .upsert(articles, { onConflict: "url", ignoreDuplicates: false });

    if (error) {
      console.error("Error inserting articles:", error);
      throw error;
    }

    console.log("Successfully stored articles in database");

    return new Response(
      JSON.stringify({
        success: true,
        articlesProcessed: articles.length,
        message: "News articles scraped and stored successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in scrape-news function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
