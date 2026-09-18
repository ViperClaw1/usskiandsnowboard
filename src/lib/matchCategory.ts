export type MatchCategory = "high" | "potential" | "low";

/**
 * Categorizes a semantic similarity score (0-1) into a friendly match tier.
 * Thresholds based on live score distribution (top matches cluster 0.76-0.82,
 * long tail down to ~0.58).
 */
export function getMatchCategory(similarity: number): MatchCategory {
  if (similarity >= 0.75) return "high";
  if (similarity >= 0.65) return "potential";
  return "low";
}

export const MATCH_CATEGORY_LABEL: Record<MatchCategory, string> = {
  high: "High probability match",
  potential: "Potential match",
  low: "Low probability match",
};

export const MATCH_CATEGORY_CLASS: Record<MatchCategory, string> = {
  high: "border-primary/40 text-primary",
  potential: "border-muted-foreground/30 text-muted-foreground",
  low: "border-border text-muted-foreground/60",
};
