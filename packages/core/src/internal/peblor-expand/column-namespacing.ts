import type { SectionWithElements } from "./section-shapes";

function withPrefix<T>(entries: [string, T][], prefix: string): [string, T][] {
  return entries.map(([id, v]) => [`${prefix}:${id}`, v]);
}

function prefixResponsiveRecord<T>(
  value: Record<string, T> | { mobile?: Record<string, T>; desktop?: Record<string, T> },
  namespacePrefix: string
): Record<string, T> | { mobile?: Record<string, T>; desktop?: Record<string, T> } {
  if ("mobile" in value || "desktop" in value) {
    const r = value as { mobile?: Record<string, T>; desktop?: Record<string, T> };
    return {
      ...(r.mobile
        ? { mobile: Object.fromEntries(withPrefix(Object.entries(r.mobile), namespacePrefix)) }
        : {}),
      ...(r.desktop
        ? { desktop: Object.fromEntries(withPrefix(Object.entries(r.desktop), namespacePrefix)) }
        : {}),
    };
  }
  return Object.fromEntries(
    withPrefix(Object.entries(value as Record<string, T>), namespacePrefix)
  );
}

function prefixResponsiveIdList(
  value: string[] | { mobile?: string[]; desktop?: string[] },
  namespacePrefix: string
): string[] | { mobile?: string[]; desktop?: string[] } {
  if (Array.isArray(value)) return value.map((id) => `${namespacePrefix}:${id}`);
  const r = value as { mobile?: string[]; desktop?: string[] };
  return {
    ...(r.mobile ? { mobile: r.mobile.map((id) => `${namespacePrefix}:${id}`) } : {}),
    ...(r.desktop ? { desktop: r.desktop.map((id) => `${namespacePrefix}:${id}`) } : {}),
  };
}

export function applyColumnNamespace(section: SectionWithElements, namespacePrefix: string): void {
  if (section.type !== "sectionColumn") return;
  const col = section as SectionWithElements & {
    columnAssignments?:
      | Record<string, number>
      | { mobile?: Record<string, number>; desktop?: Record<string, number> };
    elementOrder?: string[] | { mobile?: string[]; desktop?: string[] };
    columnSpan?:
      | Record<string, unknown>
      | { mobile?: Record<string, unknown>; desktop?: Record<string, unknown> };
    itemStyles?:
      | Record<string, unknown>
      | { mobile?: Record<string, unknown>; desktop?: Record<string, unknown> };
    itemLayout?:
      | Record<string, unknown>
      | { mobile?: Record<string, unknown>; desktop?: Record<string, unknown> };
  };

  if (col.columnAssignments) {
    col.columnAssignments = prefixResponsiveRecord(
      col.columnAssignments as
        | Record<string, number>
        | { mobile?: Record<string, number>; desktop?: Record<string, number> },
      namespacePrefix
    );
  }

  if (col.elementOrder) {
    col.elementOrder = prefixResponsiveIdList(col.elementOrder, namespacePrefix);
  }

  if (col.columnSpan) {
    col.columnSpan = prefixResponsiveRecord(
      col.columnSpan as
        | Record<string, unknown>
        | { mobile?: Record<string, unknown>; desktop?: Record<string, unknown> },
      namespacePrefix
    );
  }

  if (col.itemStyles) {
    col.itemStyles = prefixResponsiveRecord(
      col.itemStyles as
        | Record<string, unknown>
        | { mobile?: Record<string, unknown>; desktop?: Record<string, unknown> },
      namespacePrefix
    );
  }

  if (col.itemLayout) {
    col.itemLayout = prefixResponsiveRecord(
      col.itemLayout as
        | Record<string, unknown>
        | { mobile?: Record<string, unknown>; desktop?: Record<string, unknown> },
      namespacePrefix
    );
  }
}
