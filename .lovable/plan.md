
## Problem

Google Docs-sourced HTML bakes inline `style` attributes directly onto `<span>` tags, e.g.:

```html
<span style="font-size: 11pt; font-family: Arial, sans-serif; color: #000;">...</span>
```

Inline `element.style` declarations have specificity `(1,0,0,0)` — higher than any CSS selector or CSS variable override. Nothing in our CSS layer can beat them. The CSS custom property trick that defeated the `prose` plugin rules cannot defeat inline styles.

## Solution: HTML sanitizer at render time

Strip `font-size` and `font-family` from all inline `style` attributes in the HTML string **before** passing it to `dangerouslySetInnerHTML`. All other inline styles (colors, bold, italic, etc.) are preserved untouched.

This is pure string processing — no extra libraries needed. A focused regex replaces only the two offending properties inside `style="..."` attributes.

## Why not use DOMParser / a full sanitizer library?

- DOMParser works but is heavier and async — adds complexity to a synchronous render path
- Libraries like `dompurify` can strip styles but would need config to preserve everything except 2 properties
- The targeted regex approach is small, fast, testable, and does exactly one job

## Plan

### 1. Create `src/lib/sanitizeArticleHtml.ts`

A single exported function:

```ts
/**
 * Strips font-size and font-family from inline style attributes in an HTML string.
 * All other style properties (color, margin, etc.) are preserved.
 * This allows the global typography settings to take effect on article body HTML
 * that was pasted from Google Docs or other rich text editors.
 */
export function sanitizeArticleHtml(html: string): string {
  return html.replace(
    /(<[^>]+\s)style="([^"]*)"/gi,
    (match, prefix, styleValue) => {
      const cleaned = styleValue
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => {
          if (!s) return false;
          const prop = s.split(':')[0].trim().toLowerCase();
          return prop !== 'font-size' && prop !== 'font-family';
        })
        .join('; ');
      return cleaned ? `${prefix}style="${cleaned}"` : prefix.trimEnd();
    }
  );
}
```

Edge cases handled:
- Empty `style=""` after stripping → attribute is removed entirely
- Multiple properties on same element → only the two target properties are removed
- Case-insensitive matching of property names (`Font-Size`, `FONT-FAMILY`, etc.)
- Trailing semicolons / whitespace between declarations

### 2. Update `src/pages/TrainingArticle.tsx`

Import `sanitizeArticleHtml` and wrap `article.body` before passing to `dangerouslySetInnerHTML`:

```tsx
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";

// in render:
dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.body) }}
```

No other changes needed. The CSS custom property layer already handles the `prose` plugin rules — now inline styles are neutralized too, and inheritance flows correctly from the wrapper's `--article-font-size` / `--article-font-family` variables.

### Files changed

```
src/lib/sanitizeArticleHtml.ts   NEW — strip font-size/font-family from inline styles
src/pages/TrainingArticle.tsx    1-line change — wrap article.body with sanitizer
```

No CSS changes. No DB changes. No hook changes.
