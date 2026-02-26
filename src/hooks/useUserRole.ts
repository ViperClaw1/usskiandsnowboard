// ==============================
// useUserRole Hook
// Extracts the repeated user_roles query pattern from
// Athletes.tsx, Employers.tsx, and Dashboard.tsx
// ==============================

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the role for the given userId from the user_roles table.
 * Returns the role string (e.g. "athlete", "employer", "admin") or null
 * while loading / if no role is found.
 */
export const useUserRole = (userId: string | null | undefined) => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      return;
    }

    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setRole(data?.role ?? null);
        setLoading(false);
      });
  }, [userId]);

  return { role, loading };
};
