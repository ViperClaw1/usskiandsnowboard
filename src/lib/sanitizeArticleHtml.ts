/**
 * Strips font-size and font-family from inline style attributes in an HTML string.
 * All other style properties (color, margin, text-align, etc.) are preserved.
 *
 * This allows the global typography settings (CSS custom properties set by
 * useTrainingTypography) to take effect on article body HTML that was pasted
 * from Google Docs or other rich text editors, which bake inline styles directly
 * onto <span> elements — giving them specificity (1,0,0,0) that nothing in our
 * CSS layer can override.
 */
export function sanitizeArticleHtml(html: string): string {
  return html.replace(
    /(<[^>]+\s)style="([^"]*)"/gi,
    (_match, prefix: string, styleValue: string) => {
      const cleaned = styleValue
        .split(";")
        .map((s: string) => s.trim())
        .filter((s: string) => {
          if (!s) return false;
          const prop = s.split(":")[0].trim().toLowerCase();
          return prop !== "font-size" && prop !== "font-family";
        })
        .join("; ");
      return cleaned ? `${prefix}style="${cleaned}"` : prefix.trimEnd();
    }
  );
}
