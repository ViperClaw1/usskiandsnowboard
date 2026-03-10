// ==============================
// PublicNav — Presentational Component
// Renders the unauthenticated header with logo, nav links, and mobile nav.
// Shown for logged-out users on Athletes, Employers, Schedule, and News.
// Training is hidden for logged-out users (allowedRoles-only items are excluded).
// ==============================

import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/MobileNav";
import usLogo from "@/assets/us-logo-new.png";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { NAV_ITEMS } from "@/constants/nav";
import { useAuth } from "@/components/auth/AuthContext";

// ==============================
// Component Definition
// ==============================

/** Sticky public header for guests. Shows logo + nav links (no Training when logged out) + Sign In CTA. */
export const PublicNav = memo(() => {
  const { user } = useAuth();

  // Logged-out users: hide items with allowedRoles (e.g. Training). Logged-in users see all.
  const navItems = useMemo(() => (user ? NAV_ITEMS : NAV_ITEMS.filter((item) => !item.allowedRoles)), [user]);

  const headerStyle = useMemo(
    () => ({
      backgroundImage: `url(${mountainHeaderBg})`,
      backgroundSize: "cover" as const,
      backgroundPosition: "center" as const,
      backgroundColor: "#1e3a5f",
    }),
    [],
  );

  return (
    <header className="sticky top-0 z-50 w-full min-w-0" style={headerStyle} role="banner">
      <div className="container mx-auto px-3 py-2 sm:px-4 sm:py-2 flex items-center justify-between gap-2 min-h-[3.5rem] min-[478px]:min-h-[4rem] md:min-h-0">
        {/* Logo: smaller below 478px, medium 478–768px, full from 768px */}
        <Link
          to="/"
          className="hover:opacity-80 transition-opacity shrink-0 flex items-center"
          aria-label="U.S. Ski & Snowboard home"
        >
          <img
            src={usLogo}
            alt=""
            width={57}
            height={80}
            className="h-10 min-[478px]:h-14 md:h-16 lg:h-20 w-auto object-contain"
            fetchPriority="high"
          />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-3 lg:gap-6 flex-1 justify-end min-w-0" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base whitespace-nowrap shrink-0"
            >
              {item.label}
            </Link>
          ))}
          <Link to="/auth" className="shrink-0">
            <Button size="sm" className="h-9 lg:h-10 text-xs sm:text-sm">
              Sign In
            </Button>
          </Link>
        </nav>

        {/* Mobile hamburger menu */}
        <div className="md:hidden shrink-0">
          <MobileNav />
        </div>
      </div>
    </header>
  );
});

PublicNav.displayName = "PublicNav";
