import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TypographySettings {
  fontFamily: string;
  fontSize: string;
}

export interface DashboardLayout {
  text_overrides: Record<string, string>;
  typography: TypographySettings;
}

export type DashboardLayoutRole = "athlete" | "employer" | "expert";

const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontFamily: "Montserrat, sans-serif",
  fontSize: "16",
};

const TYPOGRAPHY_KEY = "__typography";

/** Read typography out of text_overrides (stored as serialised JSON under __typography). */
function parseTypographyFromOverrides(overrides: Record<string, string>): TypographySettings {
  try {
    if (overrides[TYPOGRAPHY_KEY]) {
      return JSON.parse(overrides[TYPOGRAPHY_KEY]) as TypographySettings;
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_TYPOGRAPHY;
}

/** Return a copy of overrides with typography embedded. */
function embedTypography(
  overrides: Record<string, string>,
  typography: TypographySettings
): Record<string, string> {
  return { ...overrides, [TYPOGRAPHY_KEY]: JSON.stringify(typography) };
}

export const useDashboardLayout = (role: DashboardLayoutRole) => {
  const [layout, setLayout] = useState<DashboardLayout>({
    text_overrides: {},
    typography: DEFAULT_TYPOGRAPHY,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLayout = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("dashboard_layouts" as any)
        .select("text_overrides")
        .eq("role", role)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const rawOverrides: Record<string, string> = (data as any).text_overrides || {};
        const typography = parseTypographyFromOverrides(rawOverrides);
        // Expose overrides without the internal __typography key
        const { [TYPOGRAPHY_KEY]: _omit, ...visibleOverrides } = rawOverrides;
        setLayout({ text_overrides: visibleOverrides, typography });
      }
    } catch (err) {
      console.error("Failed to load layout:", err);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  const updateTextOverride = useCallback((key: string, value: string) => {
    setLayout((prev) => ({
      ...prev,
      text_overrides: { ...prev.text_overrides, [key]: value },
    }));
  }, []);

  const updateTypography = useCallback((settings: TypographySettings) => {
    setLayout((prev) => ({ ...prev, typography: settings }));
  }, []);

  const saveLayout = useCallback(async () => {
    setSaving(true);
    try {
      // Embed typography inside text_overrides so we only need the single jsonb column.
      const text_overrides = embedTypography(layout.text_overrides, layout.typography);

      const { data: existing } = await supabase
        .from("dashboard_layouts" as any)
        .select("id")
        .eq("role", role)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("dashboard_layouts" as any)
          .update({ text_overrides, updated_at: new Date().toISOString() } as any)
          .eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dashboard_layouts" as any)
          .insert({ role, text_overrides } as any);
        if (error) throw error;
      }

      toast.success("Layout saved successfully!");
    } catch (err: any) {
      console.error("Failed to save layout:", err);
      toast.error("Failed to save layout: " + err.message);
    } finally {
      setSaving(false);
    }
  }, [role, layout]);

  const resetLayout = useCallback(() => {
    setLayout({ text_overrides: {}, typography: DEFAULT_TYPOGRAPHY });
  }, []);

  return {
    layout,
    loading,
    saving,
    updateTextOverride,
    updateTypography,
    saveLayout,
    resetLayout,
  };
};

// Read-only hook for actual dashboards
export const useDashboardTextOverrides = (role: DashboardLayoutRole) => {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [typography, setTypography] = useState<TypographySettings>(DEFAULT_TYPOGRAPHY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("dashboard_layouts" as any)
          .select("text_overrides")
          .eq("role", role)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const rawOverrides: Record<string, string> = (data as any).text_overrides || {};
          setTypography(parseTypographyFromOverrides(rawOverrides));
          const { [TYPOGRAPHY_KEY]: _omit, ...visibleOverrides } = rawOverrides;
          setOverrides(visibleOverrides);
        }
      } catch (err) {
        console.error("Failed to load text overrides:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [role]);

  const getText = useCallback((key: string, defaultValue: string) => overrides[key] ?? defaultValue, [overrides]);

  return { getText, typography, loading };
};
