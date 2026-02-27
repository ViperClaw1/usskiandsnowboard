import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, TrendingUp } from "lucide-react";
import usLogo from "@/assets/us-logo-new.png";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import heroMainImage from "@/assets/hero-main.jpg";
import { MobileNav } from "@/components/MobileNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50" style={{ 
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
            <a href={`${import.meta.env.BASE_URL}schedule.pdf`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base md:hidden">
              Schedule
            </a>
            <Link to="/schedule" className="text-white hover:text-white/80 font-medium transition-colors text-sm lg:text-base hidden md:block">
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

      <main>
        <section 
          className="relative min-h-[500px] sm:min-h-[600px] flex items-center justify-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroMainImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="relative z-10 container mx-auto px-4 text-center py-12 sm:py-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 animate-fade-in">
              Launch Your Next Chapter
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Connecting US Ski & Snowboard athletes with careers that honor their dedication, drive, and extraordinary talent.
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

        <section className="pt-6 pb-10 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-foreground">How It Works</h2>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="bg-card p-6 sm:p-8 rounded-lg shadow-elegant text-center">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">For Athletes</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Showcase the discipline, leadership, and drive that made you an elite athlete. Your next opportunity awaits beyond the slopes.
                </p>
              </div>

              <div className="bg-card p-6 sm:p-8 rounded-lg shadow-elegant text-center">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">For Partners</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Connect with world-class talent. Our athletes bring unmatched dedication, resilience, and excellence to every challenge.
                </p>
              </div>

              <div className="bg-card p-6 sm:p-8 rounded-lg shadow-elegant text-center sm:col-span-2 md:col-span-1">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-foreground">Engage</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Our Athlete Development team champions your transition—optimizing profiles, curating opportunities, and making meaningful connections happen.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-foreground">Join Our Legacy</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              For over 130 years, U.S. Ski & Snowboard has supported Olympic dreams. Join the journey and become an Insider today.
            </p>
            <a href="https://insider.usskiandsnowboard.org/s/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="w-full sm:w-auto">Become An Insider</Button>
            </a>
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

export default Index;
