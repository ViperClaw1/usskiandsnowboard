// ==============================
// Imports
// ==============================

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Star, ArrowRight, Newspaper, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import heroImage from "@/assets/hero-skiing.jpg";
import newsSectionBg from "@/assets/news-section-bg.jpg";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { JoinLegacySection } from "@/components/home/JoinLegacySection";
import { PageFooter } from "@/components/layout/PageFooter";
import { FeaturedNewsSkeletonCards } from "@/components/home/FeaturedNewsSkeletonCards";

// ==============================
// Query Function
// Extracted outside the component — stable reference, not recreated per render.
// ==============================
const fetchFeaturedNews = async () => {
  const { data, error } = await supabase
    .from("news_articles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  return data;
};

// ==============================
// Component Definition
// Authenticated home page. Smart component — fetches user role and news articles.
// Delegates all repeated presentational blocks to shared components.
// ==============================

const Home = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const { user } = useAuth();

  // ==============================
  // Data Fetching — User Role
  // Cached globally — shared with Athletes/Employers pages for the same userId.
  // ==============================
  const { role: userRole } = useUserRole(user?.id);

  // ==============================
  // Data Fetching — Featured News
  // Fetches the 3 most recent news articles; cached for 5 min via QueryClient defaults.
  // ==============================
  const { data: articles, isLoading } = useQuery({
    queryKey: ["featured-news"],
    queryFn:  fetchFeaturedNews,
  });

  // ==============================
  // Derived Values — Memoized Style Objects
  // Prevents new object references from being created on every render tick,
  // which would cause child elements to re-paint unnecessarily.
  // ==============================
  const heroStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${heroImage})`,
      backgroundSize: "cover" as const,
      backgroundPosition: "center" as const,
    }),
    [] // heroImage is a static import — safe to memoize with empty deps
  );

  const newsSectionStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url(${newsSectionBg})`,
      backgroundSize: "cover" as const,
      backgroundPosition: "center" as const,
    }),
    [] // newsSectionBg is a static import — safe to memoize with empty deps
  );

  // ==============================
  // Render
  // ==============================

  return (
    <div className="min-h-screen bg-background">
      <main>
        {/* Hero Section — personalized headline based on user role */}
        <section
          className="relative min-h-[500px] sm:min-h-[600px] flex items-center justify-center"
          style={heroStyle}
        >
          <div className="relative z-10 container mx-auto px-4 text-center py-12 sm:py-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 animate-fade-in">
              Launch Your Next Chapter
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
              Connecting U.S. Ski and Snowboard athletes with careers that honor their dedication,
              drive, and extraordinary talent.
            </p>
            <Link to="/dashboard">
              <Button size="lg" className="w-full sm:w-auto">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Shared "How It Works" 3-card grid */}
        <HowItWorksSection />

        {/* Discover Talent & Opportunities */}
        <section className="py-12 sm:py-16 lg:py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12 text-foreground">
              Discover Talent &amp; Opportunities
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
                <Star className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-3 text-foreground">Browse Experts</h3>
                <p className="text-muted-foreground mb-6">
                  Connect with experienced professionals and mentors offering career guidance.
                </p>
                <Link to="/experts">
                  <Button variant="secondary" className="w-full">
                    View Experts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Featured News Section */}
        <section
          className="py-12 sm:py-16 lg:py-20 relative"
          style={newsSectionStyle}
        >
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

            {isLoading ? (
              <FeaturedNewsSkeletonCards count={3} />
            ) : articles && articles.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <Card key={article.id} className="shadow-elegant hover:shadow-lg transition-shadow bg-white/95 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors flex items-start gap-2 text-foreground"
                        >
                          <span className="flex-1">{article.title}</span>
                          <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                        </a>
                      </CardTitle>
                      {article.date && (
                        <p className="text-sm text-muted-foreground">{article.date}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-elegant bg-white/95 backdrop-blur">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No news articles available at the moment.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* Shared "Join Our Legacy" CTA */}
        <JoinLegacySection />
      </main>

      {/* Shared page footer */}
      <PageFooter />
    </div>
  );
};

export default Home;
