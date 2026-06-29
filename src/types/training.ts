// ==============================
// Training Article Types
// Shared interfaces for training article data used across
// Training.tsx, TrainingArticle.tsx, and TrainingArticleManager.tsx
// ==============================

/** Full training article record as stored in the database */
export interface TrainingArticle {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  body: string;
  category: string | null;
  hero_image_url: string | null;
  author_name: string | null;
  author_title: string | null;
  author_affiliation: string | null;
  author_image_url: string | null;
  status: string;
  reading_time_minutes: number | null;
  published_at: string | null;
  created_at: string;
  created_by: string;
  font_family: string | null;
  font_size: string | null;
}
