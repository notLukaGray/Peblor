import type { ScrollAxis, SnapAlign } from "./infinite-scroll-types";

export const LOOP_COPY_COUNT = 3;
export const DEFAULT_SNAP_DURATION_MS = 420;
export const DEFAULT_SCROLL_SETTLE_FRAMES = 7;
export const DEFAULT_WHEEL_LOCK_MS = 220;
export const SCROLL_SETTLE_EPSILON_PX = 0.9;
export const SNAP_SETTLE_EPSILON_PX = 2.5;
export const STALL_RECOVERY_IDLE_MS = 260;
export const PROGRAMMATIC_AUTO_SCROLL_SUPPRESS_MS = 40;
export const PROGRAMMATIC_SMOOTH_SCROLL_BUFFER_MS = 80;
export const MAX_SNAP_RETRIES = 2;

// ─── Loop eligibility ────────────────────────────────────────────────────────
/** Minimum actionable items required to enable looping. Below this threshold
 *  the 3-copy layout produces visible duplicates instead of an infinite feel. */
export const MIN_ITEMS_FOR_LOOPING = 5;

export function shouldLoopInfiniteScroll(loop: boolean, actionableItemCount: number): boolean {
  return loop && actionableItemCount >= MIN_ITEMS_FOR_LOOPING;
}

// ─── Velocity / tick constants ────────────────────────────────────────────────
/** px/ms above which scroll is considered "free-flow" — no snap interference. */
export const FREE_FLOW_VELOCITY_PX_MS = 1.0;
/** px/ms below which it is safe to normalise the loop scroll position. */
export const NORMALIZE_SAFE_VELOCITY_PX_MS = 0.5;
/** Rolling window (ms) used to compute scroll velocity. */
export const VELOCITY_SAMPLE_WINDOW_MS = 80;
/** Base interval (ms) for the first ratchet tick step. */
export const TICK_BASE_INTERVAL_MS = 55;
/** Exponential growth factor applied to each successive tick delay. */
export const TICK_DECEL_MULTIPLIER = 1.65;
/** Tick phase stops when velocity drops below this (px/ms). */
export const TICK_PHASE_MIN_PX_MS = 0.12;
/** Maps captured release velocity (px/ms) to a number of ratchet tick steps. */
export const VELOCITY_TO_TICK_COUNT = 4.0;
/** Hard cap on ratchet tick steps per release gesture. */
export const MAX_TICK_COUNT = 14;

export type VelocitySample = { t: number; pos: number };

export function computeVelocityFromSamples(samples: VelocitySample[]): number {
  if (samples.length < 2) return 0;
  const oldest = samples[0];
  const newest = samples.at(-1);
  if (oldest == null || newest == null) return 0;
  const dt = newest.t - oldest.t;
  if (dt <= 0) return 0;
  return Math.abs(newest.pos - oldest.pos) / dt;
}

export function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

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

export function getContainerExtent(container: HTMLDivElement, axis: ScrollAxis): number {
  return axis === "horizontal" ? container.clientWidth : container.clientHeight;
}

export function getItemStart(item: HTMLDivElement, axis: ScrollAxis): number {
  return axis === "horizontal" ? item.offsetLeft : item.offsetTop;
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

export function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

export function getNowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
