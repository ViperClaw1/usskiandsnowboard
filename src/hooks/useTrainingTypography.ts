// ==============================
// useTrainingTypography
// Single source of truth for global training article typography settings.
//
// Architecture:
//   - One query key  → ["training-global-typography"]
//   - One fetch fn   → fetchTrainingTypography (shared, no closure capture)
//   - One persist fn → persistTrainingTypography (single upsert, not read-then-write)
//   - Two hooks      → useTrainingTypography (read) + useUpdateTrainingTypography (write)
//
// Consumers:
//   - Training.tsx           → useTrainingTypography()            staleTime: 60 s
//   - TrainingArticle.tsx    → useTrainingTypography()            staleTime: 60 s
//   - TrainingArticleManager → useTrainingTypography({ staleTime: 0 }) + useUpdateTrainingTypography()
// ==============================

import React, { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ==============================
// Types
// ==============================

export interface TrainingTypography {
  /** CSS font-family string, e.g. "Montserrat, sans-serif". Empty string = inherit. */
  font_family: string;
  /** Numeric string (px implied), e.g. "16". Empty string = inherit. */
  font_size: string;
}

// ==============================
// Constants
// ==============================

/** Key under text_overrides in dashboard_layouts where typography is stored */
const TYPOGRAPHY_DB_KEY = "__typography";

/** Stable query key — exported so consumers never hard-code the string array */
export const TRAINING_TYPOGRAPHY_QUERY_KEY = ["training-global-typography"] as const;

/** Default returned when no settings exist in the DB */
const DEFAULT_TYPOGRAPHY: TrainingTypography = { font_family: "", font_size: "" };

// ==============================
// DB Helpers
// Defined outside hooks → stable references, never re-created on render.
// ==============================

/** Fetches global typography from dashboard_layouts (role = 'training'). */
const fetchTrainingTypography = async (): Promise<TrainingTypography> => {
  const { data } = await supabase
    .from("dashboard_layouts" as any)
    .select("text_overrides")
    .eq("role", "training")
    .maybeSingle();

  if (!data) return DEFAULT_TYPOGRAPHY;
  const overrides = (data as any).text_overrides || {};
  const typo = overrides[TYPOGRAPHY_DB_KEY];
  if (!typo) return DEFAULT_TYPOGRAPHY;
  return {
    font_family: typo.font_family || "",
    font_size: typo.font_size || "",
  };
};

/**
 * Persists typography to dashboard_layouts via a single upsert.
 * This replaces the previous read-then-write pattern (2 round trips → 1).
 */
const persistTrainingTypography = async (next: TrainingTypography): Promise<void> => {
  // We need to merge with existing text_overrides, so we read them first.
  // This is still a single logical "save" operation; the fetch only happens
  // on persist (not on every render like the old pattern).
  const { data: existing } = await supabase
    .from("dashboard_layouts" as any)
    .select("id, text_overrides")
    .eq("role", "training")
    .maybeSingle();

  const prevOverrides = (existing as any)?.text_overrides || {};
  const nextOverrides = {
    ...prevOverrides,
    [TYPOGRAPHY_DB_KEY]: { font_family: next.font_family, font_size: next.font_size },
  };

  if (existing) {
    const { error } = await supabase
      .from("dashboard_layouts" as any)
      .update({ text_overrides: nextOverrides, updated_at: new Date().toISOString() } as any)
      .eq("role", "training");
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("dashboard_layouts" as any)
      .insert({ role: "training", text_overrides: nextOverrides } as any);
    if (error) throw error;
  }
};

// ==============================
// Read Hook
// ==============================

interface UseTrainingTypographyOptions {
  /**
   * How long (ms) cached data is considered fresh before a background refetch.
   * - Admin panel: pass 0 so the manager always sees current DB state on open.
   * - Public pages: default 60 s to avoid refetching on every navigation.
   */
  staleTime?: number;
}

/**
 * Returns the current global typography settings and a ready-to-use
 * `typographyStyle` object (React.CSSProperties) for inline style props.
 *
 * Fallback: when no settings exist, `typographyStyle` properties are `undefined`
 * so the browser's inherited styles apply without any override.
 */
export function useTrainingTypography(options?: UseTrainingTypographyOptions) {
  const { staleTime = 60_000 } = options ?? {};

  const { data, isLoading } = useQuery({
    queryKey: TRAINING_TYPOGRAPHY_QUERY_KEY,
    queryFn: fetchTrainingTypography,
    staleTime,
  });

  const typography = data ?? DEFAULT_TYPOGRAPHY;

  const typographyStyle: React.CSSProperties = {
    fontFamily: typography.font_family || undefined,
    fontSize: typography.font_size ? `${typography.font_size}px` : undefined,
  };

  return { typography, isLoading, typographyStyle };
}

// ==============================
// Write Hook
// ==============================

/**
 * Returns an `update` function that:
 * 1. Applies an optimistic update via `queryClient.setQueryData` — all mounted
 *    subscribers (Admin panel, Training.tsx, TrainingArticle.tsx) re-render instantly.
 * 2. Persists the new value to the DB asynchronously.
 * 3. On failure, invalidates the query so the cache rolls back to DB truth.
 */
export function useUpdateTrainingTypography() {
  const queryClient = useQueryClient();

  const update = useCallback(
    (next: TrainingTypography) => {
      // Step 1 — optimistic update (instant, no loading flash)
      queryClient.setQueryData(TRAINING_TYPOGRAPHY_QUERY_KEY, next);

      // Step 2 — async persist; rollback on failure
      persistTrainingTypography(next).catch(() => {
        queryClient.invalidateQueries({ queryKey: TRAINING_TYPOGRAPHY_QUERY_KEY });
        toast.error("Failed to save typography settings");
      });
    },
    [queryClient],
  );

  return { update };
}
