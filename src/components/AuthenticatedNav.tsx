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
    [],
  );

  // ==============================
  // Render
  // ==============================

  return (
    <header className="sticky top-0 z-50 w-full min-w-0" style={headerStyle}>
      <div className="container mx-auto px-3 py-2 sm:px-4 sm:py-2 flex items-center justify-between gap-2 min-h-[3.5rem] min-[478px]:min-h-[4rem] md:min-h-0">
        {/* Logo: smaller below 478px, medium 478–768px, full from 768px */}
        <Link to="/" className="cursor-pointer shrink-0 flex items-center" aria-label="U.S. Ski & Snowboard home">
          <img
            src={usLogo}
            alt="U.S. Ski & Snowboard"
            className="h-10 min-[478px]:h-14 md:h-16 lg:h-20 w-auto hover:opacity-80 transition-opacity object-contain"
          />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-6 flex-1 justify-end min-w-0">
          {NAV_ITEMS.filter((item) => !item.allowedRoles || (role && item.allowedRoles.includes(role as any))).map(
            (item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base whitespace-nowrap shrink-0"
              >
                {item.label}
              </Link>
            ),
          )}

          {/* Authenticated CTAs */}
          <Link to="/dashboard" className="shrink-0">
            <Button size="sm" className="h-9 lg:h-10 bg-red-600 hover:bg-red-700 text-xs sm:text-sm">
              Dashboard
            </Button>
          </Link>
          <Link
            to="/settings"
            className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base whitespace-nowrap shrink-0"
          >
            Settings
          </Link>
          <Button size="sm" variant="outline" className="h-9 lg:h-10 text-xs sm:text-sm shrink-0" onClick={signOut}>
            Sign Out
          </Button>
        </nav>

        {/* Mobile hamburger menu */}
        <div className="md:hidden shrink-0">
          <MobileNav />
        </div>
      </div>
    </header>
  );
});

AuthenticatedNav.displayName = "AuthenticatedNav";
