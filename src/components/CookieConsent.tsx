import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg p-4 animate-in slide-in-from-bottom">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-sm text-muted-foreground">
          <p>
            We use essential cookies to ensure our site functions properly. By continuing to use this site, you agree to our use of cookies.{" "}
            <a href="/privacy" className="underline hover:text-foreground">
              Learn more
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleDecline} variant="outline" size="sm">
            Decline
          </Button>
          <Button onClick={handleAccept} size="sm">
            Accept
          </Button>
          <Button
            onClick={handleDecline}
            variant="ghost"
            size="sm"
            className="sm:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
