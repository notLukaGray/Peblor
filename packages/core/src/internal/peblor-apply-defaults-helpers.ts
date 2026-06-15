import type { ElementBlock } from "@pb/contracts";

import {
  type PbBodyVariantKey,
  type PbButtonVariantKey,
  type PbHeadingVariantKey,
  type PbImageVariantKey,
  type PbInputVariantKey,
  type PbLinkVariantKey,
  type PbRangeVariantKey,
  type PbSpacerVariantKey,
  type PbVideoVariantKey,
  type PbWorkbenchElementDefaults,
  type PbWorkbenchElementDefaultSet,
} from "./defaults/pb-builder-defaults";
import { getPbBuilderDefaults } from "./adapters/host-config";

// ---------------------------------------------------------------------------
// Type-narrowing guards
// ---------------------------------------------------------------------------

/**
 * Guards an unknown value as a non-null object. Used for recursive deep-walk of nested
 * section.definitions and moduleConfig.slots — inherently dynamic structures that can't be
 * statically typed. Element-specific defaults functions use discriminated narrowing instead.
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isResponsiveStringValue(value: unknown): boolean {
  if (isNonEmptyString(value)) return true;
  if (!Array.isArray(value) || value.length !== 2) return false;
  return value.some((entry) => isNonEmptyString(entry));
}

export function isMissingResponsiveString(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (!Array.isArray(value) || value.length !== 2) return true;
  return value.every((entry) => typeof entry === "string" && entry.trim().length === 0);
}

export function isConstraintObject(
  value: unknown
): value is { minWidth?: string; maxWidth?: string; minHeight?: string; maxHeight?: string } {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isMotionExitTrigger(value: unknown): value is "manual" | "leaveViewport" {
  return value === "manual" || value === "leaveViewport";
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// ---------------------------------------------------------------------------
// Generic variant resolution
// ---------------------------------------------------------------------------

export function resolveVariantKey<K extends string>(
  value: unknown,
  variants: Record<K, unknown>,
  fallback: K
): K {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  if (raw in variants) return raw as K;
  return fallback;
}

// Variant alias maps moved to contracts (packages/contracts/src/peblor/core/peblor-schemas/)
// where each variant enum applies z.preprocess to normalize non-canonical values at parse time.

/**
 * Generic element variant key resolver.
 * Replaces nine copy-paste functions that differed only in the defaults.elements.<key> path.
 *
 * @param elementKey — key into defaults.elements (e.g. "heading", "image", "button")
 * @param value — the raw variant value from the element JSON
 * @returns the resolved variant key, falling back to the element's defaultVariant
 */
export function resolveElementVariantKey<K extends string>(elementKey: string, value: unknown): K {
  const defaults = getPbBuilderDefaults();
  const elementDefaults = (
    defaults.elements as unknown as Record<
      string,
      { variants: Record<string, unknown>; defaultVariant: string } | undefined
    >
  )[elementKey];
  if (!elementDefaults) return (typeof value === "string" ? value : "") as K;
  return resolveVariantKey(
    value,
    elementDefaults.variants as Record<K, unknown>,
    elementDefaults.defaultVariant as K
  );
}

// Backward-compatible re-exports so existing imports don't break.
// New code should use resolveElementVariantKey("heading", value) etc.
export function resolveImageVariantKey(value: unknown): PbImageVariantKey {
  return resolveElementVariantKey("image", value);
}
export function resolveHeadingVariantKey(value: unknown): PbHeadingVariantKey {
  return resolveElementVariantKey("heading", value);
}
export function resolveBodyVariantKey(value: unknown): PbBodyVariantKey {
  return resolveElementVariantKey("body", value);
}
export function resolveLinkVariantKey(value: unknown): PbLinkVariantKey {
  return resolveElementVariantKey("link", value);
}
export function resolveButtonVariantKey(value: unknown): PbButtonVariantKey {
  return resolveElementVariantKey("button", value);
}
export function resolveVideoVariantKey(value: unknown): PbVideoVariantKey {
  return resolveElementVariantKey("video", value);
}
export function resolveInputVariantKey(value: unknown): PbInputVariantKey {
  return resolveElementVariantKey("input", value);
}
export function resolveRangeVariantKey(value: unknown): PbRangeVariantKey {
  return resolveElementVariantKey("range", value);
}
export function resolveSpacerVariantKey(value: unknown): PbSpacerVariantKey {
  return resolveElementVariantKey("spacer", value);
}

// ---------------------------------------------------------------------------
// Generic defaults-application utilities
// ---------------------------------------------------------------------------

export function mergeMissingFromTemplate(
  el: Record<string, unknown>,
  template: Record<string, unknown>
): boolean {
  if (!template) return false;
  let changed = false;
  for (const [key, val] of Object.entries(template)) {
    if (val === undefined) continue;
    if (el[key] === undefined) {
      el[key] = val;
      changed = true;
    }
  }
  return changed;
}

export function omitWorkbenchOnlyDefaults(
  template: Record<string, unknown>
): Record<string, unknown> {
  const { animation: _animation, ...rest } = template;
  return rest;
}

export function resolveWorkbenchVariantKey(
  value: unknown,
  defaults: PbWorkbenchElementDefaultSet
): string {
  return resolveVariantKey(value, defaults.variants, defaults.defaultVariant) as string;
}

export function applyWorkbenchElementDefaults<K extends keyof PbWorkbenchElementDefaults>(
  el: ElementBlock,
  type: ElementBlock["type"],
  key: K
): ElementBlock {
  if (el.type !== type) return el;
  const defaults = getPbBuilderDefaults().workbenchElements?.[key];
  if (!defaults) return el;
  const rec = { ...el } as Record<string, unknown>;
  const variantKey = resolveWorkbenchVariantKey(rec.variant, defaults);
  const template = defaults.variants[variantKey];
  if (!template) return el;
  return mergeMissingFromTemplate(rec, omitWorkbenchOnlyDefaults(template))
    ? (rec as ElementBlock)
    : el;
}
