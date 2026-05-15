import type { AnalyticsConfig } from "@pb/contracts";

export interface ConditionContext {
  viewportWidth: number;
  scrollProgress: number;
}

export function getViewportWidth(): number {
  if (typeof window === "undefined") return 0;
  return window.innerWidth;
}

export function getScrollProgress(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (docHeight <= 0) return 0;
  return Math.min(window.scrollY / docHeight, 1);
}

export function evaluateConditions(
  config: AnalyticsConfig | undefined,
  context?: ConditionContext
): boolean {
  if (!config?.conditions) return true;

  const ctx = context ?? {
    viewportWidth: getViewportWidth(),
    scrollProgress: getScrollProgress(),
  };

  const { minViewportWidth, maxViewportWidth, scrollProgress } = config.conditions;

  if (minViewportWidth !== undefined && ctx.viewportWidth < minViewportWidth) {
    return false;
  }

  if (maxViewportWidth !== undefined && ctx.viewportWidth > maxViewportWidth) {
    return false;
  }

  if (scrollProgress !== undefined && ctx.scrollProgress < scrollProgress) {
    return false;
  }

  return true;
}
