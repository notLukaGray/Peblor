import type { CSSProperties } from "react";
import { DEFAULT_SCROLL_SPEED } from "../section-constants";

export type SectionAlign = "left" | "center" | "right" | "full";

export function getSectionAlignStyle(align?: SectionAlign, width?: string): CSSProperties {
  if (align === "center") {
    return { marginLeft: "auto", marginRight: "auto" };
  }
  if (align === "right") {
    return { marginLeft: "auto", marginRight: 0 };
  }
  if (align === "full") {
    return width !== "hug"
      ? { width: "100%", marginLeft: 0, marginRight: 0 }
      : { marginLeft: 0, marginRight: 0 };
  }
  return {};
}

export function getDefaultScrollSpeed(): number {
  return DEFAULT_SCROLL_SPEED;
}

// Re-export for backwards compatibility from barrel consumers.
export { DEFAULT_SCROLL_SPEED };

/** Set on `ElementInfiniteScroll` root — section wheel handling must not steal these gestures. */
const PB_INFINITE_SCROLL_HOST = "data-pb-infinite-scroll-host";

const OVERFLOW_SCROLLISH = new Set(["auto", "scroll", "overlay"]);

function nestedElementCanAbsorbVerticalWheel(node: HTMLElement, deltaY: number): boolean {
  if (deltaY === 0) return false;
  const style = window.getComputedStyle(node);
  if (!OVERFLOW_SCROLLISH.has(style.overflowY)) return false;
  if (node.scrollHeight <= node.clientHeight + 1) return false;

  const goingDown = deltaY > 0;
  const epsilon = 1;
  const atTop = node.scrollTop <= epsilon;
  const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - epsilon;
  return (goingDown && !atBottom) || (!goingDown && !atTop);
}

function nestedElementCanAbsorbHorizontalWheel(node: HTMLElement, deltaX: number): boolean {
  if (deltaX === 0) return false;
  const style = window.getComputedStyle(node);
  if (!OVERFLOW_SCROLLISH.has(style.overflowX)) return false;
  if (node.scrollWidth <= node.clientWidth + 1) return false;

  const goingRight = deltaX > 0;
  const epsilon = 1;
  const atLeft = node.scrollLeft <= epsilon;
  const atRight = node.scrollLeft + node.clientWidth >= node.scrollWidth - epsilon;
  return (goingRight && !atRight) || (!goingRight && !atLeft);
}

/**
 * True when the wheel should stay with a nested scroller (heuristic — edges, overflow).
 */
function wheelTargetInsideActiveNestedScroller(
  section: HTMLElement,
  target: EventTarget | null,
  deltaY: number,
  deltaX: number
): boolean {
  if (!(target instanceof Element)) return false;
  let node: Element | null = target;
  while (node && node !== section) {
    if (node instanceof HTMLElement) {
      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        if (nestedElementCanAbsorbVerticalWheel(node, deltaY)) return true;
      } else if (nestedElementCanAbsorbHorizontalWheel(node, deltaX)) return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function handleSectionWheel(
  e: React.WheelEvent<HTMLElement>,
  scrollSpeed: number = DEFAULT_SCROLL_SPEED
): void {
  const el = e.currentTarget;
  const target = e.target;

  // Page-builder infinite carousel: never stopPropagation — layout can make inner
  // `scrollHeight` heuristics fail; `data-pb-infinite-scroll-host` is authoritative.
  if (target instanceof Element) {
    const infiniteHost = target.closest(`[${PB_INFINITE_SCROLL_HOST}]`);
    if (infiniteHost && el.contains(infiniteHost)) {
      return;
    }
  }

  if (el.scrollHeight <= el.clientHeight) return;

  if (wheelTargetInsideActiveNestedScroller(el, target, e.deltaY, e.deltaX)) {
    return;
  }

  if (scrollSpeed === DEFAULT_SCROLL_SPEED) {
    e.stopPropagation();
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  const delta = e.deltaY * scrollSpeed;
  el.scrollTop += delta;
}
