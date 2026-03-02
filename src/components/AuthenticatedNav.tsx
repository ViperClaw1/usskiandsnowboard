// ==============================
// Imports
// ==============================

import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import usLogo from "@/assets/us-logo-new.png";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { MobileNav } from "@/components/MobileNav";
import { useSignOut } from "@/hooks/useSignOut";
import { NAV_ITEMS } from "@/constants/nav";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

// ==============================
// Component Definition
// Authenticated sticky header. Sign-out logic delegated to useSignOut hook.
// Wrapped in React.memo — no props, safe to skip re-renders across route changes.
// ==============================

export const AuthenticatedNav = memo(() => {
  // ==============================
  // Hooks
  // ==============================
  const { signOut } = useSignOut();
  const { user } = useAuth();
  const { role } = useUserRole(user?.id);

  // ==============================
  // Derived Values — Stable style object
  // Extracted with useMemo to prevent recreating the object on every render tick
  // ==============================
  const headerStyle = useMemo(
    () => ({
      backgroundImage: `url(${mountainHeaderBg})`,
      backgroundSize: "cover" as const,
      backgroundPosition: "center" as const,
      backgroundColor: "#1e3a5f",
    }),
    []
  );

  // ==============================
  // Render
  // ==============================

  return (
    <header className="sticky top-0 z-50" style={headerStyle}>
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="cursor-pointer">
          <img
            src={usLogo}
            alt="U.S. Ski & Snowboard"
            className="h-16 sm:h-20 hover:opacity-80 transition-opacity"
          />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base"
            >
              {item.label}
            </Link>
          ))}

          {/* Authenticated CTAs */}
          <Link to="/dashboard">
            <Button size="sm" className="lg:h-10 bg-red-600 hover:bg-red-700">
              Dashboard
            </Button>
          </Link>
          <Link
            to="/settings"
            className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base"
          >
            Settings
          </Link>
          <Button size="sm" variant="outline" className="lg:h-10" onClick={signOut}>
            Sign Out
          </Button>
        </nav>

        {/* Mobile hamburger menu */}
        <MobileNav />
      </div>
    </header>
  );
});

AuthenticatedNav.displayName = "AuthenticatedNav";
