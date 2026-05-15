import type {
  NormalizedTriggerConfig,
  SectionViewportTriggerOptions,
  ViewportTriggerState,
} from "./viewport-trigger-types";

export function normalizeTriggerConfig(
  options: SectionViewportTriggerOptions
): NormalizedTriggerConfig {
  return {
    onVisible: options.onVisible,
    onInvisible: options.onInvisible,
    onProgress: options.onProgress,
    onViewportProgress: options.onViewportProgress,
    threshold: options.threshold ?? 0,
    triggerOnce: options.triggerOnce ?? false,
    rootMargin: options.rootMargin,
    delay: options.delay ?? 0,
  };
}

export function getEntryProgress(entry: IntersectionObserverEntry): number {
  return entry.intersectionRatio;
}

export function shouldFire(
  entry: { isIntersecting: boolean },
  config: NormalizedTriggerConfig,
  state: ViewportTriggerState
): { fireVisible: boolean; fireInvisible: boolean } {
  const visible = entry.isIntersecting;

  if (state.lastFiredState !== null && state.lastFiredState === visible) {
    return { fireVisible: false, fireInvisible: false };
  }

  if (visible) {
    const fireVisible = !!config.onVisible && (!config.triggerOnce || !state.hasFiredVisibleOnce);
    return { fireVisible, fireInvisible: false };
  }

  const fireInvisible =
    !!config.onInvisible && (!config.triggerOnce || !state.hasFiredInvisibleOnce);
  return { fireVisible: false, fireInvisible };
}

export function getViewportObserverThresholds(
  hasViewportProgress: boolean,
  threshold: number
): number | number[] {
  // 21 thresholds (every 5%) is sufficient — entry.intersectionRatio gives the exact value
  // regardless of threshold granularity, so 101 steps add observer overhead for no gain.
  return hasViewportProgress ? Array.from({ length: 21 }, (_, i) => i / 20) : threshold;
}
