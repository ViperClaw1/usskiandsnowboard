import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: "/athletes", label: "Athletes" },
    { to: "/employers", label: "Partners" },
    { to: "/news", label: "News" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" className="relative">
          <Menu className="h-6 w-6 transition-transform duration-200" />
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
          <Link to="/auth" onClick={() => setOpen(false)} className="mt-4">
            <Button className="w-full">Sign In</Button>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
};
