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

    // Fetch the US Ski & Snowboard news page
    const response = await fetch('https://www.usskiandsnowboard.org/news');
    const html = await response.text();
    
    console.log('Fetched news page, HTML length:', html.length);
    console.log('First 1000 chars:', html.substring(0, 1000));
    
    const articles: NewsArticle[] = [];
    const seenUrls = new Set<string>();
    
    // Try to find any links to /news/ pages
    const newsLinkPattern = /href="(\/news\/[^"]+)"/g;
    const newsLinks: string[] = [];
    let match;
    
    while ((match = newsLinkPattern.exec(html)) !== null) {
      newsLinks.push(match[1]);
    }
    
    console.log(`Found ${newsLinks.length} news links`);
    if (newsLinks.length > 0) {
      console.log('Sample links:', newsLinks.slice(0, 5));
    }
    
    // Pattern to find titles - trying more flexible pattern
    const titlePatterns = [
      /<a href="(\/news\/[^"]+)"[^>]*>([^<]+)<\/a>/g,
      /href="(\/news\/[^"]+)"[^>]*>([^<]{10,})<\/a>/g,
    ];
    
    for (const pattern of titlePatterns) {
      pattern.lastIndex = 0; // Reset regex
      while ((match = pattern.exec(html)) !== null) {
        const url = 'https://www.usskiandsnowboard.org' + match[1];
        const title = match[2].trim()
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        
        if (!seenUrls.has(url) && title.length >= 10 && !title.includes('<')) {
          seenUrls.add(url);
          articles.push({
            title,
            url,
            date: new Date().toISOString().split('T')[0],
            excerpt: title,
          });
          console.log(`Found article: ${title.substring(0, 50)}...`);
        }
      }
      
      if (articles.length > 0) break;
    }

    console.log(`Total articles parsed: ${articles.length}`);

    if (articles.length === 0) {
      console.warn('No articles found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No articles found to scrape',
          articlesProcessed: 0,
          debug: {
            htmlLength: html.length,
            newsLinksFound: newsLinks.length
          }
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
