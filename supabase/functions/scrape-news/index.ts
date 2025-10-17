import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts';

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
    
    console.log('Fetched news page, parsing articles...');

    // Parse HTML using DOMParser
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) {
      throw new Error('Failed to parse HTML');
    }

    const articles: NewsArticle[] = [];
    const seenUrls = new Set<string>();
    
    // Find all article elements - try multiple selectors for robustness
    const articleSelectors = [
      'article',
      '.news-item',
      '.article-card',
      '[class*="news"]',
      'a[href*="/news/"]'
    ];

    let articleElements: any[] = [];
    for (const selector of articleSelectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        articleElements = Array.from(elements);
        console.log(`Found ${articleElements.length} elements using selector: ${selector}`);
        break;
      }
    }

    // Parse each article element
    for (const element of articleElements) {
      try {
        // Extract URL
        let url = '';
        const linkEl = element.querySelector('a[href*="/news/"]') || (element.tagName === 'A' ? element : null);
        if (linkEl) {
          const href = linkEl.getAttribute('href');
          url = href?.startsWith('http') ? href : `https://www.usskiandsnowboard.org${href}`;
        }

        // Skip if no URL or duplicate
        if (!url || seenUrls.has(url)) continue;

        // Extract title
        const titleEl = element.querySelector('h1, h2, h3, h4, [class*="title"]') || linkEl;
        const title = titleEl?.textContent?.trim() || '';

        // Skip if title is too short or invalid
        if (!title || title.length < 10 || title === 'Read More') continue;

        // Extract excerpt
        const excerptEl = element.querySelector('p, [class*="excerpt"], [class*="description"]');
        let excerpt = excerptEl?.textContent?.trim() || '';
        
        // Clean up excerpt
        excerpt = excerpt
          .replace(/\s+/g, ' ')
          .replace(/Read More/gi, '')
          .trim()
          .substring(0, 500);

        // Extract date from URL or use current date
        const urlDateMatch = url.match(/\/news\/(\d{4})-(\d{2})-(\d{2})-/);
        const urlMonthMatch = url.match(/\/news\/(\d{4})-(\d{2})-/);
        let date = '';
        
        if (urlDateMatch) {
          date = `${urlDateMatch[1]}-${urlDateMatch[2]}-${urlDateMatch[3]}`;
        } else if (urlMonthMatch) {
          date = `${urlMonthMatch[1]}-${urlMonthMatch[2]}`;
        } else {
          // Try to find date in article text
          const dateEl = element.querySelector('[class*="date"], time');
          if (dateEl) {
            const dateText = dateEl.textContent?.trim() || '';
            const parsedDate = new Date(dateText);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate.toISOString().split('T')[0];
            }
          }
          // Fallback to current year
          if (!date) {
            date = new Date().getFullYear().toString();
          }
        }

        seenUrls.add(url);
        articles.push({
          title,
          url,
          date,
          excerpt: excerpt || title,
        });

        console.log(`Parsed article: ${title}`);
      } catch (err) {
        console.error('Error parsing article element:', err);
        continue;
      }
    }

    // Fallback: regex-based extraction if DOM parsing didn't find enough articles
    if (articles.length < 5) {
      console.log('Using fallback regex parsing method...');
      
      // Look for news URLs in the HTML
      const urlPattern = /https:\/\/www\.usskiandsnowboard\.org\/news\/[a-z0-9-]+/gi;
      const urls = [...new Set(html.match(urlPattern) || [])];
      
      for (const url of urls.slice(0, 20)) {
        if (seenUrls.has(url)) continue;
        
        try {
          // Extract title from URL slug
          const slug = url.split('/news/')[1];
          const title = slug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
          
          if (!title || title.length < 10) continue;
          
          // Extract date from URL
          const dateMatch = url.match(/\/(\d{4})-(\d{2})-(\d{2})/);
          const monthMatch = url.match(/\/(\d{4})-(\d{2})/);
          const date = dateMatch 
            ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
            : monthMatch
            ? `${monthMatch[1]}-${monthMatch[2]}`
            : new Date().getFullYear().toString();
          
          seenUrls.add(url);
          articles.push({
            title,
            url,
            date,
            excerpt: title,
          });
          
          console.log(`Parsed article (fallback): ${title}`);
        } catch (err) {
          console.error('Error in fallback parsing:', err);
          continue;
        }
      }
    }

    console.log(`Total articles parsed: ${articles.length}`);

    if (articles.length === 0) {
      console.warn('No articles found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No articles found to scrape',
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
