
## What the user wants

Move the **Body Font Family** and **Body Font Size** dropdowns out of the article create/edit Dialog and into the `CardHeader` of `TrainingArticleManager`, next to the **+ New Article** button. The chosen values should:

1. Be reflected live in the `RichTextarea` inside the Dialog (so the admin sees the font while writing).
2. Apply **globally** to all existing published articles when a reader views them — meaning the CardHeader-level font settings override any per-article values.

### Key design decisions

**Global vs per-article**: The user says "globally in all the existing articles ever made." This means the font family and size become a **global CMS-level setting**, not per-article. The cleanest approach is to store these as a dedicated row in the existing `dashboard_layouts` table (role = `'training'`), the same pattern already used for athlete/partner layouts. When `TrainingArticle.tsx` renders an article body, it reads from that global setting (falling back to nothing if unset).

- No new DB table or columns needed — `dashboard_layouts` already has `text_overrides JSONB`.
- We store `{ font_family: "...", font_size: "..." }` under a well-known key like `__typography` (same pattern as the dashboard editors).
- The per-article `font_family`/`font_size` columns added in the previous migration can stay but are no longer used for saving from the manager (the article-level Dialog no longer has font controls at all).

**Live preview in RichTextarea**: The Dialog opens with `form` state; when the global font settings change in the CardHeader selects, we propagate them into the `form` (or keep them as a separate `globalTypography` state that the RichTextarea style references). The simpler approach: keep `globalTypography` state at the component level and apply it as an inline style on the `RichTextarea` wrapper — no form mutation needed.

### Changes

**`TrainingArticleManager.tsx`**:
- Add `globalFontFamily` / `globalFontSize` state (initialized by fetching `dashboard_layouts` where `role = 'training'`).
- Add a `saveGlobalTypography` function that upserts into `dashboard_layouts`.
- Move the two `<Select>` controls (Body Font Family, Body Font Size) to the `CardHeader`, next to the `+ New Article` button. Wire their `onValueChange` to update state **and** immediately persist via upsert.
- Remove the font `<div className="grid grid-cols-2 gap-3">` section from inside the Dialog.
- Wrap the `<RichTextarea>` in a `<div style={{ fontFamily, fontSize }}>` so the admin sees the chosen font while writing.

**`TrainingArticle.tsx`**:
- Fetch `dashboard_layouts` where `role = 'training'` (single query, cached via `useQuery`).
- Extract `font_family` and `font_size` from `text_overrides.__typography` (or top-level keys).
- Apply those values to the article body `<div>` instead of (or merged with) per-article values. Since global is the new source of truth, use global values; ignore per-article columns entirely.

**No DB migration needed** — `dashboard_layouts` already exists with the correct schema and RLS (admins can write, authenticated users can read).

### File summary

```
TrainingArticleManager.tsx   Move font selects to CardHeader; fetch/persist global typography
                              in dashboard_layouts (role='training'); apply to RichTextarea preview
TrainingArticle.tsx           Read global typography from dashboard_layouts; apply to body wrapper
```

### Behaviour summary

- Admin opens Training tab → sees Font Family + Font Size dropdowns in the card header next to "+ New Article".
- Changing either dropdown immediately saves to `dashboard_layouts` (upsert, debounced or on-change).
- Admin opens any article Dialog → the RichTextarea body renders with the selected font/size live.
- Readers open any published article → the body text uses the same global font/size.
- If no font has been set, both default to "inherit" (no inline style applied), matching current behaviour.
