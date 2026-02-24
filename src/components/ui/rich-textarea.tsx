import * as React from "react";
import { cn } from "@/lib/utils";

function highlightHTML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /(&lt;\/?)([\w-]+)((?:\s+[\w-]+(?:=&quot;[^&]*&quot;|=&#39;[^&]*&#39;|=[^\s&]+)?)*\s*\/?)(&gt;)/g,
      (_match, open, tag, attrs, close) => {
        const highlightedAttrs = attrs.replace(
          /([\w-]+)(=)(&quot;[^&]*&quot;|&#39;[^&]*&#39;|[^\s&]+)/g,
          '<span class="text-sky-500">$1</span>$2<span class="text-amber-600 dark:text-amber-400">$3</span>'
        );
        return `<span class="text-blue-600 dark:text-blue-400">${open}${tag}</span>${highlightedAttrs}<span class="text-blue-600 dark:text-blue-400">${close}</span>`;
      }
    );
}

// Re-encode the raw text so the regex above can match encoded entities
function encodeForHighlight(text: string): string {
  return text
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeAfterHighlight(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export interface RichTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const RichTextarea = React.forwardRef<HTMLTextAreaElement, RichTextareaProps>(
  ({ className, value, ...props }, ref) => {
    const preRef = React.useRef<HTMLPreElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref]
    );

    const handleScroll = () => {
      if (textareaRef.current && preRef.current) {
        preRef.current.scrollTop = textareaRef.current.scrollTop;
        preRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    };

    const raw = String(value ?? "");
    const highlighted = decodeAfterHighlight(highlightHTML(encodeForHighlight(raw)));

    return (
      <div className="relative">
        <pre
          ref={preRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words rounded-md border border-transparent px-3 py-2 font-mono text-sm leading-relaxed",
            className
          )}
          dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
        />
        <textarea
          ref={setRefs}
          value={value}
          onScroll={handleScroll}
          className={cn(
            "relative z-10 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm leading-relaxed text-transparent caret-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
RichTextarea.displayName = "RichTextarea";

export { RichTextarea };
