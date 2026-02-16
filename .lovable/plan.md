

# Fix News Scraping: Excerpts, Images, and Sorting

## Issues Found

### 1. Raw Markdown in Excerpts
The scraper's excerpt extraction (line 126-136 in `scrape-news/index.ts`) filters out lines starting with `[`, `#`, digits, and "Updated", but does NOT filter lines starting with `- ` (list items containing ad/sponsor markdown images like `[![xfinity](...)](...)`). Four articles currently have broken excerpts showing raw markdown ad content.

### 2. No Article Images
The source site provides a hero image for every article in the markdown (e.g., `[![alt text](image_url)](article_url)`). The scraper currently ignores these. We need a new `image_url` column and scraper logic to extract them.

### 3. Sorting Mismatch
Our DB stores only a `date` (no time component). Multiple articles sharing the same date (e.g., four articles on 2026-02-14) appear in arbitrary database order rather than matching the editorial order on the source site. The source site orders by "Last Updated" with an implicit time-of-day ordering.

---

## Plan

### Step 1: Database Migration
Add two new columns to `news_articles`:
- `image_url` (text, nullable) -- hero image URL for the article
- `source_order` (integer, nullable) -- position from the source page to preserve editorial ordering within the same date

### Step 2: Update the Scraper (`supabase/functions/scrape-news/index.ts`)

**Extract hero images**: The source markdown has a pattern of `[![alt](image_url)](article_url)` immediately before each article title link. Parse these image URLs and store them in `image_url`.

**Fix excerpt extraction**: Add filters to skip lines that:
- Start with `- ` (list items, typically ads)
- Contain markdown image syntax `![` 
- Contain `simpleads` in the URL (sponsor ads)

**Preserve source order**: Assign a sequential `source_order` value (0, 1, 2, ...) based on the order articles appear in the scraped markdown. This preserves editorial ordering.

**Update the `NewsArticle` interface** to include `image_url` and `source_order`.

### Step 3: Update the Frontend (`src/pages/News.tsx`)

**Add image element**: Render the `image_url` at the top of each Card (above CardHeader), using an `<img>` tag with `object-cover` styling and rounded top corners. Only render if `image_url` exists.

**Update query ordering**: Change from `.order('date', { ascending: false })` to also order by `source_order` ascending as a secondary sort, so articles on the same date appear in editorial order:
```
.order('date', { ascending: false, nullsFirst: false })
.order('source_order', { ascending: true, nullsFirst: false })
```

### Step 4: Redeploy and Re-scrape
Deploy the updated edge function and trigger a scrape to populate `image_url`, `source_order`, and fix the broken excerpts for existing articles.

---

## Technical Details

**Scraper image extraction regex:**
```
[![alt](IMAGE_URL)](ARTICLE_URL)
```
Pattern: look for image markdown linked to the same article URL, appearing just before each title link in the source markdown.

**Excerpt filter additions (line ~126-136):**
```typescript
if (
  line.length > 20 &&
  !/^\d/.test(line) &&
  !line.startsWith("[") &&
  !line.startsWith("#") &&
  !line.startsWith("- ") &&          // skip list items (ads)
  !/!\[/.test(line) &&                // skip markdown images
  !/simpleads/.test(line) &&          // skip sponsor ads
  !/^(Last\s+)?Updated/i.test(line)
)
```

**Card image rendering:**
```tsx
<Card key={article.id} className="shadow-elegant hover:shadow-hover transition-shadow overflow-hidden">
  {article.image_url && (
    <img
      src={article.image_url}
      alt={article.title}
      className="w-full h-48 sm:h-56 object-cover"
      loading="lazy"
    />
  )}
  <CardHeader>
    {/* ...existing title and date... */}
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">{article.excerpt}</p>
  </CardContent>
</Card>
```

**Files changed:**
- `supabase/migrations/[timestamp].sql` -- add `image_url` and `source_order` columns
- `supabase/functions/scrape-news/index.ts` -- extract images, fix excerpts, add source ordering
- `src/pages/News.tsx` -- render images, update sort order

