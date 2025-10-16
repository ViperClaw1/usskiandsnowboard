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

    // Fetch the US Ski & Snowboard homepage
    const response = await fetch('https://www.usskiandsnowboard.org/');
    const html = await response.text();
    
    console.log('Fetched homepage, parsing articles...');

    // Parse articles from the HTML
    const articles: NewsArticle[] = [];
    
    // Regex patterns to extract article information
    const articlePattern = /<a[^>]*href="(https:\/\/www\.usskiandsnowboard\.org\/news\/[^"]+)"[^>]*>[\s\S]*?<h1[^>]*>(.*?)<\/h1>[\s\S]*?<\/a>[\s\S]*?<p[^>]*>(.*?)<\/p>/gi;
    
    let match;
    const seenUrls = new Set<string>();
    
    while ((match = articlePattern.exec(html)) !== null && articles.length < 10) {
      const url = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      const excerpt = match[3].replace(/<[^>]*>/g, '').trim();
      
      // Skip duplicates
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      
      // Extract date from the URL or use current date
      const dateMatch = url.match(/\/(\d{4})-(\d{2})\//);
      const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}` : new Date().toISOString().split('T')[0];
      
      articles.push({
        title,
        url,
        date,
        excerpt: excerpt.substring(0, 500), // Limit excerpt length
      });
    }

    console.log(`Parsed ${articles.length} articles`);

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