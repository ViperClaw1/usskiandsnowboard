// ==============================
// PageFooter — Presentational Component
// Renders the shared copyright footer used on all public-facing pages.
// Wrapped in React.memo — no props, renders identically every time.
// ==============================

import { memo } from "react";

/** Simple copyright footer. Dumb component — no props, no logic. */
export const PageFooter = memo(() => (
  <footer className="border-t bg-card py-8">
    <div className="container mx-auto px-4 text-center text-muted-foreground">
      <p className="text-xs">&copy; 2025 U.S. Ski &amp; Snowboard. All rights reserved.</p>
    </div>
  </footer>
));

PageFooter.displayName = "PageFooter";
