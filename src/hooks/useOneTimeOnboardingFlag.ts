import { useCallback } from "react";

export const useOneTimeOnboardingFlag = (key: string) => {
  const hasShown = useCallback(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) === "true";
  }, [key]);

  const markShown = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, "true");
  }, [key]);

  return { hasShown, markShown };
};
