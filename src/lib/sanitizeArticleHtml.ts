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

const ALLOWED_TAGS = [
  "p", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a", "blockquote",
  "h1", "h2", "h3", "h4", "br", "hr", "img", "figure", "figcaption", "span",
  "div", "table", "thead", "tbody", "tr", "th", "td",
];
const ALLOWED_ATTR = ["href", "src", "alt", "title", "style", "target", "rel"];

/**
 * Real XSS sanitization layered on top of the style cleanup above. Strips
 * <script>, event handlers, javascript: URLs, iframes, etc. Article bodies
 * are rendered with dangerouslySetInnerHTML, so this is the safety net.
 */
export function sanitizeArticleHtmlSafe(html: string): string {
  return DOMPurify.sanitize(sanitizeArticleHtml(html), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  }) as string;
}
