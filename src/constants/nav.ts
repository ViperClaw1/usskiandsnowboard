// ==============================
// Navigation Constants
// Shared nav link definitions used by MobileNav and AuthenticatedNav
// ==============================

export interface NavItem {
  to: string;
  label: string;
  /** If set, only users with one of these roles will see this link. Undefined = visible to all. */
  allowedRoles?: Array<"athlete" | "employer" | "admin">;
}

/** Primary nav links shown in both mobile and desktop headers */
export const NAV_ITEMS: NavItem[] = [
  { to: "/athletes", label: "Athletes" },
  { to: "/employers", label: "Employers" },
  { to: "/experts", label: "Experts" },
  { to: "/schedule", label: "Schedule" },
  { to: "/news", label: "News" },
  { to: "/training", label: "Training", allowedRoles: ["athlete", "admin"] },
];
