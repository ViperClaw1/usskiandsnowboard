// ==============================
// PublicNav — Presentational Component
// Renders the unauthenticated header with logo, nav links, and mobile nav.
// Used on Index, News, Schedule, and Employers pages for guests.
// Wrapped in React.memo — pure component with no props, safe to skip re-renders.
// ==============================

import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/MobileNav";
import usLogo from "@/assets/us-logo-new.webp";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { NAV_ITEMS } from "@/constants/nav";

// ==============================
// Component Definition
// ==============================

/** Sticky public header — no auth required. Shows logo + nav links + Sign In CTA. */
export const PublicNav = memo(() => {
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
        <Link to="/">
          <img
            src={usLogo}
            alt="U.S. Ski & Snowboard"
            width={57}
            height={80}
            className="h-16 sm:h-20 hover:opacity-80 transition-opacity"
            fetchPriority="high"
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
          <Link to="/auth">
            <Button size="sm" className="lg:h-10">Sign In</Button>
          </Link>
        </nav>

        {/* Mobile hamburger menu */}
        <MobileNav />
      </div>
    </header>
  );
});

PublicNav.displayName = "PublicNav";
