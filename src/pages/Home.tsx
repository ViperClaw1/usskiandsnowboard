import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, TrendingUp, ArrowRight, Newspaper, Loader2, ExternalLink } from "lucide-react";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import heroImage from "@/assets/hero-skiing.jpg";
import newsSectionBg from "@/assets/news-section-bg.jpg";
const Home = () => {
  const {
    data: articles,
    isLoading
  } = useQuery({
    queryKey: ['featured-news'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('news_articles').select('*').order('created_at', {
        ascending: false
      }).limit(3);
      if (error) throw error;
      return data;
    }
  });
  return <div className="min-h-screen bg-background">
      <AuthenticatedNav />

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[500px] sm:min-h-[600px] flex items-center justify-center" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
          <div className="relative z-10 container mx-auto px-4 text-center py-12 sm:py-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 animate-fade-in">
              Connect With Olympic Athletes      
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Connecting US Ski & Snowboard athletes with careers that honor their dedication, drive, and extraordinary talent.
            </p>
            <Link to="/dashboard">
              <Button size="lg" className="w-full sm:w-auto">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="pt-12 pb-10 bg-muted">
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

        {/* View Athletes & Partners Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-foreground">
              Discover Talent & Opportunities
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              <div className="bg-card p-8 rounded-lg shadow-elegant text-center border border-border hover:shadow-lg transition-shadow">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3 text-foreground">Browse Athletes</h3>
                <p className="text-muted-foreground mb-6">
                  Explore profiles of talented athletes ready for their next career move.
                </p>
                <Link to="/athletes">
                  <Button className="w-full">
                    View Athletes
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="bg-card p-8 rounded-lg shadow-elegant text-center border border-border hover:shadow-lg transition-shadow">
                <Briefcase className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3 text-foreground">Browse Partners</h3>
                <p className="text-muted-foreground mb-6">
                  Discover organizations offering exciting career opportunities.
                </p>
                <Link to="/employers">
                  <Button variant="secondary" className="w-full">
                    View Partners
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured News Section */}
        <section className="py-12 sm:py-16 lg:py-20 relative" style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url(${newsSectionBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center justify-between mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <Newspaper className="h-8 w-8 text-white" />
                Featured News
              </h2>
              <Link to="/news">
                <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            {isLoading ? <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div> : articles && articles.length > 0 ? <div className="grid md:grid-cols-3 gap-6">
                {articles.map(article => <Card key={article.id} className="shadow-elegant hover:shadow-lg transition-shadow bg-white/95 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors flex items-start gap-2 text-foreground">
                          <span className="flex-1">{article.title}</span>
                          <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                        </a>
                      </CardTitle>
                      {article.date && <p className="text-sm text-muted-foreground">{article.date}</p>}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {article.excerpt}
                      </p>
                    </CardContent>
                  </Card>)}
              </div> : <Card className="shadow-elegant bg-white/95 backdrop-blur">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No news articles available at the moment.
                  </p>
                </CardContent>
              </Card>}
          </div>
        </section>


        {/* Join Section */}
        <section className="py-12 sm:py-16 lg:py-20 bg-muted">
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
    </div>;
};
export default Home;