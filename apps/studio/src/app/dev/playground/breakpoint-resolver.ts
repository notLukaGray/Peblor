import type { SectionBlock } from "@pb/contracts";

// ---------------------------------------------------------------------------
// Client-side breakpoint resolver
// Mirrors the logic in peblor-resolve-breakpoint-server.ts but driven
// by a boolean instead of a User-Agent / server request.
// ---------------------------------------------------------------------------

function resolveForBreakpoint<T>(value: unknown, isMobile: boolean): T | undefined {
  if (value === undefined) return undefined;
  // Legacy tuple format: [mobile, desktop]
  if (Array.isArray(value) && value.length === 2) {
    return (isMobile ? value[0] : value[1]) as T;
  }
  // Legacy {mobile, desktop} objects (pre-migration persisted data)
  if (
    value !== null &&
    typeof value === "object" &&
    ("mobile" in (value as object) || "desktop" in (value as object))
  ) {
    const r = value as { mobile?: T; desktop?: T };
    return (isMobile ? (r.mobile ?? r.desktop) : (r.desktop ?? r.mobile)) as T;
  }
  // Tier map: { base?, sm?, md?, lg?, xl?, "2xl"? }
  if (value !== null && typeof value === "object" && !("@container" in (value as object))) {
    const r = value as Record<string, unknown>;
    if (isMobile) {
      // Mobile: cascade base → sm → md
      return ((r.base ?? r.sm ?? r.md) as T) ?? (value as T);
    }
    // Desktop: cascade md → lg → xl → "2xl"
    return ((r.md ?? r.lg ?? r.xl ?? r["2xl"]) as T) ?? (value as T);
  }
  return value as T;
}

const NON_RESPONSIVE_COLLECTION_KEYS = new Set([
  "elements",
  "collapsedElements",
  "revealedElements",
  "fields",
  "elementOrder",
  "sectionOrder",
]);

const TIER_MAP_KEYS = new Set(["base", "sm", "md", "lg", "xl", "2xl"]);

function valueNeedsResolution(value: unknown, key?: string): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) {
    if (key && NON_RESPONSIVE_COLLECTION_KEYS.has(key)) return false;
    return value.length === 2;
  }
  if (typeof value === "object") {
    // Legacy {mobile, desktop} objects from pre-migration persisted data
    if ("mobile" in (value as object) || "desktop" in (value as object)) return true;
    // Tier map: { base?, sm?, md?, lg?, xl?, "2xl"? }
    if (Object.keys(value as object).some((k) => TIER_MAP_KEYS.has(k))) return true;
  }
  return false;
}

function resolveObjectShallow(
  obj: Record<string, unknown>,
  isMobile: boolean
): Record<string, unknown> {
  const needsCopy = Object.keys(obj).some((k) => valueNeedsResolution(obj[k], k));
  if (!needsCopy) return obj;
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (valueNeedsResolution(out[key], key)) {
      out[key] = resolveForBreakpoint(out[key], isMobile);
    }
  }
  return out;
}

const ELEMENT_RESPONSIVE_KEYS = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "align",
  "marginLeft",
  "marginRight",
  "marginTop",
  "marginBottom",
  "padding",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "fill",
  "borderRadius",
  "stroke",
  "strokeWidth",
  "opacity",
  "display",
  "hidden",
  "ariaLabel",
  "src",
  "poster",
];

function resolveElementBlock(
  el: Record<string, unknown>,
  isMobile: boolean
): Record<string, unknown> {
  const needsCopy = ELEMENT_RESPONSIVE_KEYS.some((k) => valueNeedsResolution(el[k]));
  if (!needsCopy) return el;
  const out = { ...el };
  for (const key of ELEMENT_RESPONSIVE_KEYS) {
    if (valueNeedsResolution(out[key])) {
      out[key] = resolveForBreakpoint(out[key], isMobile);
    }
  }
  return out;
}

function resolveSectionBlock(
  section: Record<string, unknown>,
  isMobile: boolean
): Record<string, unknown> {
  const out = resolveObjectShallow(section, isMobile);

  // Resolve elements array if present
  if (Array.isArray(out.elements)) {
    out.elements = (out.elements as Record<string, unknown>[]).map((el) =>
      resolveElementBlock(el, isMobile)
    );
  }
  // collapsedElements / revealedElements for revealSection
  if (Array.isArray(out.collapsedElements)) {
    out.collapsedElements = (out.collapsedElements as Record<string, unknown>[]).map((el) =>
      resolveElementBlock(el, isMobile)
    );
  }
  if (Array.isArray(out.revealedElements)) {
    out.revealedElements = (out.revealedElements as Record<string, unknown>[]).map((el) =>
      resolveElementBlock(el, isMobile)
    );
  }
  // fields for formBlock
  if (Array.isArray(out.fields)) {
    out.fields = (out.fields as Record<string, unknown>[]).map((f) =>
      resolveObjectShallow(f, isMobile)
    );
  }

  return out;
}

export function resolveBreakpointClient(
  sections: SectionBlock[],
  isMobile: boolean
): SectionBlock[] {
  return sections.map(
    (s) =>
      resolveSectionBlock(
        s as unknown as Record<string, unknown>,
        isMobile
      ) as unknown as SectionBlock
  );
}
