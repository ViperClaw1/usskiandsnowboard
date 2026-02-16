import { useState, useRef, useEffect } from "react";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  textKey: string;
  overrides: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
}

export const EditableText = ({
  value,
  textKey,
  overrides,
  onUpdate,
  className,
  as: Tag = "span",
}: EditableTextProps) => {
  const displayValue = overrides[textKey] ?? value;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(overrides[textKey] ?? value);
  }, [overrides, textKey, value]);

  const handleConfirm = () => {
    onUpdate(textKey, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(displayValue);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConfirm();
            if (e.key === "Escape") handleCancel();
          }}
          className="border border-primary rounded px-2 py-0.5 text-sm bg-background text-foreground min-w-[80px]"
          style={{ width: `${Math.max(draft.length * 8, 80)}px` }}
        />
        <button
          onClick={handleConfirm}
          className="p-1 rounded hover:bg-primary/10 text-green-600"
          title="Confirm"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 rounded hover:bg-destructive/10 text-destructive"
          title="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </span>
    );
  }

  return (
    <Tag
      className={cn("group/editable inline-flex items-center gap-1 cursor-pointer", className)}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {displayValue}
      <Pencil className="h-3 w-3 opacity-0 group-hover/editable:opacity-60 transition-opacity text-primary" />
    </Tag>
  );
};
