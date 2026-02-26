// ==============================
// Imports
// ==============================

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, Loader2, ExternalLink } from "lucide-react";
import mountainHeaderBg from "@/assets/mountain-header-bg.png";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { PublicNav } from "@/components/layout/PublicNav";
import { PageFooter } from "@/components/layout/PageFooter";

// ==============================
// Component Definition
// News page. Smart component — fetches articles.
// Conditionally renders PublicNav for unauthenticated visitors (authenticated
// users get the nav from AppLayout/AuthenticatedNav).
// ==============================

const News = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const { user } = useAuth();

  // ==============================
  // Data Fetching — News Articles
  // Ordered by date, limited to 20 most recent articles
  // ==============================
  const { data: articles, isLoading } = useQuery({
    queryKey: ["news-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .order("date", { ascending: false, nullsFirst: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // ==============================
  // Render
  // ==============================

  return (
    <div className="min-h-screen bg-background">
      {/* Show public nav only for unauthenticated visitors */}
      {!user && <PublicNav />}

      <main>
        {/* Page hero */}
        <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
              Latest News
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Stay updated on success stories, platform updates, and career insights for U.S. Ski
              &amp; Snowboard athletes.
            </p>
          </div>
        </section>

        {/* Articles grid */}
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : articles && articles.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {articles.map((article) => (
                    <Card
                      key={article.id}
                      className="shadow-elegant hover:shadow-hover transition-shadow flex flex-col overflow-hidden"
                    >
                      <div className="w-full h-48 bg-muted overflow-hidden">
                        <img
                          src={article.image_url || mountainHeaderBg}
                          alt={article.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = mountainHeaderBg;
                          }}
                        />
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors flex items-start gap-2 line-clamp-3"
                          >
                            <span className="flex-1">{article.title}</span>
                            <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                          </a>
                        </CardTitle>
                        {article.date && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {new Date(article.date + "T00:00:00").toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="text-muted-foreground text-sm line-clamp-4">{article.excerpt}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center pt-8 sm:pt-12">
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <a
                      href="https://www.usskiandsnowboard.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      More News at U.S. Ski &amp; Snowboard
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="max-w-4xl mx-auto">
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
                        Visit U.S. Ski &amp; Snowboard
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Shared page footer */}
      <PageFooter />
    </div>
  );
};

export default News;
