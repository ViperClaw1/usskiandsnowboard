import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: "/athletes", label: "Athletes" },
    { to: "/employers", label: "Partners" },
    { to: "/schedule", label: "Schedule" },
    { to: "/news", label: "News" },
  ];

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Ignore session_not_found errors since user is already logged out
    if (error && error.message !== "Session from session_id claim in JWT does not exist") {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
    }
    setOpen(false);
    // Always navigate to home regardless of error
    navigate("/");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="outline" size="icon" className="relative border-2 bg-background shadow-md">
          <Menu className="h-6 w-6 text-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-[280px] sm:w-[320px] animate-slide-in-right"
      >
        <nav className="flex flex-col gap-2 mt-8">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "text-lg font-medium transition-all duration-200 py-3 px-4 rounded-md",
                location.pathname === item.to
                  ? "bg-primary/10 text-primary border-l-4 border-primary"
                  : "text-foreground hover:text-primary hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/dashboard" onClick={() => setOpen(false)} className="mt-4">
            <Button className="w-full">Dashboard</Button>
          </Link>
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            Sign Out
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
};
