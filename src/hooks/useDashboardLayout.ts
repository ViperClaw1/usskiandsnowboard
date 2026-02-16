import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DashboardLayout {
  text_overrides: Record<string, string>;
}

export const useDashboardLayout = (role: "athlete" | "employer") => {
  const [layout, setLayout] = useState<DashboardLayout>({ text_overrides: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLayout = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("dashboard_layouts" as any)
        .select("*")
        .eq("role", role)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setLayout({
          text_overrides: (data as any).text_overrides || {},
        });
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

  const saveLayout = useCallback(async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("dashboard_layouts" as any)
        .select("id")
        .eq("role", role)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("dashboard_layouts" as any)
          .update({
            text_overrides: layout.text_overrides,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dashboard_layouts" as any)
          .insert({
            role,
            text_overrides: layout.text_overrides,
          } as any);
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
    setLayout({ text_overrides: {} });
  }, []);

  return {
    layout,
    loading,
    saving,
    updateTextOverride,
    saveLayout,
    resetLayout,
  };
};

// Read-only hook for actual dashboards
export const useDashboardTextOverrides = (role: "athlete" | "employer") => {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
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
          setOverrides((data as any).text_overrides || {});
        }
      } catch (err) {
        console.error("Failed to load text overrides:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [role]);

  const getText = useCallback(
    (key: string, defaultValue: string) => overrides[key] ?? defaultValue,
    [overrides]
  );

  return { getText, loading };
};
