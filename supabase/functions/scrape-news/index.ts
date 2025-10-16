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

    const articles: NewsArticle[] = [];
    const seenUrls = new Set<string>();
    
    // Parse the HTML to find news article sections
    // Pattern: Image link, "Top News", Title with link, Excerpt text, "Read More" link
    const articleSectionPattern = /\[!\[.*?\]\(.*?\)\]\((https:\/\/www\.usskiandsnowboard\.org\/news\/[^)]+)\)[\s\S]*?Top News[\s\S]*?#\s*\[([^\]]+)\]\([^)]+\)[\s\S]*?((?:(?!Top News|Read More|\[!\[).)+)/gi;
    
    let match;
    while ((match = articleSectionPattern.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();
      const excerpt = match[3]
        .replace(/<[^>]+>/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim()
        .substring(0, 500);
      
      // Skip duplicates
      if (seenUrls.has(url) || !title || title.length < 5) {
        continue;
      }
      seenUrls.add(url);
      
      // Extract date from URL
      const dateMatch = url.match(/\/(\d{4})-(\d{2})\//);
      const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}` : new Date().toISOString().split('T')[0];
      
      articles.push({
        title,
        url,
        date,
        excerpt: excerpt || title,
      });
      
      console.log(`Parsed article: ${title}`);
    }

    // Alternative parsing method if the first one doesn't find enough articles
    if (articles.length < 5) {
      console.log('Using alternative parsing method...');
      
      // Look for markdown-style links to news articles
      const linkPattern = /\[([^\]]+)\]\((https:\/\/www\.usskiandsnowboard\.org\/news\/[^)]+)\s*"([^"]+)"\)/g;
      
      while ((match = linkPattern.exec(html)) !== null) {
        const title = match[1].trim() || match[3].trim();
        const url = match[2];
        
        if (seenUrls.has(url) || !title || title.length < 5 || title === 'Read More') {
          continue;
        }
        seenUrls.add(url);
        
        // Find excerpt by looking ahead in the text
        const matchIndex = match.index;
        const remainingText = html.substring(matchIndex, matchIndex + 1000);
        const excerptMatch = remainingText.match(/\n\n([^\n\[]+)/);
        const excerpt = excerptMatch ? excerptMatch[1].trim().substring(0, 500) : '';
        
        const dateMatch = url.match(/\/(\d{4})-(\d{2})\//);
        const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}` : new Date().toISOString().split('T')[0];
        
        articles.push({
          title,
          url,
          date,
          excerpt: excerpt || title,
        });
        
        console.log(`Parsed article (alt method): ${title}`);
      }
    }

    console.log(`Total articles parsed: ${articles.length}`);

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