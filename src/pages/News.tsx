import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, Loader2, ExternalLink } from "lucide-react";
import usLogo from "@/assets/us-logo.png";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MobileNav } from "@/components/MobileNav";

const News = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['news-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="min-h-screen bg-background">
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
        <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Latest News
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Stay updated on success stories, platform updates, and career insights for U.S. Ski & Snowboard athletes.
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : articles && articles.length > 0 ? (
                <>
                  {articles.map((article) => (
                    <Card key={article.id} className="shadow-elegant hover:shadow-hover transition-shadow">
                      <CardHeader>
                        <CardTitle>
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors flex items-center gap-2"
                          >
                            {article.title}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </CardTitle>
                        {article.date && (
                          <p className="text-sm text-muted-foreground mt-2">{article.date}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          {article.excerpt}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <div className="flex justify-center pt-4 sm:pt-8">
                    <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                      <a 
                        href="https://www.usskiandsnowboard.org/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        More News at U.S. Ski & Snowboard
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <Card className="shadow-elegant">
                  <CardContent className="py-12 text-center px-4">
                    <p className="text-muted-foreground mb-4">
                      No news articles available at the moment. Check back soon!
                    </p>
                    <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                      <a 
                        href="https://www.usskiandsnowboard.org/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        Visit U.S. Ski & Snowboard
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}
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

export default News;
