import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Award, Users, Search } from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";

const Employers = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <img src={usSkiLogo} alt="U.S. Ski & Snowboard" className="h-10 hover:opacity-80 transition-opacity" />
          </Link>
          <nav className="flex items-center gap-8">
            <Link to="/athletes" className="text-foreground hover:text-primary font-medium transition-colors">
              Athletes
            </Link>
            <Link to="/employers" className="text-primary font-medium">
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
            <Briefcase className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-5xl font-bold text-foreground mb-6">
              For Employers
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connect with exceptional athletes who bring dedication, resilience, and team-oriented skills to your organization.
            </p>
            <Link to="/auth">
              <Button size="lg">Post Opportunities</Button>
            </Link>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Why Hire Athletes?</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="shadow-elegant">
                <CardHeader>
                  <Award className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Elite Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Athletes are trained to perform under pressure, set ambitious goals, and consistently deliver results in high-stakes environments.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader>
                  <Users className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Team Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Years of competitive sports develop exceptional collaboration, communication, and leadership skills essential for any organization.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader>
                  <Search className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>Targeted Search</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Filter candidates by sport discipline, skills, education, geographic preferences, and career interests to find your perfect match.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6 text-foreground">Ready to Build Your Team?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Access a network of driven, talented athletes ready to bring their skills to your organization.
            </p>
            <Link to="/auth">
              <Button size="lg">Create Company Profile</Button>
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

export default Employers;
