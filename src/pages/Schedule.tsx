import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import usLogo from "@/assets/us-logo-new.png";
import scheduleImage from "@/assets/schedule-image.png";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { MobileNav } from "@/components/MobileNav";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";
import { useAuth } from "@/components/auth/AuthContext";

const Schedule = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {user ? (
        <AuthenticatedNav />
      ) : (
        <header className="border-b sticky top-0 z-50" style={{ 
          backgroundImage: `url(${mountainHeaderBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#1e3a5f'
        }}>
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <Link to="/">
              <img src={usLogo} alt="U.S. Ski & Snowboard" className="h-16 sm:h-20 hover:opacity-80 transition-opacity" />
            </Link>
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              <Link to="/athletes" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
                Athletes
              </Link>
              <Link to="/employers" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
                Partners
              </Link>
              <Link to="/schedule" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
                Schedule
              </Link>
              <Link to="/news" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base">
                News
              </Link>
              <Link to="/auth">
                <Button size="sm" className="lg:h-10">Sign In</Button>
              </Link>
            </nav>
            <MobileNav />
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col">
        <section className="py-6 sm:py-8 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  2025-26 Season Schedule
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground">
                  Where to see U.S. Ski & Snowboard events
                </p>
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

        <section className="flex-1 py-6 sm:py-8">
          <div className="container mx-auto px-4">
            <div className="bg-card rounded-lg border border-border overflow-hidden shadow-elegant">
              <img
                src={scheduleImage}
                alt="2025-26 Season Schedule"
                className="w-full h-auto"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-xs">&copy; 2025 U.S. Ski & Snowboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Schedule;
