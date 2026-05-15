import { resolveResponsiveValue } from "@pb/runtime-react/core/lib/responsive-value";
import type { ColumnSpanInput } from "@pb/core/layout";

type ColumnSpanValue = number | "all";
type LooseColumnSpanMap = Record<string, ColumnSpanValue | undefined>;
type LooseResponsiveColumnSpan = {
  mobile?: LooseColumnSpanMap;
  desktop?: LooseColumnSpanMap;
};

function compactColumnSpanMap(
  map: LooseColumnSpanMap | undefined
): Record<string, ColumnSpanValue> | undefined {
  if (!map) return undefined;
  const entries = Object.entries(map).filter(
    (entry): entry is [string, ColumnSpanValue] => entry[1] !== undefined
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function normalizeColumnSpanInput(
  value: LooseColumnSpanMap | LooseResponsiveColumnSpan | undefined
): ColumnSpanInput {
  if (!value) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return undefined;
  if ("mobile" in value || "desktop" in value) {
    const responsive = value as LooseResponsiveColumnSpan;
    const mobile = compactColumnSpanMap(responsive.mobile);
    const desktop = compactColumnSpanMap(responsive.desktop);
    if (!mobile && !desktop) return undefined;
    return { ...(mobile ? { mobile } : {}), ...(desktop ? { desktop } : {}) };
  }
  return compactColumnSpanMap(value as LooseColumnSpanMap);
}

export function resolveResponsiveBooleanProp(
  value: boolean | { mobile?: boolean; desktop?: boolean } | undefined,
  isMobile: boolean
): boolean | undefined {
  const resolved = resolveResponsiveValue(value, isMobile);
  return typeof resolved === "boolean" ? resolved : undefined;
}

export function resolveResponsiveStringProp(
  value: string | [string, string] | { mobile?: string; desktop?: string } | undefined,
  isMobile: boolean
): string | undefined {
  const resolved = resolveResponsiveValue(value, isMobile);
  return typeof resolved === "string" ? resolved : undefined;
}
