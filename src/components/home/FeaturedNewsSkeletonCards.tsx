import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface FeaturedNewsSkeletonCardsProps {
  count?: number;
}

const ShimmerLine = ({ className }: { className: string }) => (
  <div className={`shimmer-surface rounded ${className}`} aria-hidden="true" />
);

const FeaturedNewsSkeletonCard = () => (
  <Card className="shadow-elegant bg-white/95 backdrop-blur border-white/30 overflow-hidden">
    <CardHeader className="space-y-3">
      <div className="flex items-start gap-2">
        <ShimmerLine className="h-5 flex-1" />
        <ShimmerLine className="h-4 w-4 mt-0.5" />
      </div>
      <ShimmerLine className="h-4 w-28" />
    </CardHeader>
    <CardContent className="space-y-2">
      <ShimmerLine className="h-4 w-full" />
      <ShimmerLine className="h-4 w-[92%]" />
      <ShimmerLine className="h-4 w-[76%]" />
    </CardContent>
  </Card>
);

export const FeaturedNewsSkeletonCards = ({ count = 3 }: FeaturedNewsSkeletonCardsProps) => {
  return (
    <div className="grid md:grid-cols-3 gap-6" aria-label="Loading featured news">
      {Array.from({ length: count }).map((_, index) => (
        <FeaturedNewsSkeletonCard key={`news-skeleton-${index}`} />
      ))}
    </div>
  );
};

