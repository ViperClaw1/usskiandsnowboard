// ==============================
// PageFooter — Presentational Component
// Renders the shared copyright footer used on all public-facing pages.
// ==============================

/** Simple copyright footer. Dumb component — no props, no logic. */
export const PageFooter = () => (
  <footer className="border-t bg-card py-8">
    <div className="container mx-auto px-4 text-center text-muted-foreground">
      <p className="text-xs">&copy; 2025 U.S. Ski &amp; Snowboard. All rights reserved.</p>
    </div>
  </footer>
);
