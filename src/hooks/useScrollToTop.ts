import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls the window to the top whenever the current route changes.
 * Uses both window.scrollTo and document.documentElement/body scrollTop
 * assignment for maximum compatibility across Android and iOS Safari.
 */
export const useScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Primary method — works on most browsers
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Fallback for iOS Safari which sometimes ignores window.scrollTo
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
};
