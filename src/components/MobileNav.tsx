// ==============================
// Imports
// ==============================

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSignOut } from "@/hooks/useSignOut";
import { NAV_ITEMS } from "@/constants/nav";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

// ==============================
// Component Definition
// Presentational mobile navigation sheet.
// Sign-out logic is delegated to the useSignOut hook — no Supabase calls here.
// ==============================

export const MobileNav = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useSignOut();
  const { user } = useAuth();
  const { role } = useUserRole(user?.id);

  // ==============================
  // Event Handlers
  // ==============================

  /** Close the sheet then sign out */
  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
  };

  // ==============================
  // Render
  // ==============================

  const navItems = user
    ? NAV_ITEMS.filter(
        (item) => !item.allowedRoles || (role && item.allowedRoles.includes(role as "athlete" | "employer" | "admin")),
      )
    : NAV_ITEMS.filter((item) => !item.allowedRoles);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="relative border-2 bg-background shadow-md"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6 text-foreground" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[280px] sm:w-[320px] animate-slide-in-right"
        aria-label="Mobile navigation"
      >
        <nav className="flex flex-col gap-2 mt-8" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "text-lg font-medium transition-all duration-200 py-3 px-4 rounded-md",
                location.pathname === item.to
                  ? "bg-primary/10 text-primary border-l-4 border-primary"
                  : "text-foreground hover:text-primary hover:bg-muted",
              )}
            >
              {item.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setOpen(false)} className="mt-4">
                <Button className="w-full">Dashboard</Button>
              </Link>
              <Link to="/settings" onClick={() => setOpen(false)}>
                <Button variant="secondary" className="w-full">
                  Settings
                </Button>
              </Link>
              <Button variant="outline" className="w-full" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="mt-4">
              <Button className="w-full">Sign In</Button>
            </Link>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
};
