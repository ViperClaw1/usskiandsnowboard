// ==============================
// HowItWorksSection — Presentational Component
// Renders the 3-card "How It Works" grid shared by Index and Home pages.
// Pure UI — no data fetching, no state.
// Wrapped in React.memo — no props, always renders identically.
// ==============================

import { memo } from "react";
import { Users, GraduationCap, TrendingUp } from "lucide-react";

/** Three-card explainer grid shown on both the marketing landing and the auth home. */
export const HowItWorksSection = memo(() => (
  <section className="pt-6 pb-10 bg-muted">
    <div className="container mx-auto px-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-foreground">
        How It Works
      </h2>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
        {/* Athletes card */}
        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-elegant text-center">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">For Athletes</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Showcase the discipline, leadership, and drive that made you an elite athlete. Your next
            opportunity awaits beyond the slopes.
          </p>
        </div>

        {/* Experts card */}
        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-elegant text-center">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">For Experts</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Share your experience and guide the next generation. Mentor athletes as they transition
            from competition to their next chapter.
          </p>
        </div>

        {/* Engage card */}
        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-elegant text-center sm:col-span-2 md:col-span-1">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">Engage</h3>
          <p className="text-sm sm:text-base text-muted-foreground">
            Our Athlete Development team champions your transition—optimizing profiles, curating
            opportunities, and making meaningful connections happen.
          </p>
        </div>
      </div>
    </div>
  </section>
));

HowItWorksSection.displayName = "HowItWorksSection";
