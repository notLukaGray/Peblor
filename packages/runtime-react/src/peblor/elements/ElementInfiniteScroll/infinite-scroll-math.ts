import type { ScrollAxis, SnapAlign } from "./infinite-scroll-types";
import { MOTION_DEFAULTS } from "@pb/contracts/peblor/core/peblor-motion-defaults";

export const LOOP_COPY_COUNT = 3;
export const DEFAULT_SNAP_DURATION_MS = MOTION_DEFAULTS.snapDurationMs;

// ─── Settle / programmatic-scroll tuning ──────────────────────────────────────
/** Idle gap (ms) after the last scroll event before we treat motion as settled.
 *  Acts as a universal fallback for browsers without the `scrollend` event and as
 *  a backstop where `scrollend` is flaky. Native snap usually rests well within this. */
export const SETTLE_IDLE_MS = 120;
/** After an instant (non-smooth) programmatic position set, swallow the scroll
 *  events it generates for this long so they aren't mistaken for user motion. */
export const PROGRAMMATIC_INSTANT_SUPPRESS_MS = 64;
/** If the native snap leaves us more than this many px off the committed item's
 *  exact snap offset, nudge it into place on settle. */
export const SNAP_CORRECTION_EPSILON_PX = 1.5;

// ─── Loop eligibility ────────────────────────────────────────────────────────
/** Minimum actionable items required to enable looping. Below this threshold
 *  the copy layout produces visible duplicates instead of an infinite feel. */
export const MIN_ITEMS_FOR_LOOPING = 5;

export function shouldLoopInfiniteScroll(loop: boolean, actionableItemCount: number): boolean {
  return loop && actionableItemCount >= MIN_ITEMS_FOR_LOOPING;
}

// ─── Index helpers ─────────────────────────────────────────────────────────────
export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

// ─── Geometry ───────────────────────────────────────────────────────────────────
export function getScrollPosition(container: HTMLDivElement, axis: ScrollAxis): number {
  return axis === "horizontal" ? container.scrollLeft : container.scrollTop;
}

export function setScrollPosition(
  container: HTMLDivElement,
  axis: ScrollAxis,
  value: number
): void {
  if (axis === "horizontal") {
    container.scrollLeft = value;
    return;
  }
  container.scrollTop = value;
}

export function getMaxScrollPosition(container: HTMLDivElement, axis: ScrollAxis): number {
  return axis === "horizontal"
    ? container.scrollWidth - container.clientWidth
    : container.scrollHeight - container.clientHeight;
}

export function getContainerExtent(container: HTMLDivElement, axis: ScrollAxis): number {
  return axis === "horizontal" ? container.clientWidth : container.clientHeight;
}

/**
 * Position of the item's origin along the scroll axis, in the container's scroll coordinate
 * system (same space as `scrollTop` / `scrollLeft`). `offsetTop`/`offsetLeft` alone are wrong
 * when the item is nested (e.g. list rows inside a track) because they are relative to
 * `offsetParent`, not the scrolling element.
 */
export function getItemContentOffset(
  container: HTMLDivElement,
  item: HTMLDivElement,
  axis: ScrollAxis
): number {
  if (axis === "horizontal") {
    return (
      item.getBoundingClientRect().left -
      container.getBoundingClientRect().left +
      container.scrollLeft
    );
  }
  return (
    item.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  );
}

export function getItemSize(item: HTMLDivElement, axis: ScrollAxis): number {
  return axis === "horizontal" ? item.offsetWidth : item.offsetHeight;
}

/**
 * The scroll position at which `item` is aligned per `snapAlign`. This mirrors what
 * CSS scroll-snap lands on natively; we use it for nearest-item detection and for
 * programmatic / loop-recenter scrolling.
 */
export function getItemScrollOffset(
  container: HTMLDivElement,
  item: HTMLDivElement,
  axis: ScrollAxis,
  snapAlign: SnapAlign
): number {
  const itemStart = getItemContentOffset(container, item, axis);
  const itemSize = getItemSize(item, axis);
  const containerExtent = getContainerExtent(container, axis);
  if (snapAlign === "start") return itemStart;
  if (snapAlign === "end") return itemStart + itemSize - containerExtent;
  return itemStart + itemSize / 2 - containerExtent / 2;
}

export function getNowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
