import { memo } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";

// ==============================
// MemoizedOutlet
// Wrapping Outlet in memo means child pages (Schedule, News, Athletes, etc.)
// do not re-render when AppLayout re-renders due to auth state changes.
// Without this, every useAuth() emission in AppLayout cascades down to all
// routed pages via the Outlet even if the page itself has no auth dependency.
// ==============================
const MemoizedOutlet = memo(Outlet);

// ==============================
// Component Definition
// AppLayout subscribes to auth only to conditionally show AuthenticatedNav.
// The MemoizedOutlet below it is shielded from those re-renders entirely.
// ==============================
export const AppLayout = () => {
  const { user } = useAuth();

  return (
    <>
      {user && <AuthenticatedNav />}
      <MemoizedOutlet />
    </>
  );
};
