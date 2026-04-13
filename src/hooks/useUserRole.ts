// ==============================
// useUserRole Hook
// Fetches the role for a given userId from the user_roles table.
// Uses useQuery so the result is cached globally in the QueryClient —
// multiple consumers (Home, Athletes, Employers) share the same cache
// entry for a given userId, preventing redundant network requests.
// ==============================
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    .order("role", { ascending: false })
    .limit(1);
  return data?.[0]?.role ?? null;
};

// ==============================
// Hook Definition
// ==============================
/**
 * Returns the app role ("athlete" | "employer" | "admin") for the given userId.
 * Result is cached for 5 minutes — repeat calls with the same userId are instant.
 *
 * initialData reads the QueryClient cache synchronously before the first render
 * commits. Without it, role starts as null on every mount even when the cache
 * is populated — causing AuthenticatedNav to render with no role-filtered items
 * first, then re-render with the full item list, pushing page content down and
 * triggering a scrollbar flash on repeat visits.
 */
export const useUserRole = (userId: string | null | undefined) => {
  const queryClient = useQueryClient();

  const { data: role = null, isLoading: loading } = useQuery<string | null>({
    queryKey: ["user-role", userId],
    queryFn: () => fetchUserRole(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    // Reads from cache synchronously on repeat mounts — role is never null
    // for a returning user, so the nav renders with the correct items immediately.
    initialData: () => (userId ? queryClient.getQueryData<string | null>(["user-role", userId]) : undefined),
  });

  return { role, loading };
};
