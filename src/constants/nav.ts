// ==============================
// Navigation Constants
// Shared nav link definitions used by MobileNav and AuthenticatedNav
// ==============================

export interface NavItem {
  to: string;
  label: string;
}

/** Primary nav links shown in both mobile and desktop headers */
export const NAV_ITEMS: NavItem[] = [
  { to: "/athletes", label: "Athletes" },
  { to: "/employers", label: "Partners" },
  { to: "/schedule", label: "Schedule" },
  { to: "/news", label: "News" },
  { to: "/training", label: "Training" },
];
