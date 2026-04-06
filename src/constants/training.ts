// ==============================
// Training Constants
// Shared constants for training categories and category color mappings
// used across Training.tsx, TrainingArticle.tsx, and TrainingArticleManager.tsx
// ==============================

/** All available article category labels, including "All Topics" filter sentinel */
export const TRAINING_CATEGORIES = [
  "All Topics",
  "Career Development",
  "Mental Performance",
  "Financial Literacy",
  "Life After Sport",
  "Leadership",
  "Networking",
] as const;

/** Category labels without the "All Topics" sentinel — used for selects/dropdowns */
export const ARTICLE_CATEGORIES = TRAINING_CATEGORIES.slice(1) as unknown as string[];

/** Maps each category name to its Tailwind bg+text color classes for badges */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "Career Development": { bg: "bg-secondary/10 text-secondary", text: "text-secondary" },
  "Mental Performance": { bg: "bg-primary/10 text-primary", text: "text-primary" },
  "Financial Literacy": { bg: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
  "Life After Sport": { bg: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  "Leadership": { bg: "bg-violet-100 text-violet-700", text: "text-violet-700" },
  "Networking": { bg: "bg-sky-100 text-sky-700", text: "text-sky-700" },
};

/** Returns color classes for a given category, with a safe fallback */
export const getCategoryColor = (cat: string | null): { bg: string; text: string } =>
  CATEGORY_COLORS[cat || ""] || { bg: "bg-muted text-muted-foreground", text: "text-muted-foreground" };
