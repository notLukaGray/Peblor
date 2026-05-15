import type { AnalyticsConfig } from "@pb/contracts";

export function evaluateConditions(
  conditions: NonNullable<AnalyticsConfig>["conditions"],
  viewportWidth?: number,
  scrollProgress?: number
): boolean {
  if (!conditions) return true;

  const vw = viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 0);
  const sp = scrollProgress ?? getDocumentScrollProgress();

  if (conditions.minViewportWidth !== undefined && vw < conditions.minViewportWidth) {
    return false;
  }
  if (conditions.maxViewportWidth !== undefined && vw > conditions.maxViewportWidth) {
    return false;
  }
  if (conditions.scrollProgress !== undefined && sp < conditions.scrollProgress) {
    return false;
  }
  return true;
}

function getDocumentScrollProgress(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (docHeight <= 0) return 0;
  return Math.min(window.scrollY / docHeight, 1);
}

export function getViewportWidth(): number {
  return typeof window !== "undefined" ? window.innerWidth : 0;
}
