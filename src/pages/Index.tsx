import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Briefcase, TrendingUp } from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";
import usSkiMobileLogo from "@/assets/us-ski-mobile-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={usSkiMobileLogo} alt="U.S. Ski & Snowboard" className="h-12 hover:opacity-80 transition-opacity md:hidden" />
            <img src={usSkiLogo} alt="U.S. Ski & Snowboard" className="h-[63px] hover:opacity-80 transition-opacity hidden md:block" />
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/athletes" className="text-foreground hover:text-primary font-medium transition-colors">
              Athletes
            </Link>
            <Link to="/employers" className="text-foreground hover:text-primary font-medium transition-colors">
              Partners
            </Link>
            <Link to="/news" className="text-foreground hover:text-primary font-medium transition-colors">
              News
            </Link>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative min-h-[600px] flex items-center justify-center bg-gradient-to-b from-background to-muted">
          <div className="relative z-10 container mx-auto px-4 text-center py-20">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">
              Athlete Career Dashboard
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connecting U.S. Ski & Snowboard athletes with career opportunities, 
              empowering transitions from competition to meaningful careers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?type=athlete">
                <Button size="lg" className="w-full sm:w-auto">
                  <Users className="mr-2 h-5 w-5" />
                  I'm an Athlete
                </Button>
              </Link>
              <Link to="/auth?type=employer">
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
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">How It Works</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card p-8 rounded-lg shadow-elegant text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">For Athletes</h3>
                <p className="text-muted-foreground">
                  Create a comprehensive professional profile showcasing your skills, 
                  experience, and career interests beyond the slopes.
                </p>
              </div>

              <div className="bg-card p-8 rounded-lg shadow-elegant text-center">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">For Partners</h3>
                <p className="text-muted-foreground">
                  Discover talented, driven athletes ready for career opportunities. 
                  Search by skills, interests, and location.
                </p>
              </div>

              <div className="bg-card p-8 rounded-lg shadow-elegant text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Engage</h3>
                <p className="text-muted-foreground">
                  Our Athlete Development team helps optimize Athlete profiles, curate partners, and facilitates actionable connections
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Learn more about US Ski & Snowboard</h2>
            <p className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto">
              Support the U.S. Ski & Snowboard Team and take your fandom to the next level
            </p>
            <a href="https://insider.usskiandsnowboard.org/s/" target="_blank" rel="noopener noreferrer">
              <Button size="lg">Become An Insider</Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 U.S. Ski & Snowboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
