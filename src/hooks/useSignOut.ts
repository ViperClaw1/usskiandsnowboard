// ==============================
// useSignOut Hook
// Extracts the repeated sign-out + storage-clear pattern from
// AuthenticatedNav and MobileNav into a single reusable hook
// ==============================

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Returns a stable `signOut` callback that:
 * 1. Calls Supabase local sign-out
 * 2. Clears localStorage and sessionStorage
 * 3. Navigates to "/"
 * 4. Shows a success toast
 */
export const useSignOut = () => {
  const navigate = useNavigate();

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Signed out successfully");
    } catch (e) {
      console.error("Sign out exception:", e);
      // Still clear storage and navigate even on error
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Signed out successfully");
    }
    navigate("/");
  }, [navigate]);

  return { signOut };
};
