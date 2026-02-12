

# Rewrite `scrape-news` to Use Firecrawl

## Why This Change

The current edge function tries to fetch `usskiandsnowboard.org/news` directly and parse raw HTML with regex. This fails when Cloudflare bot protection is active (the function already warns about this). Firecrawl handles JavaScript rendering and bot protection, giving us clean markdown content reliably.

## What Changes

### 1. Rewrite `supabase/functions/scrape-news/index.ts`

Replace the direct `fetch()` + regex parsing with a Firecrawl scrape call:

- Call `https://api.firecrawl.dev/v1/scrape` with the URL `https://www.usskiandsnowboard.org/news`
- Use `formats: ['markdown', 'links']` to get clean text content and all page links
- Parse the returned markdown to extract article titles, dates, and excerpts
- Upsert results into `news_articles` table (same as today)

### 2. What We Keep and Why

| Element | Keep? | Reason |
|---------|-------|--------|
| CORS headers + OPTIONS handler | Yes | The function is called from the browser (News page, Home page). Without CORS, the browser blocks the response. |
| `verify_jwt = false` in config.toml | Yes | Already configured; allows the function to be invoked without auth (public news). |
| Regex pattern matching | Partially | We still need patterns to extract structured article data (title, URL, date) from the markdown/links Firecrawl returns. The patterns will be simpler since markdown is cleaner than raw HTML. |
| Duplicate URL check (`seenUrls` Set) | Yes | Prevents inserting duplicate articles. |
| Upsert with `onConflict: 'url'` | Yes | Ensures re-runs update existing articles instead of failing on duplicates. |
| Cloudflare challenge check | No | Firecrawl handles this for us -- that is the whole point of switching. |
| Fake browser User-Agent headers | No | Firecrawl handles rendering/headers internally. |

### 3. Implementation Outline

```
1. Receive request, handle CORS preflight
2. Call Firecrawl scrape API with FIRECRAWL_API_KEY
3. Get markdown content and links array from response
4. Filter links to only /news/* article URLs
5. Extract titles and dates from markdown using line-based parsing
   (markdown typically has "## Title" headings and date strings)
6. Build article objects: { title, url, date, excerpt }
7. Deduplicate by URL
8. Upsert into news_articles table
9. Return success response with count
```

### 4. Keeping Articles Updated

The upsert with `onConflict: 'url', ignoreDuplicates: false` already handles updates -- if an article URL already exists, its title/date/excerpt will be refreshed. New articles get inserted. No articles are deleted, preserving history.

### 5. No New Secrets or Tables Needed

- `FIRECRAWL_API_KEY` is already configured
- `news_articles` table schema stays the same
- `supabase/config.toml` already has `[functions.scrape-news]` with `verify_jwt = false`

