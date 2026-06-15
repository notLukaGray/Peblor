/**
 * Responsive style CSS-emission engine.
 *
 * Inline styles can carry only one value, so responsive properties are emitted as a
 * scoped `<style>` block instead: a base rule plus `@media (min-width: …)` overrides
 * per viewport tier, and `@container (min-width: …)` overrides for container-relative
 * values. The browser then resolves the right value at every width with zero JS and no
 * hydration breakpoint mismatch.
 *
 * Accepts canonical responsive shapes:
 *   - scalar                                   → one base value
 *   - `{ base?, sm?, md?, lg?, xl?, "2xl"? }`  → named viewport tiers (mobile-first)
 *   - `{ "@container": { base?, … } }`         → same tiers against the nearest container
 *
 * Mirrors the state-style engine: deterministic class name, identical server/client
 * output, and the shared sanitizers that prevent `<style>` / rule breakout.
 */

import {
  BREAKPOINT_OVERRIDE_TIERS,
  BREAKPOINT_TIER_MIN_PX,
  BREAKPOINT_TIER_NAMES,
  type BreakpointTierName,
} from "@pb/contracts/peblor/core/breakpoint-tiers";
import {
  hashCssString,
  sanitizeCssProp,
  sanitizeCssValue,
  sanitizeForClassName,
  toKebabCase,
} from "./css-declaration-utils";

type CssPrimitive = string | number;
type ResponsiveValueInput = CssPrimitive | Record<string, unknown>;

type TierValues = Partial<Record<BreakpointTierName, CssPrimitive>>;
type NormalizedValue = { scope: "viewport" | "container"; tiers: TierValues };

export type ResponsiveStyleInput = {
  id?: string | null | undefined;
  /** camelCase or kebab-case CSS property → responsive value (any shape above). */
  styles: Record<string, ResponsiveValueInput | null | undefined>;
};

export type ResponsiveStyleResult = {
  /** Class to add to the element wrapper. Undefined when nothing responsive was present. */
  className: string | undefined;
  /** CSS text to emit in a scoped `<style>` sibling. Undefined when nothing was present. */
  css: string | undefined;
  /** True when any property used a container variant, so an ancestor must establish a container. */
  needsContainer: boolean;
};

// CSS properties whose numeric values are unitless (no `px` appended) — mirrors React's set.
const UNITLESS_PROPERTIES = new Set<string>([
  "opacity",
  "z-index",
  "line-height",
  "font-weight",
  "font-size-adjust",
  "font-weight-adjust",
  "flex",
  "flex-grow",
  "flex-shrink",
  "order",
  "aspect-ratio",
  "scale",
  "zoom",
  "grid-row",
  "grid-row-start",
  "grid-row-end",
  "grid-column",
  "grid-column-start",
  "grid-column-end",
  "columns",
  "column-count",
  "fill-opacity",
  "stroke-opacity",
  "tab-size",
  "animation-iteration-count",
  "border-image-outset",
  "initial-letter",
  "-webkit-line-clamp",
  "orphans",
  "widows",
]);

function isCssPrimitive(value: unknown): value is CssPrimitive {
  return typeof value === "string" || typeof value === "number";
}

function pickTierValues(value: unknown): TierValues | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const out: TierValues = {};
  for (const name of BREAKPOINT_TIER_NAMES) {
    const tierValue = record[name];
    if (isCssPrimitive(tierValue)) out[name] = tierValue;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Collapse any accepted responsive shape into `{ scope, tiers }`, or null when empty. */
function normalizeResponsiveValue(value: ResponsiveValueInput): NormalizedValue | null {
  if (isCssPrimitive(value)) {
    return { scope: "viewport", tiers: { base: value } };
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;

    if ("@container" in record) {
      const tiers = pickTierValues(record["@container"]);
      return tiers ? { scope: "container", tiers } : null;
    }

    const tiers = pickTierValues(record);
    return tiers ? { scope: "viewport", tiers } : null;
  }

  return null;
}

function formatDeclaration(kebabProp: string, value: CssPrimitive): string | null {
  const safeProp = sanitizeCssProp(kebabProp);
  if (safeProp === "") return null;

  let raw: string | number = value;
  if (typeof value === "number" && value !== 0 && !UNITLESS_PROPERTIES.has(safeProp)) {
    raw = `${value}px`;
  }
  const safeValue = sanitizeCssValue(raw);
  if (safeValue === "") return null;

  return `${safeProp}:${safeValue}`;
}

/** Join declarations into a rule body, dropping empties. */
function declarationsBlock(declarations: Array<string | null>): string {
  return declarations
    .filter((declaration): declaration is string => declaration !== null)
    .join(";");
}

/**
 * Compute a scoped class name and the responsive CSS for the provided property map.
 * Returns all-undefined / `needsContainer: false` when nothing responsive is present.
 */
export function buildResponsiveStyle(input: ResponsiveStyleInput): ResponsiveStyleResult {
  const { id, styles } = input;

  // prop (kebab) → normalized value
  const normalized: Array<{ prop: string; value: NormalizedValue }> = [];
  for (const [prop, rawValue] of Object.entries(styles)) {
    if (rawValue == null) continue;
    const value = normalizeResponsiveValue(rawValue);
    if (value) normalized.push({ prop: toKebabCase(prop), value });
  }

  if (normalized.length === 0) {
    return { className: undefined, css: undefined, needsContainer: false };
  }

  // Base declarations (the `base` tier, always-on) come from both scopes.
  const baseDeclarations: Array<string | null> = [];
  const viewportTierDeclarations = new Map<BreakpointTierName, Array<string | null>>();
  const containerTierDeclarations = new Map<BreakpointTierName, Array<string | null>>();
  let needsContainer = false;

  for (const { prop, value } of normalized) {
    if (value.scope === "container") needsContainer = true;
    const overridesBucket =
      value.scope === "container" ? containerTierDeclarations : viewportTierDeclarations;

    for (const [tierName, tierValue] of Object.entries(value.tiers) as Array<
      [BreakpointTierName, CssPrimitive]
    >) {
      const declaration = formatDeclaration(prop, tierValue);
      if (tierName === "base") {
        baseDeclarations.push(declaration);
        continue;
      }
      const bucket = overridesBucket.get(tierName) ?? [];
      bucket.push(declaration);
      overridesBucket.set(tierName, bucket);
    }
  }

  const suffix =
    id != null && id.length > 0
      ? sanitizeForClassName(id)
      : hashCssString(JSON.stringify(normalized));
  const cls = `pb-r-${suffix}`;

  const rules: string[] = [];

  const baseBlock = declarationsBlock(baseDeclarations);
  if (baseBlock !== "") rules.push(`.${cls}{${baseBlock}}`);

  for (const tier of BREAKPOINT_OVERRIDE_TIERS) {
    const block = declarationsBlock(viewportTierDeclarations.get(tier) ?? []);
    if (block !== "") {
      rules.push(`@media (min-width:${BREAKPOINT_TIER_MIN_PX[tier]}px){.${cls}{${block}}}`);
    }
  }

  for (const tier of BREAKPOINT_OVERRIDE_TIERS) {
    const block = declarationsBlock(containerTierDeclarations.get(tier) ?? []);
    if (block !== "") {
      rules.push(`@container (min-width:${BREAKPOINT_TIER_MIN_PX[tier]}px){.${cls}{${block}}}`);
    }
  }

  if (rules.length === 0) {
    return { className: undefined, css: undefined, needsContainer: false };
  }

  // When any property uses @container scope, emit the container-type declaration
  // alongside the @container rules so the element wrapper establishes a container
  // context.  The @container rules target .{cls} and the section content wrapper
  // (with container-type: inline-size) serves as the immediate ancestor container.
  if (needsContainer) {
    rules.unshift(`.${cls}{container-type:inline-size}`);
  }

  return { className: cls, css: rules.join(""), needsContainer };
}
