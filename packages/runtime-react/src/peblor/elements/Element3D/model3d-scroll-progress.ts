"use client";

export type SectionScrollProgressMetrics = {
  sectionTop: number;
  sectionHeight: number;
  viewportHeight: number;
};

export function measureSectionScrollProgressMetrics(
  sectionEl: HTMLElement,
  container: HTMLElement | null
): SectionScrollProgressMetrics {
  const sectionRect = sectionEl.getBoundingClientRect();

  if (container) {
    const containerRect = container.getBoundingClientRect();
    return {
      sectionTop: sectionRect.top - containerRect.top + container.scrollTop,
      sectionHeight: sectionRect.height,
      viewportHeight: container.clientHeight,
    };
  }

  return {
    sectionTop: sectionRect.top + window.scrollY,
    sectionHeight: sectionRect.height,
    viewportHeight: window.innerHeight || 1,
  };
}

export function computeSectionScrollProgress(
  metrics: SectionScrollProgressMetrics,
  scrollTop: number
): number {
  const total = metrics.sectionHeight + metrics.viewportHeight;
  if (total <= 0) return 0;

  const sectionTopInViewport = metrics.sectionTop - scrollTop;
  return Math.max(0, Math.min(1, (metrics.viewportHeight - sectionTopInViewport) / total));
}
