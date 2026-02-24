import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import usLogo from "@/assets/us-logo-new.png";

interface Article {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  body: string;
  category: string | null;
  hero_image_url: string | null;
  author_name: string | null;
  author_image_url: string | null;
  reading_time_minutes: number | null;
  published_at: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Career Development": "bg-secondary/10 text-secondary",
  "Mental Performance": "bg-primary/10 text-primary",
  "Financial Literacy": "bg-emerald-100 text-emerald-700",
  "Life After Sport": "bg-amber-100 text-amber-700",
  "Leadership": "bg-violet-100 text-violet-700",
  "Networking": "bg-sky-100 text-sky-700",
};

const TrainingArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("training_articles")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (data) setArticle(data as Article);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

  const catColor = CATEGORY_COLORS[article.category || ""] || "bg-muted text-muted-foreground";

  return (
    <div className="min-h-screen bg-background">
      {/* Back link */}
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
            <img
              src={article.hero_image_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Article content */}
      <article className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Meta row */}
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
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-3">
          {article.title}
        </h1>

        {/* Subtitle */}
        {article.subtitle && (
          <p className="text-lg text-muted-foreground italic mb-6">{article.subtitle}</p>
        )}

        {/* Author */}
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

        {/* Body */}
        <div
          className="prose prose-lg max-w-none text-foreground
            prose-headings:font-bold prose-headings:text-foreground
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-p:leading-relaxed prose-p:text-foreground/90
            prose-li:text-foreground/90
            prose-strong:text-foreground
            prose-a:text-primary prose-a:underline
            prose-ul:my-4 prose-ol:my-4"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />
      </article>
    </div>
  );
};

export default TrainingArticle;
