// ==============================
// JoinLegacySection — Presentational Component
// Renders the "Join Our Legacy" CTA section shared by Index and Home pages.
// Pure UI — no data fetching, no state.
// Wrapped in React.memo — no props, always renders identically.
// ==============================

import { memo } from "react";
import { Button } from "@/components/ui/button";

/** Full-width CTA section prompting visitors to become a U.S. Ski & Snowboard Insider. */
export const JoinLegacySection = memo(() => (
  <section className="py-12 sm:py-16 lg:py-20 bg-muted">
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-foreground">Join Our Legacy</h2>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
        For over 130 years, U.S. Ski &amp; Snowboard has supported Olympic dreams. Join the journey
        and become an Insider today.
      </p>
      <a href="https://insider.usskiandsnowboard.org/s/" target="_blank" rel="noopener noreferrer">
        <Button size="lg" className="w-full sm:w-auto">
          Become An Insider
        </Button>
      </a>
    </div>
  </section>
));

JoinLegacySection.displayName = "JoinLegacySection";
