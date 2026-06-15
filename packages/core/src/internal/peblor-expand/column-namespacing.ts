import type { SectionWithElements } from "./section-shapes";
import { BREAKPOINT_TIER_NAMES } from "@pb/contracts/peblor/core/breakpoint-tiers";

function withPrefix<T>(entries: [string, T][], prefix: string): [string, T][] {
  return entries.map(([id, v]) => [`${prefix}:${id}`, v]);
}

function prefixTierMapRecord<T>(
  value: Record<string, T> | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: Record<string, T> },
  namespacePrefix: string
): Record<string, T> | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: Record<string, T> } {
  const hasTierKey = BREAKPOINT_TIER_NAMES.some((k) => k in (value as Record<string, unknown>));
  if (hasTierKey) {
    const result: Record<string, Record<string, T>> = {};
    for (const tier of BREAKPOINT_TIER_NAMES) {
      const tierValue = (value as Record<string, Record<string, T> | undefined>)[tier];
      if (tierValue) {
        result[tier] = Object.fromEntries(withPrefix(Object.entries(tierValue), namespacePrefix));
      }
    }
    return result;
  }
  return Object.fromEntries(
    withPrefix(Object.entries(value as Record<string, T>), namespacePrefix)
  );
}

function prefixTierMapIdList(
  value: string[] | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: string[] },
  namespacePrefix: string
): string[] | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: string[] } {
  if (Array.isArray(value)) return value.map((id) => `${namespacePrefix}:${id}`);
  const result: Record<string, string[]> = {};
  for (const tier of BREAKPOINT_TIER_NAMES) {
    const tierValue = (value as Record<string, string[] | undefined>)[tier];
    if (tierValue) {
      result[tier] = tierValue.map((id) => `${namespacePrefix}:${id}`);
    }
  }
  return result;
}

export function applyColumnNamespace(section: SectionWithElements, namespacePrefix: string): void {
  if (section.type !== "sectionColumn") return;
  const col = section as SectionWithElements & {
    columnAssignments?:
      | Record<string, number>
      | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: Record<string, number> };
    elementOrder?: string[] | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: string[] };
    columnSpan?:
      | Record<string, unknown>
      | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: Record<string, unknown> };
    itemStyles?:
      | Record<string, unknown>
      | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: Record<string, unknown> };
    itemLayout?:
      | Record<string, unknown>
      | { [K in (typeof BREAKPOINT_TIER_NAMES)[number]]?: Record<string, unknown> };
  };

  // Prefix tier-map fields: elementOrder uses prefixTierMapIdList, the rest use prefixTierMapRecord.
  if (col.elementOrder) {
    col.elementOrder = prefixTierMapIdList(col.elementOrder, namespacePrefix);
  }

  const TIER_MAP_RECORD_FIELDS = [
    "columnAssignments",
    "columnSpan",
    "itemStyles",
    "itemLayout",
  ] as const;
  const colRecord = col as Record<string, unknown>;
  for (const field of TIER_MAP_RECORD_FIELDS) {
    if (colRecord[field]) {
      colRecord[field] = prefixTierMapRecord(
        colRecord[field] as Record<string, unknown>,
        namespacePrefix
      );
    }
  }
}
