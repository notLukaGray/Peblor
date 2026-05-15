import type { CSSProperties } from "react";
import type { ElementBodyVariant, ElementImageObjectFit } from "@pb/contracts";
import type { PbContentGuidelines } from "@/app/theme/pb-guidelines-expand";
import { deriveSpacingScale } from "@/app/theme/pb-spacing-tokens";

/**
 * Next-generation peblor defaults model.
 *
 * Goals:
 * - Scope defaults by peblor object (`section`, `module`, `element*`) instead of one flat style bucket.
 * - Support linked inference (e.g. button radius -> image radius, typography role -> element variant level).
 * - Keep legacy JSON behavior stable: explicit JSON values always win at render-time.
 */

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export type PbTextAlignmentSeed = "start" | "center" | "end";

export type PbTypographyRef =
  | { kind: "body"; level: ElementBodyVariant }
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6 };

export type PbButtonVariantId = "default" | "accent" | "ghost";

export type PbButtonColorIntent = "primary" | "accent" | "secondary" | "muted";

export interface PbFoundationDefaults {
  spacing: {
    /** Base spacing dial used for derived defaults across frames, rich text, and button padding. */
    baseRem: number;
    scale: {
      none: string;
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      "2xl": string;
      "3xl": string;
      "4xl": string;
    };
  };
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    pill: string;
  };
  typographyRoles: {
    richText: PbTypographyRef;
    buttonDefault: PbTypographyRef;
    buttonAccent: PbTypographyRef;
    buttonGhost: PbTypographyRef;
  };
  alignment: {
    content: PbTextAlignmentSeed;
  };
}

export interface PbSectionDefaults {
  align: "left" | "center" | "right" | "full";
  contentWidth: "full" | "hug" | string;
  contentHeight: "full" | "hug" | string;
  borderRadius: string;
}

export interface PbModuleDefaults {
  container: {
    padding: string;
    borderRadius: string;
  };
  slot: {
    flexDirection: NonNullable<CSSProperties["flexDirection"]>;
    alignItems: NonNullable<CSSProperties["alignItems"]>;
    justifyContent: string;
    flexWrap: NonNullable<CSSProperties["flexWrap"]>;
    gap: string | null;
    rowGap: string | null;
    columnGap: string | null;
    padding: string;
  };
}

export interface PbFrameDefaults {
  textAlign: CSSProperties["textAlign"];
  gap: string | null;
  rowGap: string | null;
  columnGap: string | null;
  flexDirection: NonNullable<CSSProperties["flexDirection"]>;
  alignItems: NonNullable<CSSProperties["alignItems"]>;
  justifyContent: string;
  flexWrap: NonNullable<CSSProperties["flexWrap"]>;
  padding: string;
  borderRadius: string;
}

export interface PbRichTextDefaults {
  typography: PbTypographyRef;
  paragraphGap: string;
  codeRadius: string;
  headingH1Margin: string;
  headingH1MarginTop: string | null;
  headingH1MarginBottom: string | null;
  headingH2Margin: string;
  headingH2MarginTop: string | null;
  headingH2MarginBottom: string | null;
  headingH3Margin: string;
  headingH3MarginTop: string | null;
  headingH3MarginBottom: string | null;
  listMarginY: string;
  blockquoteMarginY: string;
  hrMarginY: string;
  preWrapMarginY: string;
}

export interface PbButtonVariantDefaults {
  typography: PbTypographyRef;
  colorIntent: PbButtonColorIntent;
  labelGap: string;
  paddingY: string;
  paddingX: string;
  borderRadius: string;
}

export interface PbButtonDefaults {
  defaultVariant: PbButtonVariantId;
  variants: Record<PbButtonVariantId, PbButtonVariantDefaults>;
}

export interface PbImageDefaults {
  objectFit: ElementImageObjectFit;
  borderRadius: string;
}

export interface PbElementDefaults {
  frame: PbFrameDefaults;
  richText: PbRichTextDefaults;
  button: PbButtonDefaults;
  image: PbImageDefaults;
}

export type PbLinkTransform =
  | { kind: "identity" }
  | { kind: "remScale"; multiplier: number; precision?: number; min?: number }
  | { kind: "alias"; map: Record<string, string> };

export type PbLinkMode = "fillIfUnset" | "overwrite";

export interface PbLinkRule {
  /** Dot path from source object in PbBuilderDefaultsV3 */
  sourcePath: string;
  /** Dot path in PbBuilderDefaultsV3 */
  targetPath: string;
  transform: PbLinkTransform;
  mode: PbLinkMode;
}

export interface PbDefaultsLinks {
  rules: PbLinkRule[];
}

export interface PbBuilderDefaultsV3 {
  version: 3;
  foundation: PbFoundationDefaults;
  section: PbSectionDefaults;
  module: PbModuleDefaults;
  elements: PbElementDefaults;
  links: PbDefaultsLinks;
}

export type PbDefaultsLayerName = "engine" | "theme" | "project" | "page" | "session";

export interface PbDefaultsLayers {
  engine: PbBuilderDefaultsV3;
  theme?: DeepPartial<PbBuilderDefaultsV3>;
  project?: DeepPartial<PbBuilderDefaultsV3>;
  page?: DeepPartial<PbBuilderDefaultsV3>;
  session?: DeepPartial<PbBuilderDefaultsV3>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** Deep merge for defaults layers. Arrays are replaced, not merged. */
export function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (patch === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch as T;

  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const prev = out[k];
    if (isPlainObject(prev) && isPlainObject(v)) {
      out[k] = deepMerge(prev, v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

function getPathValue(root: unknown, path: string): unknown {
  if (!isPlainObject(root)) return undefined;
  let cursor: unknown = root;
  for (const key of path.split(".")) {
    if (!isPlainObject(cursor)) return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

function setPathValue(root: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cursor: Record<string, unknown> = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const p = parts[i];
    if (!p) continue;
    const next = cursor[p];
    if (!isPlainObject(next)) {
      cursor[p] = {};
    }
    cursor = cursor[p] as Record<string, unknown>;
  }
  const leaf = parts[parts.length - 1];
  if (!leaf) return;
  cursor[leaf] = value;
}

function isUnset(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim().length === 0);
}

function transformLinkValue(sourceValue: unknown, transform: PbLinkTransform): unknown {
  if (sourceValue == null) return undefined;
  if (transform.kind === "identity") return sourceValue;

  if (transform.kind === "alias") {
    const key = String(sourceValue);
    return transform.map[key] ?? sourceValue;
  }

  if (transform.kind === "remScale") {
    const n = typeof sourceValue === "number" ? sourceValue : Number(sourceValue);
    if (!Number.isFinite(n)) return undefined;
    const scaled = n * transform.multiplier;
    const clamped = transform.min != null ? Math.max(transform.min, scaled) : scaled;
    const precision = transform.precision ?? 3;
    return `${Number(clamped.toFixed(precision))}rem`;
  }

  return undefined;
}

/**
 * Apply cross-domain inference links.
 * - `fillIfUnset`: writes only when target is null/undefined/empty-string.
 * - `overwrite`: always writes target.
 */
export function applyLinkedInference(defaults: PbBuilderDefaultsV3): PbBuilderDefaultsV3 {
  const out = deepMerge(defaults, {});
  const root = out as unknown as Record<string, unknown>;

  for (const rule of out.links.rules) {
    const sourceValue = getPathValue(root, rule.sourcePath);
    const transformed = transformLinkValue(sourceValue, rule.transform);
    if (transformed === undefined) continue;

    const targetValue = getPathValue(root, rule.targetPath);
    if (rule.mode === "fillIfUnset" && !isUnset(targetValue)) continue;

    setPathValue(root, rule.targetPath, transformed);
  }

  return out;
}

/**
 * Layer precedence for defaults authoring.
 * Later layers override earlier ones.
 */
export function resolvePbDefaultsLayers(layers: PbDefaultsLayers): PbBuilderDefaultsV3 {
  let merged = layers.engine;
  merged = deepMerge(merged, layers.theme);
  merged = deepMerge(merged, layers.project);
  merged = deepMerge(merged, layers.page);
  merged = deepMerge(merged, layers.session);
  return applyLinkedInference(merged);
}

/**
 * Final merge at render time:
 * defaults -> block JSON
 *
 * This preserves backward compatibility: explicit values in page JSON always win.
 */
export function mergeDefaultsWithBlockJson<T extends Record<string, unknown>>(
  defaults: T,
  blockJson: Partial<T> | undefined
): T {
  return deepMerge(defaults, (blockJson ?? {}) as DeepPartial<T>);
}

function parseRemNumber(value: string | null | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = value.trim().match(/^(-?\d*\.?\d+)\s*rem$/i);
  if (!match) return fallback;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Backward-compatible adapter: map current `pbContentGuidelines` to object-scoped defaults.
 * This lets us migrate `/dev/style` incrementally without breaking any existing page JSON.
 */
export function createPbDefaultsFromLegacyGuidelines(
  guidelines: PbContentGuidelines
): PbBuilderDefaultsV3 {
  const baseRem = parseRemNumber(guidelines.richTextParagraphGap, 0.5);
  const spacingScale = deriveSpacingScale(baseRem);

  return {
    version: 3,
    foundation: {
      spacing: { baseRem, scale: spacingScale },
      radius: {
        none: "0",
        sm: "0.25rem",
        md: guidelines.frameBorderRadiusDefault,
        lg: "0.75rem",
        pill: "9999px",
      },
      typographyRoles: {
        richText: { kind: "body", level: 3 },
        buttonDefault: { kind: "body", level: 3 },
        buttonAccent: { kind: "body", level: 4 },
        buttonGhost: { kind: "body", level: 5 },
      },
      alignment: {
        content:
          guidelines.copyTextAlign === "center"
            ? "center"
            : guidelines.copyTextAlign === "right" || guidelines.copyTextAlign === "end"
              ? "end"
              : "start",
      },
    },
    section: {
      align: "center",
      contentWidth: "hug",
      contentHeight: "hug",
      borderRadius: guidelines.frameBorderRadiusDefault,
    },
    module: {
      container: {
        padding: guidelines.framePaddingDefault,
        borderRadius: guidelines.frameBorderRadiusDefault,
      },
      slot: {
        flexDirection: guidelines.frameFlexDirectionDefault,
        alignItems: guidelines.frameAlignItemsDefault,
        justifyContent: guidelines.frameJustifyContentDefault,
        flexWrap: guidelines.frameFlexWrapDefault,
        gap: guidelines.frameGapWhenUnset,
        rowGap: guidelines.frameRowGapWhenUnset,
        columnGap: guidelines.frameColumnGapWhenUnset,
        padding: guidelines.framePaddingDefault,
      },
    },
    elements: {
      frame: {
        textAlign: guidelines.copyTextAlign,
        gap: guidelines.frameGapWhenUnset,
        rowGap: guidelines.frameRowGapWhenUnset,
        columnGap: guidelines.frameColumnGapWhenUnset,
        flexDirection: guidelines.frameFlexDirectionDefault,
        alignItems: guidelines.frameAlignItemsDefault,
        justifyContent: guidelines.frameJustifyContentDefault,
        flexWrap: guidelines.frameFlexWrapDefault,
        padding: guidelines.framePaddingDefault,
        borderRadius: guidelines.frameBorderRadiusDefault,
      },
      richText: {
        typography: { kind: "body", level: 3 },
        paragraphGap: guidelines.richTextParagraphGap,
        codeRadius: guidelines.richTextCodeBorderRadius,
        headingH1Margin: guidelines.richTextHeadingH1Margin,
        headingH1MarginTop: guidelines.richTextHeadingH1MarginTop,
        headingH1MarginBottom: guidelines.richTextHeadingH1MarginBottom,
        headingH2Margin: guidelines.richTextHeadingH2Margin,
        headingH2MarginTop: guidelines.richTextHeadingH2MarginTop,
        headingH2MarginBottom: guidelines.richTextHeadingH2MarginBottom,
        headingH3Margin: guidelines.richTextHeadingH3Margin,
        headingH3MarginTop: guidelines.richTextHeadingH3MarginTop,
        headingH3MarginBottom: guidelines.richTextHeadingH3MarginBottom,
        listMarginY: guidelines.richTextListMarginY,
        blockquoteMarginY: guidelines.richTextBlockquoteMarginY,
        hrMarginY: guidelines.richTextHrMarginY,
        preWrapMarginY: guidelines.richTextPreWrapMarginY,
      },
      button: {
        defaultVariant: "default",
        variants: {
          default: {
            typography: { kind: "body", level: 3 },
            colorIntent: "primary",
            labelGap: guidelines.buttonLabelGap,
            paddingY: guidelines.buttonNakedPaddingY ?? parseAxis(guidelines.buttonNakedPadding).y,
            paddingX: guidelines.buttonNakedPaddingX ?? parseAxis(guidelines.buttonNakedPadding).x,
            borderRadius: guidelines.buttonNakedBorderRadius,
          },
          accent: {
            typography: { kind: "body", level: 4 },
            colorIntent: "accent",
            labelGap: guidelines.buttonLabelGap,
            paddingY: guidelines.buttonNakedPaddingY ?? parseAxis(guidelines.buttonNakedPadding).y,
            paddingX: guidelines.buttonNakedPaddingX ?? parseAxis(guidelines.buttonNakedPadding).x,
            borderRadius: guidelines.buttonNakedBorderRadius,
          },
          ghost: {
            typography: { kind: "body", level: 5 },
            colorIntent: "secondary",
            labelGap: guidelines.buttonLabelGap,
            paddingY: guidelines.buttonNakedPaddingY ?? parseAxis(guidelines.buttonNakedPadding).y,
            paddingX: guidelines.buttonNakedPaddingX ?? parseAxis(guidelines.buttonNakedPadding).x,
            borderRadius: guidelines.buttonNakedBorderRadius,
          },
        },
      },
      image: {
        objectFit: "cover",
        borderRadius: guidelines.frameBorderRadiusDefault,
      },
    },
    links: {
      rules: [
        {
          sourcePath: "foundation.radius.md",
          targetPath: "elements.image.borderRadius",
          transform: { kind: "identity" },
          mode: "fillIfUnset",
        },
        {
          sourcePath: "foundation.radius.md",
          targetPath: "elements.button.variants.default.borderRadius",
          transform: { kind: "identity" },
          mode: "fillIfUnset",
        },
        {
          sourcePath: "foundation.radius.md",
          targetPath: "elements.button.variants.accent.borderRadius",
          transform: { kind: "identity" },
          mode: "fillIfUnset",
        },
        {
          sourcePath: "foundation.radius.md",
          targetPath: "elements.button.variants.ghost.borderRadius",
          transform: { kind: "identity" },
          mode: "fillIfUnset",
        },
        {
          sourcePath: "foundation.spacing.baseRem",
          targetPath: "elements.frame.gap",
          transform: { kind: "remScale", multiplier: 2, precision: 3 },
          mode: "fillIfUnset",
        },
        {
          sourcePath: "foundation.spacing.scale.md",
          targetPath: "elements.frame.gap",
          transform: { kind: "identity" },
          mode: "overwrite",
        },
        {
          sourcePath: "foundation.spacing.scale.md",
          targetPath: "elements.frame.rowGap",
          transform: { kind: "identity" },
          mode: "fillIfUnset",
        },
        {
          sourcePath: "foundation.radius.md",
          targetPath: "elements.frame.borderRadius",
          transform: { kind: "identity" },
          mode: "fillIfUnset",
        },
        {
          sourcePath: "foundation.radius.md",
          targetPath: "section.borderRadius",
          transform: { kind: "identity" },
          mode: "fillIfUnset",
        },
      ],
    },
  };
}

function parseAxis(value: string): { y: string; x: string } {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length >= 2) return { y: parts[0] ?? "0", x: parts[1] ?? "0" };
  const one = parts[0] ?? "0";
  return { y: one, x: one };
}
