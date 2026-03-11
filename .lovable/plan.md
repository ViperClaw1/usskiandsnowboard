
## Plan: Article-Level Font Family & Font Size Customization

### What we're building
Admins can choose a font family and font size when creating or editing a training article. These choices are saved to the database and applied when readers view the article.

### Changes needed

**1. Database migration** — Add two nullable columns to `training_articles`:
- `font_family TEXT` (e.g. `"Inter, sans-serif"`) — defaults to `NULL` (falls back to the page default)
- `font_size TEXT` (e.g. `"16"`) — stores the px value as a string, matching the pattern used elsewhere in the codebase

**2. `src/types/training.ts`** — Add `font_family: string | null` and `font_size: string | null` to the `TrainingArticle` interface.

**3. `src/components/dashboard/admin/TrainingArticleManager.tsx`**:
- Extend `ArticleForm` with `font_family: string` and `font_size: string`
- Update `EMPTY_FORM` with blank defaults
- Update `openEdit` to populate the two new fields from the article
- Add a typography row in the dialog (reuse the same font/size `<Select>` pattern from `TypographyControls.tsx`, but inline — no dependency on the dashboard hook needed) placed right after the Category field
- Include `font_family` and `font_size` in the `record` object passed to insert/update

**4. `src/pages/TrainingArticle.tsx`** — Apply the font settings to the article body wrapper:
```
style={{
  fontFamily: article.font_family || undefined,
  fontSize: article.font_size ? `${article.font_size}px` : undefined,
}}
```
The style is applied to the `<div>` that wraps `dangerouslySetInnerHTML`, so all body text inherits it while the title, subtitle, author block and meta row remain unaffected.

### Font options (same set as TypographyControls)
- Montserrat, Inter, Roboto, Open Sans, Lato
- Sizes: 12 – 20 px

### File summary
```
migration        ADD COLUMN font_family, font_size to training_articles
src/types/training.ts            +2 fields on TrainingArticle interface
TrainingArticleManager.tsx       extend form, add selects in dialog, persist to DB
TrainingArticle.tsx              apply inline style to body wrapper
```

No new dependencies. No schema-breaking changes (both columns nullable with no default, so existing rows are unaffected).
