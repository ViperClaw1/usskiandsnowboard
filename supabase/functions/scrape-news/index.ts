import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NewsArticle {
  title: string;
  url: string;
  date: string;
  excerpt: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting news scraping via Firecrawl...');

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Firecrawl scrape API
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.usskiandsnowboard.org/news',
        formats: ['markdown', 'links'],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error('Firecrawl API error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || 'Firecrawl scrape failed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown: string = scrapeData.data?.markdown || scrapeData.markdown || '';
    const links: string[] = scrapeData.data?.links || scrapeData.links || [];

    console.log('Firecrawl returned markdown length:', markdown.length, 'links:', links.length);

    // Filter links to news article URLs
    const newsLinks = links
      .filter((link: string) => /usskiandsnowboard\.org\/news\//.test(link))
      .map((link: string) => link.split('?')[0].split('#')[0]) // clean query/hash
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i); // unique

    console.log('Filtered news article links:', newsLinks.length);

    // Parse markdown for article blocks
    // Typical markdown structure from Firecrawl:
    //   [Title text](url)
    //   date string
    //   excerpt text
    const articles: NewsArticle[] = [];
    const seenUrls = new Set<string>();

    // Strategy 1: Extract from markdown link patterns
    // Matches: [Article Title](/news/some-slug) or [Article Title](https://...usskiandsnowboard.org/news/...)
    const linkPattern = /\[([^\]]{10,})\]\(((?:https?:\/\/(?:www\.)?usskiandsnowboard\.org)?\/news\/[^)]+)\)/g;
    let match;

    while ((match = linkPattern.exec(markdown)) !== null) {
      const title = match[1].trim();
      let url = match[2].trim();

      // Make URL absolute
      if (url.startsWith('/')) {
        url = `https://www.usskiandsnowboard.org${url}`;
      }
      url = url.split('?')[0].split('#')[0];

      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      // Look for a date near this match in the markdown
      const afterMatch = markdown.substring(match.index + match[0].length, match.index + match[0].length + 300);
      const dateMatch = afterMatch.match(/(\w+ \d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/);
      let date = new Date().toISOString().split('T')[0];
      if (dateMatch) {
        const parsed = new Date(dateMatch[1]);
        if (!isNaN(parsed.getTime())) {
          date = parsed.toISOString().split('T')[0];
        }
      }

      // Extract excerpt: first non-empty line after the link that isn't a date
      const lines = afterMatch.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let excerpt = title;
      for (const line of lines) {
        if (line.length > 20 && !dateMatch?.input?.startsWith(line) && !/^\d/.test(line) && !line.startsWith('[') && !line.startsWith('#')) {
          excerpt = line.substring(0, 200);
          break;
        }
      }

      articles.push({ title, url, date, excerpt });
      console.log(`Parsed article: ${title} (${date})`);
    }

    // Strategy 2: If markdown parsing found few articles, use the filtered links
    if (articles.length < 3) {
      for (const link of newsLinks) {
        if (seenUrls.has(link)) continue;
        seenUrls.add(link);

        // Extract title from URL slug
        const slug = link.split('/news/')[1] || '';
        const title = slug
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
          .trim();

        if (title.length < 10) continue;

        articles.push({
          title,
          url: link,
          date: new Date().toISOString().split('T')[0],
          excerpt: title,
        });
      }
    }

    console.log(`Total articles parsed: ${articles.length}`);

    if (articles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No articles found from Firecrawl response.', articlesProcessed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert into database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('news_articles')
      .upsert(articles, { onConflict: 'url', ignoreDuplicates: false });

    if (error) {
      console.error('Error inserting articles:', error);
      throw error;
    }

    console.log('Successfully stored articles in database');

    return new Response(
      JSON.stringify({ success: true, articlesProcessed: articles.length, message: 'News articles scraped and stored successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-news function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
