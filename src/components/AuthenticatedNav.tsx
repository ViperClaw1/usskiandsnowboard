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
//
// Nav items with allowedRoles are rendered with visibility:hidden rather than
// being filtered out entirely. Filtering caused the nav to reflow when the role
// resolved (null → "athlete"), changing the nav height and shifting all page
// content — producing the scrollbar flash on repeated dashboard visits.
// Using visibility:hidden keeps the nav the same height regardless of whether
// the role has resolved, eliminating the layout shift entirely.
// ==============================
export const AuthenticatedNav = memo(() => {
  const { signOut } = useSignOut();
  const { user } = useAuth();
  const { role } = useUserRole(user?.id);

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
    <header className="sticky top-0 z-50" style={headerStyle}>
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="cursor-pointer">
          <img src={usLogo} alt="U.S. Ski & Snowboard" className="h-16 sm:h-20 hover:opacity-80 transition-opacity" width={57} height={80} />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          {NAV_ITEMS.map((item) => {
            // Determine visibility: items with no role restriction are always
            // visible. Role-restricted items use visibility:hidden (not display:none)
            // so they still occupy space in the layout — preventing nav reflow
            // when the role resolves from null to the actual value.
            const isAllowed =
              !item.allowedRoles ||
              (role !== null && item.allowedRoles.includes(role as "athlete" | "employer" | "admin"));
            const isRestricted = !!item.allowedRoles;

            return (
              <Link
                key={item.to}
                to={item.to}
                className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base"
                style={isRestricted ? { visibility: isAllowed ? "visible" : "hidden" } : undefined}
                // Prevent interaction with hidden items
                tabIndex={isRestricted && !isAllowed ? -1 : undefined}
                aria-hidden={isRestricted && !isAllowed ? true : undefined}
              >
                {item.label}
              </Link>
            );
          })}

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
