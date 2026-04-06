import { memo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";
import { PublicNav } from "@/components/layout/PublicNav";

// ==============================
// MemoizedOutlet
// Wrapping Outlet in memo means child pages (Schedule, News, Athletes, etc.)
// do not re-render when AppLayout re-renders due to auth state changes.
// Without this, every useAuth() emission in AppLayout cascades down to all
// routed pages via the Outlet even if the page itself has no auth dependency.
// ==============================
const MemoizedOutlet = memo(Outlet);

const PUBLIC_NAV_PATHS = ["/athletes", "/employers", "/experts", "/schedule", "/news"];

// ==============================
// Component Definition
// AppLayout subscribes to auth only to conditionally show AuthenticatedNav or PublicNav.
// The MemoizedOutlet below it is shielded from those re-renders entirely.
// ==============================
export const AppLayout = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const showPublicNav = !user && PUBLIC_NAV_PATHS.includes(pathname);

  return (
    <>
      {user && <AuthenticatedNav />}
      {showPublicNav && <PublicNav />}
      <MemoizedOutlet />
    </>
  );
};
