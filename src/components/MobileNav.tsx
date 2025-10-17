import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <nav className="flex flex-col gap-4 mt-8">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`text-lg font-medium transition-colors py-2 ${
                location.pathname === item.to
                  ? "text-primary"
                  : "text-foreground hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/auth" onClick={() => setOpen(false)}>
            <Button className="w-full mt-4">Sign In</Button>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
};
