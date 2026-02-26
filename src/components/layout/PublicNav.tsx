// ==============================
// PublicNav — Presentational Component
// Renders the unauthenticated header with logo, nav links, and mobile nav.
// Used on Index, News, Schedule, and Employers pages for guests.
// Wrapped in React.memo — pure component with no props, safe to skip re-renders.
// ==============================

import { memo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/MobileNav";
import usLogo from "@/assets/us-logo-new.png";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { NAV_ITEMS } from "@/constants/nav";

// ==============================
// Component Definition
// ==============================

/** Sticky public header — no auth required. Shows logo + nav links + Sign In CTA. */
export const PublicNav = memo(() => (
  <header
    className="sticky top-0 z-50"
    style={{
      backgroundImage: `url(${mountainHeaderBg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundColor: "#1e3a5f",
    }}
  >
    <div className="container mx-auto px-4 py-2 flex items-center justify-between">
      {/* Logo */}
      <Link to="/">
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
        <Link to="/auth">
          <Button size="sm" className="lg:h-10">Sign In</Button>
        </Link>
      </nav>

      {/* Mobile hamburger menu */}
      <MobileNav />
    </div>
  </header>
));

PublicNav.displayName = "PublicNav";
