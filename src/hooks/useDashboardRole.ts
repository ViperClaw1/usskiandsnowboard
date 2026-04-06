import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const dashboardRoleKey = (userId: string) => ["dashboard-role", userId];

export const fetchDashboardRole = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("role", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const adminRole = data.find((r) => r.role === "admin");
  return adminRole ? adminRole.role : data[0].role;
};

export const useDashboardRole = (userId: string | null | undefined, enabled = true) => {
  const queryClient = useQueryClient();

  const { data: role = null, isLoading: roleLoading } = useQuery<string | null>({
    queryKey: dashboardRoleKey(userId ?? ""),
    queryFn: () => fetchDashboardRole(userId!),
    enabled: !!userId && enabled,
    initialData: () => (userId ? queryClient.getQueryData<string | null>(dashboardRoleKey(userId)) : undefined),
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => 1000 * (attempt + 1),
  });

  return { role, roleLoading };
};
