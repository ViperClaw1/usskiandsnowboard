// ==============================
// Imports
// ==============================

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Briefcase } from "lucide-react";
import heroMainImage from "@/assets/hero-main.webp";
import { PublicNav } from "@/components/layout/PublicNav";
import { PageFooter } from "@/components/layout/PageFooter";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { JoinLegacySection } from "@/components/home/JoinLegacySection";

// ==============================
// Component Definition
// Public landing page for unauthenticated visitors.
// Purely presentational — no data fetching, no auth checks.
// ==============================

const Index = () => {
  // ==============================
  // Derived Values — Stable style objects
  // useMemo prevents inline object recreation on every render tick
  // ==============================
  const heroStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroMainImage})`,
      backgroundSize: "cover" as const,
      backgroundPosition: "center" as const,
    }),
    []
  );

  // ==============================
  // Render
  // ==============================

  return (
    <div className="min-h-screen bg-background">
      {/* Shared public header */}
      <PublicNav />

      <main>
        {/* Hero Section — full-bleed background image with CTAs */}
        <section
          className="relative min-h-[500px] sm:min-h-[600px] flex items-center justify-center"
          style={heroStyle}
        >
          <div className="relative z-10 container mx-auto px-4 text-center py-12 sm:py-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 animate-fade-in">
              Launch Your Next Chapter
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Connecting US Ski &amp; Snowboard athletes with careers that honor their dedication, drive,
              and extraordinary talent.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link to="/auth?type=athlete" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  <Users className="mr-2 h-5 w-5" />
                  I'm an Athlete
                </Button>
              </Link>
              <Link to="/auth?type=employer" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Briefcase className="mr-2 h-5 w-5" />
                  I'm a Partner
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Shared "How It Works" 3-card grid */}
        <HowItWorksSection />

        {/* Shared "Join Our Legacy" CTA */}
        <JoinLegacySection />
      </main>

      {/* Shared page footer */}
      <PageFooter />
    </div>
  );
};

export default Index;
