// ==============================
// Imports
// ==============================

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import usLogo from "@/assets/us-logo-new.png";
import { TrainingArticle } from "@/types/training";
import { getCategoryColor } from "@/constants/training";

// ==============================
// Constants
// ==============================

const TYPOGRAPHY_KEY = "__typography";

// ==============================
// Query Functions
// Extracted outside the component — stable references, no closure capture needed.
// ==============================

const fetchArticleBySlug = async (slug: string): Promise<TrainingArticle | null> => {
  const { data } = await supabase
    .from("training_articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data ? (data as TrainingArticle) : null;
};

/**
 * Fetches the global typography settings stored in dashboard_layouts
 * (role = 'training'). Returns { font_family, font_size } or null if unset.
 */
const fetchGlobalTypography = async (): Promise<{ font_family: string; font_size: string } | null> => {
  const { data } = await supabase
    .from("dashboard_layouts" as any)
    .select("text_overrides")
    .eq("role", "training")
    .maybeSingle();

  if (!data) return null;
  const overrides = (data as any).text_overrides || {};
  const typo = overrides[TYPOGRAPHY_KEY];
  if (!typo) return null;
  return { font_family: typo.font_family || "", font_size: typo.font_size || "" };
};

// ==============================
// Component Definition
// Smart component — fetches a single article by slug via useQuery.
// Result cached per-slug for 5 min — navigating back to a read article is instant.
// Delegates category color logic to shared getCategoryColor helper.
// Global typography is fetched from dashboard_layouts and applied to the body.
// ==============================

const TrainingArticlePage = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const { slug } = useParams<{ slug: string }>();

  // ==============================
  // Data Fetching
  // useQuery caches the article body per slug — repeat visits render instantly.
  // Global typography refetches on window focus (staleTime: 0) so other tabs see updates.
  // ==============================
  const { data: article, isLoading: loading } = useQuery({
    queryKey: ["training-article", slug],
    queryFn: () => fetchArticleBySlug(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const { data: globalTypography } = useQuery({
    queryKey: ["training-global-typography"],
    queryFn: fetchGlobalTypography,
    staleTime: 0,
  });

  // ==============================
  // Render — Loading State
  // Only shown on first visit; repeat visits hydrate instantly from cache.
  // ==============================
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ==============================
  // Render — Not Found State
  // ==============================
  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-lg">Article not found.</p>
        <Link to="/training" className="text-primary hover:underline font-medium">
          ← Back to Training
        </Link>
      </div>
    );
  }

  // ==============================
  // Derived Values
  // ==============================
  const catColor = getCategoryColor(article.category).bg;

  /** Global typography applied to the article body wrapper */
  const bodyStyle: React.CSSProperties = {
    fontFamily: globalTypography?.font_family || undefined,
    fontSize: globalTypography?.font_size ? `${globalTypography.font_size}px` : undefined,
  };

  // ==============================
  // Render — Article
  // ==============================
  return (
    <div className="min-h-screen bg-background">
      {/* Back navigation */}
      <div className="container mx-auto px-4 pt-6">
        <Link
          to="/training"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Training
        </Link>
      </div>

      {/* Hero image */}
      {article.hero_image_url && (
        <div className="container mx-auto px-4 mt-6">
          <div className="rounded-xl overflow-hidden max-h-[420px]">
            <img src={article.hero_image_url} alt={article.title} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Article content */}
      <article className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Meta row — category badge, reading time, publish date */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
          {article.category && (
            <Badge className={`${catColor} border-0 text-xs font-semibold uppercase tracking-wide`}>
              {article.category}
            </Badge>
          )}
          {article.reading_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.reading_time_minutes} min read
            </span>
          )}
          {article.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(article.published_at), "MMMM d, yyyy")}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-3">{article.title}</h1>

        {/* Subtitle */}
        {article.subtitle && <p className="text-lg text-muted-foreground italic mb-6">{article.subtitle}</p>}

        {/* Author row */}
        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-border">
          <Avatar className="h-10 w-10">
            <AvatarImage src={article.author_image_url || usLogo} alt={article.author_name || "Author"} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {(article.author_name || "US")[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold text-foreground">
            {article.author_name || "U.S. Ski & Snowboard Training & Development"}
          </span>
        </div>

        {/* Article body — rendered as HTML from rich text editor.
            Global typography (font-family + font-size) from dashboard_layouts
            is applied here so all articles share the same configured appearance. */}
        <div
          className="prose prose-lg max-w-none text-foreground
            prose-headings:font-bold prose-headings:text-foreground
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-p:leading-relaxed prose-p:text-foreground/90
            prose-li:text-foreground/90
            prose-strong:text-foreground
            prose-a:text-primary prose-a:underline
            prose-ul:my-4 prose-ol:my-4"
          style={bodyStyle}
          dangerouslySetInnerHTML={{ __html: article.body }}
        />
      </article>
    </div>
  );
};

export default TrainingArticlePage;
