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
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/components/auth/AuthContext";

export const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { session } = useAuth();

  const navItems = [
    { to: "/athletes", label: "Athletes" },
    { to: "/employers", label: "Partners" },
    { to: `${import.meta.env.BASE_URL}schedule.pdf`, label: "Schedule", external: true },
    { to: "/news", label: "News" },
  ];

  return (
    <div className="flex items-center gap-2 md:hidden">
      {session?.user && <NotificationBell userId={session.user.id} />}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
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
            item.external ? (
              <a
                key={item.to}
                href={item.to}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="text-lg font-medium transition-all duration-200 py-3 px-4 rounded-md text-foreground hover:text-primary hover:bg-muted"
              >
                {item.label}
              </a>
            ) : (
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
            )
          ))}
          <Link to="/auth" onClick={() => setOpen(false)} className="mt-4">
            <Button className="w-full">Sign In</Button>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
    </div>
  );
};
