// ==============================
// useUserRole Hook
// Fetches the role for a given userId from the user_roles table.
// Uses useQuery so the result is cached globally in the QueryClient —
// multiple consumers (Home, Athletes, Employers) share the same cache
// entry for a given userId, preventing redundant network requests.
// ==============================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ==============================
// Query Function
// Extracted outside the hook so it is a stable reference (not recreated per render).
// ==============================
const fetchUserRole = async (userId: string): Promise<string | null> => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
};

// ==============================
// Hook Definition
// ==============================

/**
 * Returns the app role ("athlete" | "employer" | "admin") for the given userId.
 * Result is cached for 5 minutes — repeat calls with the same userId are instant.
 */
export const useUserRole = (userId: string | null | undefined) => {
  const { data: role = null, isLoading: loading } = useQuery({
    queryKey: ["user-role", userId],
    queryFn:  () => fetchUserRole(userId!),
    // Only run the query when userId is available
    enabled:  !!userId,
    // Cache role for 5 minutes — role changes are rare and acceptable to be slightly stale
    staleTime: 5 * 60 * 1000,
  });

  return { role, loading };
};
