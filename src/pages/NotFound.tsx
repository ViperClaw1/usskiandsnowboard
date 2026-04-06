// ==============================
// Imports
// ==============================

import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

// ==============================
// Component Definition
// Static 404 page. Logs the attempted route and sets the document title.
// ==============================

const NotFound = () => {
  // ==============================
  // Hooks
  // ==============================
  const location = useLocation();

  // ==============================
  // Effects
  // ==============================
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    document.title = "404 - Page Not Found | U.S. Ski & Snowboard";
  }, [location.pathname]);

  // ==============================
  // Render
  // ==============================

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="mb-4 text-6xl font-bold text-foreground">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-foreground">Page Not Found</h2>
        <p className="mb-8 text-lg text-muted-foreground max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button size="lg">
            <Home className="mr-2 h-5 w-5" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
