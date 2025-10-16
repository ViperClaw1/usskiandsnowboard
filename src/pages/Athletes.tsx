import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Briefcase, TrendingUp } from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";

const Athletes = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={usSkiLogo} alt="U.S. Ski & Snowboard" className="h-10 hover:opacity-80 transition-opacity" />
          </Link>
          <nav className="flex items-center gap-8">
            <Link to="/athletes" className="text-primary font-medium">
              Athletes
            </Link>
            <Link to="/employers" className="text-foreground hover:text-primary font-medium transition-colors">
              Employers
            </Link>
            <Link to="/news" className="text-foreground hover:text-primary font-medium transition-colors">
              News
            </Link>
          </nav>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="py-20 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 text-center">
            <Users className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-5xl font-bold text-foreground mb-6">
              For Athletes
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Build your professional profile and connect with career opportunities that match your skills and ambitions beyond the slopes.
            </p>
            <Link to="/auth">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Why Join Our Platform?</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="shadow-elegant">
                <CardHeader>
                  <Target className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Showcase Your Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Create a comprehensive profile highlighting your athletic achievements, transferable skills, education, and career interests.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader>
                  <Briefcase className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Connect with Employers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Access a network of employers actively seeking talented athletes for internships, full-time positions, and unique opportunities.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader>
                  <TrendingUp className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Plan Your Future</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Transition smoothly from competitive sports to your next career chapter with guidance and connections tailored to your goals.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6 text-foreground">Ready to Take the Next Step?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join hundreds of U.S. Ski & Snowboard athletes building their careers beyond competition.
            </p>
            <Link to="/auth">
              <Button size="lg">Create Your Profile</Button>
            </Link>
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

export default Athletes;
