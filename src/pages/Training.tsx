import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { format } from "date-fns";

const TRAINING_CATEGORIES = [
  "All Topics",
  "Career Development",
  "Mental Performance",
  "Financial Literacy",
  "Life After Sport",
  "Leadership",
  "Networking",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "Career Development": { bg: "bg-secondary/10 text-secondary", text: "text-secondary" },
  "Mental Performance": { bg: "bg-primary/10 text-primary", text: "text-primary" },
  "Financial Literacy": { bg: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
  "Life After Sport": { bg: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  "Leadership": { bg: "bg-violet-100 text-violet-700", text: "text-violet-700" },
  "Networking": { bg: "bg-sky-100 text-sky-700", text: "text-sky-700" },
};

interface TrainingArticle {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  body: string;
  category: string | null;
  hero_image_url: string | null;
  author_name: string | null;
  author_image_url: string | null;
  status: string;
  reading_time_minutes: number | null;
  published_at: string | null;
  created_at: string;
}

const Training = () => {
  const [articles, setArticles] = useState<TrainingArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All Topics");

  useEffect(() => {
    const fetchArticles = async () => {
      const { data, error } = await supabase
        .from("training_articles")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (!error && data) setArticles(data as TrainingArticle[]);
      setLoading(false);
    };
    fetchArticles();
  }, []);

  const filtered = activeCategory === "All Topics"
    ? articles
    : articles.filter((a) => a.category === activeCategory);

  const getExcerpt = (body: string) => {
    const text = body.replace(/<[^>]*>/g, "");
    return text.length > 160 ? text.slice(0, 160) + "…" : text;
  };

  const getCategoryColor = (cat: string | null) =>
    CATEGORY_COLORS[cat || ""] || { bg: "bg-muted text-muted-foreground", text: "text-muted-foreground" };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-glow opacity-90" />
        <div className="relative container mx-auto px-4 py-16 md:py-24 text-center">
          <Badge className="mb-6 bg-secondary/20 text-secondary-foreground border-secondary/30 hover:bg-secondary/30 text-xs tracking-widest uppercase font-semibold px-4 py-1.5">
            Training &amp; Development
          </Badge>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
            Resources to Help You Thrive Beyond the Mountain
          </h1>
          <p className="mt-4 text-primary-foreground/80 text-lg max-w-2xl mx-auto">
            Practical guides, expert insights, and career resources — published by U.S. Ski &amp; Snowboard's Training &amp; Development team.
          </p>
        </div>
        {/* Curved bottom */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 60" preserveAspectRatio="none">
          <path d="M0,60 L0,20 Q720,0 1440,20 L1440,60 Z" fill="hsl(var(--background))" />
        </svg>
      </section>

      {/* Category Filter */}
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
                  className="group block rounded-xl overflow-hidden border border-border bg-card shadow-[var(--shadow-elegant)] hover:shadow-[var(--shadow-hover)] transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="relative h-52 bg-primary/10 overflow-hidden">
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

                  {/* Content */}
                  <div className="p-5 flex flex-col gap-3">
                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {getExcerpt(article.body)}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-2 text-xs text-muted-foreground">
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
