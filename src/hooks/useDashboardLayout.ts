import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface DashboardLayout {
  text_overrides: Record<string, string>;
}

// ==============================
// Query Key
// ==============================
const dashboardLayoutKey = (role: "athlete" | "employer") => ["dashboard-layout", role];

// ==============================
// Query Function
// ==============================
const fetchDashboardLayout = async (role: "athlete" | "employer"): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from("dashboard_layouts" as any)
    .select("text_overrides")
    .eq("role", role)
    .maybeSingle();

  if (error) throw error;
  return (data as any)?.text_overrides ?? {};
};

// ==============================
// useDashboardLayout
// Full read/write hook used by the admin layout editor.
// ==============================
export const useDashboardLayout = (role: "athlete" | "employer") => {
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<DashboardLayout>({ text_overrides: {} });
  const [saving, setSaving] = useState(false);

  const { data: queryData, isLoading: loading } = useQuery<Record<string, string>>({
    queryKey: dashboardLayoutKey(role),
    queryFn: () => fetchDashboardLayout(role),
    initialData: () => queryClient.getQueryData<Record<string, string>>(dashboardLayoutKey(role)),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (queryData) {
      setLayout({ text_overrides: queryData });
    }
  }, [queryData]);

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
          .insert({ role, text_overrides: layout.text_overrides } as any);
        if (error) throw error;
      }

      // Update cache after save
      queryClient.setQueryData(dashboardLayoutKey(role), layout.text_overrides);
      toast.success("Layout saved successfully!");
    } catch (err: any) {
      console.error("Failed to save layout:", err);
      toast.error("Failed to save layout: " + err.message);
    } finally {
      setSaving(false);
    }
  }, [role, layout, queryClient]);

  const resetLayout = useCallback(() => {
    setLayout({ text_overrides: {} });
  }, []);

  return { layout, loading, saving, updateTextOverride, saveLayout, resetLayout };
};

// ==============================
// useDashboardTextOverrides
// Read-only hook used by AthleteLandingPage and PartnerLandingPage.
//
// Previously used useState(true) + useEffect, so on every mount:
//   1. overrides = {} / loading = true  → getText returns all defaults
//   2. fetch completes → overrides = { ...actual values } / loading = false
//      → getText returns overridden values → component re-renders
//
// For the athlete role, the dashboard_layouts row has actual text overrides,
// so step 2 produced different text values than step 1, causing a layout
// shift that pushed the page past viewport height — scrollbar flash.
//
// Now initialData reads from cache synchronously on repeat visits so
// overrides is populated from frame zero — no intermediate re-render,
// no layout shift, no scrollbar flash.
// ==============================
export const useDashboardTextOverrides = (role: "athlete" | "employer") => {
  const queryClient = useQueryClient();

  const { data: overrides = {}, isLoading: loading } = useQuery<Record<string, string>>({
    queryKey: dashboardLayoutKey(role),
    queryFn: () => fetchDashboardLayout(role),
    // Reads from cache synchronously on repeat mounts — overrides is never {}
    // for a returning user when the athlete layout row has actual values.
    initialData: () => queryClient.getQueryData<Record<string, string>>(dashboardLayoutKey(role)),
    staleTime: 5 * 60 * 1000,
  });

  const getText = useCallback((key: string, defaultValue: string) => overrides[key] ?? defaultValue, [overrides]);

  return { getText, loading };
};
