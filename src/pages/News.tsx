import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, Loader2, ExternalLink } from "lucide-react";
import usSkiLogo from "@/assets/us-ski-snowboard-logo.png";
import usSkiMobileLogo from "@/assets/us-ski-mobile-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
            <Link to="/news" className="text-primary font-medium">
              News
            </Link>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="py-12 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Latest News
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stay updated on success stories, platform updates, and career insights for U.S. Ski & Snowboard athletes.
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto space-y-6">
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
                  
                  <div className="flex justify-center pt-8">
                    <Button asChild variant="outline" size="lg">
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
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No news articles available at the moment. Check back soon!
                    </p>
                    <Button asChild variant="outline" size="lg" className="mt-4">
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
          <p>&copy; 2025 U.S. Ski & Snowboard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default News;
