import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Type } from "lucide-react";
import { TypographySettings } from "@/hooks/useDashboardLayout";

const FONT_OPTIONS = [
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Open Sans", value: "Open Sans, sans-serif" },
  { label: "Lato", value: "Lato, sans-serif" },
];

const SIZE_OPTIONS = ["12", "13", "14", "15", "16", "17", "18", "20"];

interface TypographyControlsProps {
  typography: TypographySettings;
  onUpdate: (settings: TypographySettings) => void;
  disabled?: boolean;
}

export const TypographyControls = ({ typography, onUpdate, disabled }: TypographyControlsProps) => {
  return (
    <div className="flex items-center gap-2">
      <Type className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select
        value={typography.fontFamily}
        onValueChange={(v) => onUpdate({ ...typography, fontFamily: v })}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-36 text-xs">
          <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent>
          {FONT_OPTIONS.map((f) => (
            <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }} className="text-xs">
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={typography.fontSize}
        onValueChange={(v) => onUpdate({ ...typography, fontSize: v })}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 w-20 text-xs">
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          {SIZE_OPTIONS.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {s}px
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
