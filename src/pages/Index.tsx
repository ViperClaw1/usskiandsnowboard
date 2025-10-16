import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Briefcase, Target } from 'lucide-react';
import heroImage from '@/assets/hero-background.jpg';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(to right, hsl(var(--background) / 0.95), hsl(var(--background) / 0.7)), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <div className="container relative z-10 px-4 mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground animate-fade-in">
            Athlete Career Dashboard
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-muted-foreground max-w-3xl mx-auto">
            Connecting U.S. Ski & Snowboard athletes with meaningful career opportunities beyond competition
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate(user ? '/dashboard' : '/auth')}
              className="text-lg px-8 shadow-[var(--shadow-hover)] hover:shadow-[var(--shadow-elegant)] transition-all"
            >
              {user ? 'Go to Dashboard' : 'Get Started'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/auth')}
              className="text-lg px-8"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container px-4 mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-foreground">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-8 rounded-lg bg-gradient-to-b from-background to-secondary shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-hover)] transition-all">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground">For Athletes</h3>
              <p className="text-muted-foreground">
                Create your professional profile showcasing skills, experience, and career aspirations. Connect with employers seeking talented individuals.
              </p>
            </div>

            <div className="text-center p-8 rounded-lg bg-gradient-to-b from-background to-secondary shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-hover)] transition-all">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <Briefcase className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground">For Employers</h3>
              <p className="text-muted-foreground">
                Search and discover motivated, high-performing athletes. Request connections to explore internships, jobs, and mentorship opportunities.
              </p>
            </div>

            <div className="text-center p-8 rounded-lg bg-gradient-to-b from-background to-secondary shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-hover)] transition-all">
              <div className="w-16 h-16 bg-primary-glow rounded-full flex items-center justify-center mx-auto mb-6">
                <Target className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground">Impact & Results</h3>
              <p className="text-muted-foreground">
                Track meaningful outcomes from connections to placements. Demonstrate tangible impact for donors, sponsors, and trustees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary-glow to-accent">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-primary-foreground">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
            Join the platform connecting athletes with their next career opportunity
          </p>
          <Button 
            size="lg"
            variant="secondary"
            onClick={() => navigate('/auth')}
            className="text-lg px-8 shadow-lg hover:shadow-xl transition-all"
          >
            Create Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-card border-t border-border">
        <div className="container px-4 mx-auto text-center">
          <p className="text-muted-foreground">
            © 2025 U.S. Ski & Snowboard Athlete Career Dashboard. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
