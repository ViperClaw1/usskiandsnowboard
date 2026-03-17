// ==============================
// Imports
// ==============================

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { format } from "date-fns";
import { TrainingArticle } from "@/types/training";
import { TRAINING_CATEGORIES, getCategoryColor } from "@/constants/training";
import { useTrainingTypography } from "@/hooks/useTrainingTypography";

// ==============================
// Utility Functions
// ==============================

/** Strips HTML tags and truncates to 160 chars for article card excerpts */
const getExcerpt = (body: string): string => {
  const text = body.replace(/<[^>]*>/g, "");
  return text.length > 160 ? text.slice(0, 160) + "…" : text;
};

// ==============================
// Query Functions
// Extracted outside the component so the reference is stable across renders.
// ==============================
const fetchPublishedArticles = async (): Promise<TrainingArticle[]> => {
  const { data, error } = await supabase
    .from("training_articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TrainingArticle[];
};

// ==============================
// Component Definition
// Smart component — fetches published training articles via useQuery (cached)
// and handles category filtering. Memoizes derived filtered list.
// Typography is applied globally via the shared useTrainingTypography hook
// (staleTime: 60 s — background revalidation on navigation).
// ==============================

const Training = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const [activeCategory, setActiveCategory] = useState("All Topics");

  // ==============================
  // Data Fetching
  // useQuery caches the article list for 5 min — repeat visits render instantly
  // while a background revalidation runs silently.
  // Typography uses the shared hook (60 s staleTime; setQueryData in admin
  // propagates changes instantly without a network round-trip).
  // ==============================
  const { data: articles = [], isLoading: loading } = useQuery({
    queryKey: ["training-articles"],
    queryFn: fetchPublishedArticles,
    staleTime: 5 * 60 * 1000,
  });

  const { typographyStyle } = useTrainingTypography();

  // ==============================
  // Derived Values
  // Memoized so category-switching does not re-filter the full list unnecessarily.
  // ==============================
  const filtered = useMemo(
    () => (activeCategory === "All Topics" ? articles : articles.filter((a) => a.category === activeCategory)),
    [articles, activeCategory],
  );

  // ==============================
  // Render
  // ==============================

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Resources to Help You Thrive Beyond the Mountain
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Practical guides, expert insights, and career resources — published by U.S. Ski &amp; Snowboard's Training
            &amp; Development team.
          </p>
        </div>
      </section>

      {/* Category Filter Bar */}
      <div className="container mx-auto px-4 pt-8 pb-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {TRAINING_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          // Skeleton placeholders while fetching on first visit
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No articles published yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {filtered.map((article) => {
              const colors = getCategoryColor(article.category);
              return (
                <Link
                  key={article.id}
                  to={`/training/${article.slug}`}
                  className="group flex flex-col rounded-xl overflow-hidden border border-border bg-card shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-hover)] transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Article hero image */}
                  <div className="relative h-52 bg-primary/10 overflow-hidden shrink-0">
                    {article.hero_image_url ? (
                      <img
                        src={article.hero_image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
                        <span className="text-primary/40 text-6xl font-extrabold">T</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {article.category && (
                      <Badge className={`absolute top-4 left-4 ${colors.bg} border-0 text-xs font-semibold`}>
                        {article.category}
                      </Badge>
                    )}
                  </div>

                  {/* Article metadata + title */}
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{getExcerpt(article.body)}</p>
                    <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        <span>{article.author_name || "U.S. Ski & Snowboard"}</span>
                        {article.published_at && (
                          <>
                            <span className="mx-1">·</span>
                            <span>{format(new Date(article.published_at), "MMM d, yyyy")}</span>
                          </>
                        )}
                      </div>
                      {article.reading_time_minutes && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{article.reading_time_minutes} min read</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Training;
