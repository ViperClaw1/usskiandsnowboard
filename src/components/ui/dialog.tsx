import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

// ─── Utility ────────────────────────────────────────────────────────────────
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ─── Dialog primitives (unchanged) ──────────────────────────────────────────
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

// ─── RichTextarea ────────────────────────────────────────────────────────────

const TOOLBAR_STYLES = `
  .rich-editor-root {
    --rt-border: #d1d5db;
    --rt-bg: #ffffff;
    --rt-toolbar-bg: #f9fafb;
    --rt-toolbar-hover: #e5e7eb;
    --rt-toolbar-active: #dbeafe;
    --rt-toolbar-active-border: #3b82f6;
    --rt-text: #111827;
    --rt-placeholder: #9ca3af;
    --rt-radius: 8px;
    --rt-font: 'Georgia', serif;
    font-family: var(--rt-font);
  }
  .rich-editor-root * { box-sizing: border-box; }

  .rt-wrapper {
    border: 1.5px solid var(--rt-border);
    border-radius: var(--rt-radius);
    overflow: hidden;
    background: var(--rt-bg);
    transition: border-color 0.15s;
  }
  .rt-wrapper:focus-within {
    border-color: var(--rt-toolbar-active-border);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
  }

  /* ── Toolbar ── */
  .rt-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    padding: 6px 8px;
    background: var(--rt-toolbar-bg);
    border-bottom: 1px solid var(--rt-border);
  }
  .rt-divider {
    width: 1px;
    height: 20px;
    background: var(--rt-border);
    margin: 0 4px;
    flex-shrink: 0;
  }
  .rt-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
    font-size: 13px;
    color: #374151;
    transition: background 0.1s, border-color 0.1s;
    user-select: none;
    flex-shrink: 0;
  }
  .rt-btn:hover { background: var(--rt-toolbar-hover); }
  .rt-btn.active {
    background: var(--rt-toolbar-active);
    border-color: var(--rt-toolbar-active-border);
    color: #1d4ed8;
  }
  .rt-btn svg { width: 14px; height: 14px; }

  /* ── Editable area ── */
  .rt-content {
    min-height: 140px;
    max-height: 340px;
    overflow-y: auto;
    padding: 12px 14px;
    outline: none;
    font-size: 14px;
    line-height: 1.7;
    color: var(--rt-text);
    background: var(--rt-bg);
    font-family: var(--rt-font);
  }
  .rt-content:empty::before {
    content: attr(data-placeholder);
    color: var(--rt-placeholder);
    pointer-events: none;
  }
  /* content styles */
  .rt-content b, .rt-content strong { font-weight: 700; }
  .rt-content i, .rt-content em { font-style: italic; }
  .rt-content u { text-decoration: underline; }
  .rt-content blockquote {
    border-left: 3px solid #3b82f6;
    margin: 8px 0;
    padding: 4px 12px;
    color: #4b5563;
    font-style: italic;
  }
  .rt-content ul { list-style: disc; padding-left: 20px; margin: 4px 0; }
  .rt-content ol { list-style: decimal; padding-left: 20px; margin: 4px 0; }
  .rt-content a { color: #2563eb; text-decoration: underline; }
  .rt-content code {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 3px;
    padding: 1px 5px;
    font-family: 'Fira Mono', 'Consolas', monospace;
    font-size: 12px;
  }

  /* ── Link / HTML popover ── */
  .rt-popover-overlay {
    position: fixed; inset: 0; z-index: 200;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.35);
  }
  .rt-popover {
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    padding: 18px 20px;
    width: 340px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .rt-popover h4 {
    margin: 0 0 2px;
    font-size: 13px;
    font-weight: 600;
    color: #111827;
    font-family: var(--rt-font);
  }
  .rt-popover input, .rt-popover textarea {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 13px;
    font-family: var(--rt-font);
    outline: none;
    color: #111827;
    resize: vertical;
  }
  .rt-popover input:focus, .rt-popover textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
  }
  .rt-popover-actions {
    display: flex; gap: 8px; justify-content: flex-end;
  }
  .rt-popover-actions button {
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid transparent;
    font-family: var(--rt-font);
  }
  .rt-btn-cancel { background: #f3f4f6; color: #374151; border-color: #d1d5db !important; }
  .rt-btn-confirm { background: #3b82f6; color: #fff; }
  .rt-btn-confirm:hover { background: #2563eb; }
`;

// SVG icon helpers
const Icon = ({ children, ...p }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {children}
  </svg>
);
const BoldIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2h5a3 3 0 0 1 0 6H4V2zm0 6h5.5a3.5 3.5 0 0 1 0 7H4V8z" />
  </svg>
);
const ItalicIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M6 2h5v2H9.2l-2.4 8H9v2H4v-2h1.8l2.4-8H6V2z" />
  </svg>
);
const UnderlineIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor">
    <path d="M3 13h10v1.5H3V13zM8 11a4 4 0 0 0 4-4V2h-2v5a2 2 0 0 1-4 0V2H4v5a4 4 0 0 0 4 4z" />
  </svg>
);
const QuoteIcon = () => (
  <Icon>
    <path
      d="M2 10c0-2.2 1.5-4 3-4v2c-.8 0-1 .5-1 1v1h2v3H2v-3zm7 0c0-2.2 1.5-4 3-4v2c-.8 0-1 .5-1 1v1h2v3H9v-3z"
      strokeWidth="0"
      fill="currentColor"
    />
  </Icon>
);
const ULIcon = () => (
  <Icon>
    <circle cx="2.5" cy="4" r="1" fill="currentColor" stroke="none" />
    <circle cx="2.5" cy="8" r="1" fill="currentColor" stroke="none" />
    <circle cx="2.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <line x1="5" y1="4" x2="14" y2="4" />
    <line x1="5" y1="8" x2="14" y2="8" />
    <line x1="5" y1="12" x2="14" y2="12" />
  </Icon>
);
const OLIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <text x="1" y="5" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">
      1.
    </text>
    <text x="1" y="9" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">
      2.
    </text>
    <text x="1" y="13" fontSize="5" fill="currentColor" stroke="none" fontFamily="monospace">
      3.
    </text>
    <line x1="6" y1="4" x2="14" y2="4" />
    <line x1="6" y1="8" x2="14" y2="8" />
    <line x1="6" y1="12" x2="14" y2="12" />
  </svg>
);
const IndentIcon = () => (
  <Icon>
    <polyline points="4,5 8,8 4,11" fill="none" />
    <line x1="8" y1="5" x2="14" y2="5" />
    <line x1="8" y1="8" x2="14" y2="8" />
    <line x1="8" y1="11" x2="14" y2="11" />
    <line x1="2" y1="13" x2="14" y2="13" />
  </Icon>
);
const OutdentIcon = () => (
  <Icon>
    <polyline points="8,5 4,8 8,11" fill="none" />
    <line x1="2" y1="5" x2="6" y2="5" />
    <line x1="2" y1="8" x2="6" y2="8" />
    <line x1="2" y1="11" x2="6" y2="11" />
    <line x1="2" y1="13" x2="14" y2="13" />
  </Icon>
);
const LinkIcon = () => (
  <Icon>
    <path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4" />
    <path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12" />
  </Icon>
);
const CodeIcon = () => (
  <Icon>
    <polyline points="5,4 1,8 5,12" />
    <polyline points="11,4 15,8 11,12" />
  </Icon>
);
const HTMLIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" fontSize="8">
    <text x="1" y="11" fontSize="6" fontFamily="monospace" fontWeight="bold">
      &lt;/&gt;
    </text>
  </svg>
);

// ── Popover components ──
function LinkPopover({ onConfirm, onCancel }) {
  const [text, setText] = React.useState("");
  const [url, setUrl] = React.useState("");
  return (
    <div className="rt-popover-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="rt-popover">
        <h4>Insert Link</h4>
        <input placeholder="Display text" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <input
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm(text, url)}
        />
        <div className="rt-popover-actions">
          <button className="rt-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="rt-btn-confirm" onClick={() => onConfirm(text, url)}>
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

function HTMLPopover({ onConfirm, onCancel }) {
  const [html, setHtml] = React.useState("");
  return (
    <div className="rt-popover-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="rt-popover">
        <h4>Insert HTML</h4>
        <textarea
          rows={5}
          placeholder="<strong>Hello</strong> <em>world</em>"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          autoFocus
        />
        <div className="rt-popover-actions">
          <button className="rt-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="rt-btn-confirm" onClick={() => onConfirm(html)}>
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Core RichTextarea ──
export const RichTextarea = React.forwardRef(
  ({ className, placeholder = "Write something…", onChange, value, defaultValue, ...props }, ref) => {
    const editorRef = React.useRef(null);
    const savedRangeRef = React.useRef(null);
    const [activeFormats, setActiveFormats] = React.useState(new Set());
    const [popover, setPopover] = React.useState(null); // 'link' | 'html' | null

    // expose ref
    React.useImperativeHandle(ref, () => editorRef.current);

    // initialise content
    React.useEffect(() => {
      if (editorRef.current && (value !== undefined || defaultValue !== undefined)) {
        editorRef.current.innerHTML = value ?? defaultValue ?? "";
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // controlled updates
    React.useEffect(() => {
      if (value !== undefined && editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }, [value]);

    const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    };

    const restoreSelection = () => {
      const sel = window.getSelection();
      if (sel && savedRangeRef.current) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    };

    const updateActiveFormats = () => {
      const formats = new Set();
      if (document.queryCommandState("bold")) formats.add("bold");
      if (document.queryCommandState("italic")) formats.add("italic");
      if (document.queryCommandState("underline")) formats.add("underline");
      setActiveFormats(formats);
    };

    const exec = (cmd, value = null) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, value);
      updateActiveFormats();
      notifyChange();
    };

    const notifyChange = () => {
      if (onChange && editorRef.current) {
        const syntheticEvent = {
          target: { value: editorRef.current.innerHTML, innerHTML: editorRef.current.innerHTML },
          currentTarget: editorRef.current,
        };
        onChange(syntheticEvent);
      }
    };

    const handleLinkConfirm = (text, url) => {
      setPopover(null);
      restoreSelection();
      if (!url) return;
      const href = url.startsWith("http") ? url : "https://" + url;
      const linkHtml = `<a href="${href}" target="_blank" rel="noopener noreferrer">${text || href}</a>`;
      document.execCommand("insertHTML", false, linkHtml);
      notifyChange();
    };

    const handleHTMLConfirm = (html) => {
      setPopover(null);
      restoreSelection();
      if (!html) return;
      document.execCommand("insertHTML", false, html);
      notifyChange();
    };

    const handleIndent = () => {
      exec("indent");
    };
    const handleOutdent = () => {
      exec("outdent");
    };

    const openPopover = (type) => {
      saveSelection();
      setPopover(type);
    };

    const ToolBtn = ({ cmd, format, onClick, title, children, active: activeProp }) => {
      const isActive = activeProp ?? (format && activeFormats.has(format));
      return (
        <button
          type="button"
          className={cn("rt-btn", isActive && "active")}
          title={title}
          onMouseDown={(e) => {
            e.preventDefault();
            onClick ? onClick() : exec(cmd);
          }}
        >
          {children}
        </button>
      );
    };

    return (
      <div className={cn("rich-editor-root", className)}>
        <style>{TOOLBAR_STYLES}</style>

        {popover === "link" && <LinkPopover onConfirm={handleLinkConfirm} onCancel={() => setPopover(null)} />}
        {popover === "html" && <HTMLPopover onConfirm={handleHTMLConfirm} onCancel={() => setPopover(null)} />}

        <div className="rt-wrapper">
          {/* Toolbar */}
          <div className="rt-toolbar" onMouseDown={(e) => e.preventDefault()}>
            {/* Text style */}
            <ToolBtn cmd="bold" format="bold" title="Bold (Ctrl+B)">
              <BoldIcon />
            </ToolBtn>
            <ToolBtn cmd="italic" format="italic" title="Italic (Ctrl+I)">
              <ItalicIcon />
            </ToolBtn>
            <ToolBtn cmd="underline" format="underline" title="Underline (Ctrl+U)">
              <UnderlineIcon />
            </ToolBtn>

            <div className="rt-divider" />

            {/* Block */}
            <ToolBtn cmd="formatBlock" title="Blockquote" onClick={() => exec("formatBlock", "blockquote")}>
              <QuoteIcon />
            </ToolBtn>
            <ToolBtn title="Unordered List" onClick={() => exec("insertUnorderedList")}>
              <ULIcon />
            </ToolBtn>
            <ToolBtn title="Ordered List" onClick={() => exec("insertOrderedList")}>
              <OLIcon />
            </ToolBtn>

            <div className="rt-divider" />

            {/* Indent */}
            <ToolBtn title="Indent" onClick={handleIndent}>
              <IndentIcon />
            </ToolBtn>
            <ToolBtn title="Outdent" onClick={handleOutdent}>
              <OutdentIcon />
            </ToolBtn>

            <div className="rt-divider" />

            {/* Inline code */}
            <ToolBtn
              title="Inline Code"
              onClick={() => {
                const sel = window.getSelection();
                const text = sel?.toString() || "code";
                exec("insertHTML", `<code>${text}</code>`);
              }}
            >
              <CodeIcon />
            </ToolBtn>

            {/* Link */}
            <ToolBtn title="Insert Link" onClick={() => openPopover("link")}>
              <LinkIcon />
            </ToolBtn>

            {/* HTML */}
            <ToolBtn title="Insert HTML" onClick={() => openPopover("html")}>
              <HTMLIcon />
            </ToolBtn>
          </div>

          {/* Editable */}
          <div
            ref={editorRef}
            className="rt-content"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onInput={notifyChange}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onSelect={updateActiveFormats}
            {...props}
          />
        </div>
      </div>
    );
  },
);
RichTextarea.displayName = "RichTextarea";

// ─── Demo ────────────────────────────────────────────────────────────────────
export default function App() {
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Georgia, serif",
        background: "#f1f5f9",
      }}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            style={{
              padding: "10px 24px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "Georgia, serif",
              fontWeight: 600,
            }}
          >
            Open Editor
          </button>
        </DialogTrigger>

        <DialogContent style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
          <DialogHeader>
            <DialogTitle>Rich Text Editor</DialogTitle>
            <DialogDescription>Format your message using the toolbar above.</DialogDescription>
          </DialogHeader>

          <RichTextarea placeholder="Write your message here…" onChange={(e) => setContent(e.target.value)} />

          <DialogFooter>
            <button
              onClick={() => {
                console.log("HTML output:", content);
                setOpen(false);
              }}
              style={{
                padding: "8px 20px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "Georgia, serif",
              }}
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
