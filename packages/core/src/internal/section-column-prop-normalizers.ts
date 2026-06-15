import { resolveResponsiveValue } from "../lib/responsive-value";
import { BREAKPOINT_TIER_NAMES } from "@pb/contracts/peblor/core/breakpoint-tiers";
import type { BreakpointTierName } from "@pb/contracts/peblor/core/breakpoint-tiers";
import type { ColumnSpanInput, ColumnSpanValueInput } from "./section-column-layout";

type ColumnSpanValue = number | "all";

function compactColumnSpanMap(
  map: Record<string, unknown> | undefined
): Record<string, ColumnSpanValue> | undefined {
  if (!map) return undefined;
  const entries = Object.entries(map).filter(
    (entry): entry is [string, ColumnSpanValue] =>
      entry[1] !== undefined && (typeof entry[1] === "number" || entry[1] === "all")
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function normalizeColumnSpanInput(value: unknown): ColumnSpanInput {
  if (!value) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return undefined;

  const obj = value as Record<string, unknown>;

  // Tier map shape: { base?, sm?, md?, lg?, xl?, "2xl"? }
  const hasTierKey = BREAKPOINT_TIER_NAMES.some((k) => k in obj);
  if (hasTierKey) {
    const result: { [K in BreakpointTierName]?: Record<string, ColumnSpanValue> } = {};
    let hasAny = false;
    for (const tier of BREAKPOINT_TIER_NAMES) {
      const compacted = compactColumnSpanMap(obj[tier] as Record<string, unknown> | undefined);
      if (compacted) {
        result[tier] = compacted;
        hasAny = true;
      }
    }
    return hasAny ? (result as ColumnSpanInput) : undefined;
  }

  return compactColumnSpanMap(obj) as ColumnSpanValueInput | undefined;
}

export function resolveResponsiveBooleanProp(
  value:
    | boolean
    | { base?: boolean; sm?: boolean; md?: boolean; lg?: boolean; xl?: boolean; "2xl"?: boolean }
    | undefined,
  isMobile: boolean
): boolean | undefined {
  const resolved = resolveResponsiveValue(value, isMobile);
  return typeof resolved === "boolean" ? resolved : undefined;
}

export function resolveResponsiveStringProp(
  value:
    | string
    | { base?: string; sm?: string; md?: string; lg?: string; xl?: string; "2xl"?: string }
    | undefined,
  isMobile: boolean
): string | undefined {
  const resolved = resolveResponsiveValue(value, isMobile);
  return typeof resolved === "string" ? resolved : undefined;
}
