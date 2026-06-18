import { useEffect, useRef, useState } from "react";
import { DIRECTORY_PAGE_SIZE } from "@/constants/directoryPagination";

/**
 * Infinite scroll for client-side paginated lists.
 * Returns the currently visible slice count and a ref to attach to a sentinel
 * element at the end of the list. When the sentinel intersects the viewport,
 * `visibleCount` increases by `pageSize` until reaching `total`.
 *
 * Resets to `pageSize` whenever any value in `resetKeys` changes (e.g. filters).
 */
export function useInfiniteScroll(
  total: number,
  resetKeys: unknown[] = [],
  pageSize: number = DIRECTORY_PAGE_SIZE,
) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when filters/search change
  useEffect(() => {
    setVisibleCount(pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...resetKeys, pageSize]);

  // Clamp when total shrinks
  useEffect(() => {
    setVisibleCount((c) => Math.min(Math.max(c, pageSize), Math.max(total, pageSize)));
  }, [total, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (visibleCount >= total) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + pageSize, total));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, total, pageSize]);

  return { visibleCount, sentinelRef, hasMore: visibleCount < total };
}
