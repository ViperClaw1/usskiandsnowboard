import { useState, useEffect } from "react";

const MOBILE_MAX_WIDTH = 477;
const MOBILE_FONT_SIZE_REDUCTION = 2;
const MIN_FONT_SIZE = 10;

/**
 * Returns the effective font size for the current viewport.
 * On mobile (width < 478px), the configured size is reduced by 2px (min 10px).
 */
function getIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
}

export function useEffectiveFontSize(configuredSize: string): string {
  const [effective, setEffective] = useState(() => computeEffective(configuredSize, getIsMobile()));

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const update = () => setEffective(computeEffective(configuredSize, mq.matches));
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [configuredSize]);

  return effective;
}

function computeEffective(configuredSize: string, isMobile: boolean): string {
  if (!configuredSize) return "";
  const num = parseInt(configuredSize, 10);
  if (Number.isNaN(num)) return configuredSize;
  if (!isMobile) return String(num);
  const reduced = Math.max(MIN_FONT_SIZE, num - MOBILE_FONT_SIZE_REDUCTION);
  return String(reduced);
}
