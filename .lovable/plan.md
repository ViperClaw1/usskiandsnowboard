

# Sort News Articles by Last Updated (Descending)

## Change

Update the news query in `src/pages/News.tsx` to sort by `updated_at` instead of `created_at`.

## Technical Detail

In `src/pages/News.tsx`, line 22, change:

```typescript
// From:
.order('created_at', { ascending: false })

// To:
.order('updated_at', { ascending: false })
```

This is a single-line change. The `news_articles` table already has an `updated_at` column with a default of `now()`, so all existing rows have valid values for sorting.

