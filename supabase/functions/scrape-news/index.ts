import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsArticle {
  title: string;
  url: string;
  date: string;
  excerpt: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting news scraping...');

    // Fetch with proper headers to appear like a real browser
    const response = await fetch('https://www.usskiandsnowboard.org/news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    });
    
    const html = await response.text();
    console.log('Fetched news page, HTML length:', html.length);

    // Check if we got Cloudflare challenge
    if (html.includes('Just a moment...') || html.includes('challenge')) {
      console.warn('Cloudflare challenge detected - website uses bot protection');
      
      // Return error with helpful message
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Website has bot protection enabled. Please use a service like Firecrawl or manually add articles.',
          articlesProcessed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    const articles: NewsArticle[] = [];
    const seenUrls = new Set<string>();
    
    // Pattern to match article links with titles
    const titlePattern = /<span class="field-content"><a href="(\/news\/[^"]+)"[^>]*>([^<]+)<\/a>/g;
    
    let match;
    const articleData: Array<{url: string, title: string}> = [];
    
    while ((match = titlePattern.exec(html)) !== null) {
      const href = match[1];
      const title = match[2].trim()
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      if (title.length >= 10) {
        const url = href.startsWith('http') ? href : `https://www.usskiandsnowboard.org${href}`;
        articleData.push({ url, title });
      }
    }
    
    console.log(`Found ${articleData.length} article titles`);
    
    // Find dates using time elements
    const datePattern = /<time datetime="([^"]+)">/g;
    const dates: string[] = [];
    
    while ((match = datePattern.exec(html)) !== null) {
      const datetime = match[1];
      const parsedDate = new Date(datetime);
      if (!isNaN(parsedDate.getTime())) {
        dates.push(parsedDate.toISOString().split('T')[0]);
      }
    }
    
    console.log(`Found ${dates.length} dates`);
    
    // Match titles with dates (assuming they appear in order)
    for (let i = 0; i < articleData.length; i++) {
      const { url, title } = articleData[i];
      
      // Skip duplicates
      if (seenUrls.has(url)) continue;
      
      // Get corresponding date or use current date
      const date = dates[i] || new Date().toISOString().split('T')[0];
      
      seenUrls.add(url);
      articles.push({
        title,
        url,
        date,
        excerpt: title,
      });
      
      console.log(`Parsed article: ${title} (${date})`);
    }

    console.log(`Total articles parsed: ${articles.length}`);

    if (articles.length === 0) {
      console.warn('No articles found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No articles found to scrape. The website structure may have changed.',
          articlesProcessed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert articles into database (upsert to avoid duplicates)
    const { data, error } = await supabase
      .from('news_articles')
      .upsert(articles, { onConflict: 'url', ignoreDuplicates: false });

    if (error) {
      console.error('Error inserting articles:', error);
      throw error;
    }

    console.log('Successfully stored articles in database');

    return new Response(
      JSON.stringify({ 
        success: true, 
        articlesProcessed: articles.length,
        message: 'News articles scraped and stored successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in scrape-news function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
