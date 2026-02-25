import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Scoped styles ────────────────────────────────────────────────────────────
const STYLES = `
.rt-root {
  --rt-border: hsl(var(--border));
  --rt-bg: hsl(var(--background));
  --rt-toolbar-bg: hsl(var(--muted));
  --rt-toolbar-hover: hsl(var(--accent));
  --rt-active-bg: hsl(var(--accent));
  --rt-active-border: hsl(var(--ring));
  --rt-text: hsl(var(--foreground));
  --rt-muted: hsl(var(--muted-foreground));
  --rt-radius: var(--radius, 6px);
}

.rt-wrapper {
  border: 1px solid var(--rt-border);
  border-radius: var(--rt-radius);
  overflow: hidden;
  background: var(--rt-bg);
  transition: box-shadow 0.15s, border-color 0.15s;
}
.rt-wrapper:focus-within {
  border-color: var(--rt-active-border);
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
  outline: none;
}

/* ── Toolbar ── */
.rt-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1px;
  padding: 5px 7px;
  background: var(--rt-toolbar-bg);
  border-bottom: 1px solid var(--rt-border);
}
.rt-sep {
  width: 1px;
  height: 18px;
  background: var(--rt-border);
  margin: 0 3px;
  flex-shrink: 0;
}
.rt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: calc(var(--rt-radius) - 2px);
  background: transparent;
  cursor: pointer;
  color: var(--rt-text);
  transition: background 0.1s, border-color 0.1s, color 0.1s;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  font-family: inherit;
}
.rt-btn:hover {
  background: var(--rt-toolbar-hover);
}
.rt-btn.is-active {
  background: var(--rt-active-bg);
  border-color: var(--rt-active-border);
  color: hsl(var(--primary, 220 90% 50%));
}
.rt-btn svg {
  width: 13px;
  height: 13px;
  pointer-events: none;
}

/* ── Editable area ── */
.rt-area {
  min-height: 140px;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px 12px;
  outline: none;
  font-size: 0.875rem;
  line-height: 1.75;
  color: var(--rt-text);
  background: var(--rt-bg);
  font-family: inherit;
  word-break: break-word;
}
.rt-area:empty::before {
  content: attr(data-placeholder);
  color: var(--rt-muted);
  pointer-events: none;
}

/* ── Rich content styles ── */
.rt-area b,
.rt-area strong { font-weight: 700; }
.rt-area i,
.rt-area em { font-style: italic; }
.rt-area u { text-decoration: underline; }
.rt-area s { text-decoration: line-through; }
.rt-area blockquote {
  border-left: 3px solid var(--rt-active-border);
  margin: 6px 0;
  padding: 3px 12px;
  color: var(--rt-muted);
  font-style: italic;
}
.rt-area ul { list-style: disc; padding-left: 1.4em; margin: 4px 0; }
.rt-area ol { list-style: decimal; padding-left: 1.4em; margin: 4px 0; }
.rt-area li { margin: 2px 0; }
.rt-area a {
  color: hsl(var(--primary, 220 90% 50%));
  text-decoration: underline;
  text-underline-offset: 2px;
}
.rt-area code {
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 0.8em;
  font-family: ui-monospace, 'Cascadia Code', monospace;
}
.rt-area pre {
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: calc(var(--rt-radius));
  padding: 10px 14px;
  margin: 6px 0;
  overflow-x: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.82em;
}

/* ── Popover overlay ── */
.rt-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}
.rt-popover {
  background: hsl(var(--popover, var(--background)));
  border: 1px solid hsl(var(--border));
  border-radius: var(--rt-radius);
  padding: 16px 18px;
  width: 320px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rt-popover-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}
.rt-popover input,
.rt-popover textarea {
  width: 100%;
  border: 1px solid hsl(var(--border));
  border-radius: calc(var(--rt-radius) - 2px);
  padding: 6px 10px;
  font-size: 0.82rem;
  font-family: inherit;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  outline: none;
  resize: vertical;
}
.rt-popover input:focus,
.rt-popover textarea:focus {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
}
.rt-popover-row {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.rt-popover-cancel {
  padding: 5px 13px;
  border-radius: calc(var(--rt-radius) - 2px);
  font-size: 0.8rem;
  cursor: pointer;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
  font-family: inherit;
}
.rt-popover-confirm {
  padding: 5px 13px;
  border-radius: calc(var(--rt-radius) - 2px);
  font-size: 0.8rem;
  cursor: pointer;
  border: 1px solid transparent;
  background: hsl(var(--primary, 220 90% 50%));
  color: hsl(var(--primary-foreground, 0 0% 100%));
  font-family: inherit;
}
.rt-popover-confirm:hover {
  opacity: 0.9;
}
`;

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Ico = (p: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  />
);

const Icons = {
  Bold: () => (
    <p>
      <strong>B</strong>
    </p>
  ),
  Italic: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
      <path d="M6 2h5v2H9.2l-2.4 8H9v2H4v-2h1.8l2.4-8H6V2z" />
    </svg>
  ),
  Underline: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
      <path d="M3 13h10v1.5H3V13zM8 11a4 4 0 0 0 4-4V2h-2v5a2 2 0 0 1-4 0V2H4v5a4 4 0 0 0 4 4z" />
    </svg>
  ),
  Strike: () => (
    <Ico width="13" height="13">
      <line x1="2" y1="8" x2="14" y2="8" strokeWidth="2" />
      <path d="M5 8V5a3 3 0 0 1 6 0v3" />
      <path d="M5 8v3a3 3 0 0 0 6 0V8" />
    </Ico>
  ),
  Quote: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
      <path d="M3 10c0-2.2 1.5-4 3-4v2c-.8 0-1 .5-1 1v1h2v3H3v-3zm7 0c0-2.2 1.5-4 3-4v2c-.8 0-1 .5-1 1v1h2v3h-4v-3z" />
    </svg>
  ),
  UL: () => (
    <Ico width="13" height="13">
      <circle cx="2.5" cy="4" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="2.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <line x1="5" y1="4" x2="14" y2="4" />
      <line x1="5" y1="8" x2="14" y2="8" />
      <line x1="5" y1="12" x2="14" y2="12" />
    </Ico>
  ),
  OL: () => (
    <Ico width="13" height="13">
      <line x1="6" y1="4" x2="14" y2="4" />
      <line x1="6" y1="8" x2="14" y2="8" />
      <line x1="6" y1="12" x2="14" y2="12" />
      <text x="1" y="5" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">
        1.
      </text>
      <text x="1" y="9" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">
        2.
      </text>
      <text x="1" y="13" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">
        3.
      </text>
    </Ico>
  ),
  Indent: () => (
    <Ico width="13" height="13">
      <line x1="2" y1="4" x2="14" y2="4" />
      <polyline points="5,7 9,9.5 5,12" fill="none" />
      <line x1="9" y1="7" x2="14" y2="7" />
      <line x1="9" y1="9.5" x2="14" y2="9.5" />
      <line x1="9" y1="12" x2="14" y2="12" />
    </Ico>
  ),
  Outdent: () => (
    <Ico width="13" height="13">
      <line x1="2" y1="4" x2="14" y2="4" />
      <polyline points="8,7 4,9.5 8,12" fill="none" />
      <line x1="2" y1="7" x2="6" y2="7" />
      <line x1="2" y1="9.5" x2="6" y2="9.5" />
      <line x1="2" y1="12" x2="6" y2="12" />
    </Ico>
  ),
  Link: () => (
    <Ico width="13" height="13">
      <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4" />
      <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12" />
    </Ico>
  ),
  Code: () => (
    <Ico width="13" height="13">
      <polyline points="5,4 1,8 5,12" />
      <polyline points="11,4 15,8 11,12" />
    </Ico>
  ),
  HTML: () => (
    <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
      <text x="0" y="12" fontSize="9" fontFamily="ui-monospace,monospace" fontWeight="bold">
        &lt;/&gt;
      </text>
    </svg>
  ),
};

// ─── Popover components ───────────────────────────────────────────────────────
function LinkPopover({
  onConfirm,
  onCancel,
}: {
  onConfirm: (text: string, url: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = React.useState("");
  const [url, setUrl] = React.useState("");
  return (
    <div className="rt-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="rt-popover">
        <p className="rt-popover-title">Insert Link</p>
        <input autoFocus placeholder="Display text (optional)" value={text} onChange={(e) => setText(e.target.value)} />
        <input
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm(text, url)}
        />
        <div className="rt-popover-row">
          <button className="rt-popover-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="rt-popover-confirm" onClick={() => onConfirm(text, url)}>
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

function HTMLPopover({ onConfirm, onCancel }: { onConfirm: (html: string) => void; onCancel: () => void }) {
  const [html, setHtml] = React.useState("");
  return (
    <div className="rt-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="rt-popover">
        <p className="rt-popover-title">Insert HTML</p>
        <textarea
          autoFocus
          rows={5}
          placeholder={"<strong>Hello</strong> <em>world</em>"}
          value={html}
          onChange={(e) => setHtml(e.target.value)}
        />
        <div className="rt-popover-row">
          <button className="rt-popover-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="rt-popover-confirm" onClick={() => onConfirm(html)}>
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RichTextarea ─────────────────────────────────────────────────────────────
export interface RichTextareaProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (e: { target: { value: string; innerHTML: string } }) => void;
  className?: string;
}

export const RichTextarea = React.forwardRef<HTMLDivElement, RichTextareaProps>(
  ({ value, defaultValue, placeholder = "Write something…", onChange, className, ...props }, ref) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const savedRange = React.useRef<Range | null>(null);
    const [active, setActive] = React.useState<Set<string>>(new Set());
    const [popover, setPopover] = React.useState<"link" | "html" | null>(null);
    const stylesInjected = React.useRef(false);

    // Forward ref
    React.useImperativeHandle(ref, () => editorRef.current!);

    // Inject styles once
    React.useEffect(() => {
      if (stylesInjected.current) return;
      const tag = document.createElement("style");
      tag.textContent = STYLES;
      document.head.appendChild(tag);
      stylesInjected.current = true;
    }, []);

    // Seed initial content
    React.useEffect(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = value ?? defaultValue ?? "";
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Controlled updates (avoid cursor jump)
    React.useEffect(() => {
      if (value !== undefined && editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }, [value]);

    const saveSelection = () => {
      const sel = window.getSelection();
      if (sel?.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
    };

    const restoreSelection = () => {
      const sel = window.getSelection();
      if (sel && savedRange.current) {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
      }
    };

    const syncActive = () => {
      const next = new Set<string>();
      if (document.queryCommandState("bold")) next.add("bold");
      if (document.queryCommandState("italic")) next.add("italic");
      if (document.queryCommandState("underline")) next.add("underline");
      if (document.queryCommandState("strikeThrough")) next.add("strike");
      setActive(next);
    };

    const exec = (cmd: string, val: string | undefined = undefined) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      syncActive();
      emit();
    };

    const emit = () => {
      if (onChange && editorRef.current) {
        const html = editorRef.current.innerHTML;
        onChange({ target: { value: html, innerHTML: html } });
      }
    };

    // ── Toolbar button ──
    const Btn = ({
      id,
      title,
      onClick,
      children,
      isActive,
    }: {
      id?: string;
      title: string;
      onClick: () => void;
      children: React.ReactNode;
      isActive?: boolean;
    }) => (
      <button
        type="button"
        className={cn("rt-btn", (isActive ?? (id && active.has(id))) && "is-active")}
        title={title}
        onMouseDown={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        {children}
      </button>
    );

    const handleLinkConfirm = (text: string, url: string) => {
      setPopover(null);
      restoreSelection();
      if (!url) return;
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      const label = text.trim() || href;
      exec("insertHTML", `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`);
    };

    const handleHTMLConfirm = (html: string) => {
      setPopover(null);
      restoreSelection();
      if (html.trim()) exec("insertHTML", html);
    };

    return (
      <div className={cn("rt-root", className)} {...props}>
        {popover === "link" && <LinkPopover onConfirm={handleLinkConfirm} onCancel={() => setPopover(null)} />}
        {popover === "html" && <HTMLPopover onConfirm={handleHTMLConfirm} onCancel={() => setPopover(null)} />}

        <div className="rt-wrapper">
          {/* ── Toolbar ── */}
          <div className="rt-toolbar" onMouseDown={(e) => e.preventDefault()}>
            {/* Inline formatting */}
            <Btn id="bold" title="Bold (Ctrl+B)" onClick={() => exec("bold")}>
              <Icons.Bold />
            </Btn>
            <Btn id="italic" title="Italic (Ctrl+I)" onClick={() => exec("italic")}>
              <Icons.Italic />
            </Btn>
            <Btn id="underline" title="Underline (Ctrl+U)" onClick={() => exec("underline")}>
              <Icons.Underline />
            </Btn>
            <Btn id="strike" title="Strikethrough" onClick={() => exec("strikeThrough")}>
              <Icons.Strike />
            </Btn>

            <span className="rt-sep" />

            {/* Block */}
            <Btn title="Blockquote" onClick={() => exec("formatBlock", "blockquote")}>
              <Icons.Quote />
            </Btn>
            <Btn title="Unordered List" onClick={() => exec("insertUnorderedList")}>
              <Icons.UL />
            </Btn>
            <Btn title="Ordered List" onClick={() => exec("insertOrderedList")}>
              <Icons.OL />
            </Btn>

            <span className="rt-sep" />

            {/* Indent */}
            <Btn title="Indent" onClick={() => exec("indent")}>
              <Icons.Indent />
            </Btn>
            <Btn title="Outdent" onClick={() => exec("outdent")}>
              <Icons.Outdent />
            </Btn>

            <span className="rt-sep" />

            {/* Inline code */}
            <Btn
              title="Inline Code"
              onClick={() => {
                const sel = window.getSelection();
                const text = sel?.toString() || "code";
                exec("insertHTML", `<code>${text}</code>`);
              }}
            >
              <Icons.Code />
            </Btn>

            {/* Link */}
            <Btn
              title="Insert Link"
              onClick={() => {
                saveSelection();
                setPopover("link");
              }}
            >
              <Icons.Link />
            </Btn>

            {/* Raw HTML */}
            <Btn
              title="Insert HTML"
              onClick={() => {
                saveSelection();
                setPopover("html");
              }}
            >
              <Icons.HTML />
            </Btn>
          </div>

          {/* ── Editable area ── */}
          <div
            ref={editorRef}
            className="rt-area"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onInput={emit}
            onKeyUp={syncActive}
            onMouseUp={syncActive}
            onSelect={syncActive}
          />
        </div>
      </div>
    );
  },
);

RichTextarea.displayName = "RichTextarea";
