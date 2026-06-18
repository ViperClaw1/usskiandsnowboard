// ==============================
// Imports
// ==============================
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import scheduleImage from "@/assets/schedule-2026-27.png.asset.json";
import { PageFooter } from "@/components/layout/PageFooter";

// ==============================
// Component Definition
// Schedule page. Purely presentational — no data fetching, no auth dependency.
// AuthenticatedNav is rendered by AppLayout for authenticated users.
// PublicNav is rendered by AppLayout (or Index) for unauthenticated visitors.
// This component does not need to know about auth state at all.
// ==============================
const Schedule = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <main className="flex-1 flex flex-col">
      {/* Page header with download CTA */}
      <section className="py-6 sm:py-8 bg-gradient-to-b from-background to-muted">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">2026-27 World Cup Schedule</h1>
              <p className="text-base sm:text-lg text-muted-foreground">U.S. Ski &amp; Snowboard World Cup events</p>
            </div>
            <a href={`${import.meta.env.BASE_URL}schedule.pdf`} download>
              <Button size="lg" className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Schedule image */}
      <section className="flex-1 py-6 sm:py-8">
        <div className="container mx-auto px-4">
          <div className="bg-card rounded-lg border border-border overflow-hidden shadow-elegant">
            <img
              src={scheduleImage.url}
              alt="2026-27 World Cup Schedule"
              className="w-full h-auto"
              width={1200}
              height={900}
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </section>
    </main>

    {/* Shared page footer */}
    <PageFooter />
  </div>
);

export default Schedule;
