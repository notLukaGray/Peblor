/**
 * Typography extraction and heuristic utilities.
 */

import type { TypographyOverrides } from "../types/peblor";
import { toPx } from "../utils/css";

// ---------------------------------------------------------------------------
// Figma variable binding helper (typography tokens)
// ---------------------------------------------------------------------------

/**
 * Resolves a Figma number/string variable binding to a CSS custom property.
 * Used for typography tokens (fontSize, fontFamily, lineHeight, letterSpacing).
 * Returns undefined if the key is not bound or resolution fails.
 */
export function resolveTypographyVariable(
  boundVars: Record<string, { type: "VARIABLE_ALIAS"; id: string }> | undefined,
  key: string,
  fallback: string | number | undefined
): string | undefined {
  if (!boundVars?.[key]) return undefined;
  const alias = boundVars[key];
  if (alias.type !== "VARIABLE_ALIAS") return undefined;
  try {
    const figmaVars = (
      globalThis as unknown as {
        figma?: {
          variables?: {
            getVariableById?: (id: string) => { name: string; resolvedType: string } | null;
          };
        };
      }
    ).figma?.variables;
    if (!figmaVars?.getVariableById) return undefined;
    const variable = figmaVars.getVariableById(alias.id);
    if (!variable) return undefined;
    const cssVar =
      "--" +
      variable.name
        .replace(/\//g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
    const fb = fallback !== undefined ? String(fallback) : undefined;
    return fb ? `var(${cssVar}, ${fb})` : `var(${cssVar})`;
  } catch {
    return undefined;
  }
}

/**
 * Infers a heading level (1–6) from a TextNode's font size.
 * Thresholds: ≥64→1, ≥48→2, ≥36→3, ≥28→4, ≥22→5, else→6.
 */
export function inferHeadingLevel(node: TextNode): number {
  const size = typeof node.fontSize === "number" ? node.fontSize : 16;
  if (size >= 64) return 1;
  if (size >= 48) return 2;
  if (size >= 36) return 3;
  if (size >= 28) return 4;
  if (size >= 22) return 5;
  return 6;
}

/**
 * Infers a body level (1–5) from a TextNode's font size.
 * Thresholds: ≥18→1, ≥16→2, ≥14→3, ≥13→4, else→5.
 */
export function inferBodyLevel(node: TextNode): number {
  const size = typeof node.fontSize === "number" ? node.fontSize : 14;
  if (size >= 18) return 1;
  if (size >= 16) return 2;
  if (size >= 14) return 3;
  if (size >= 13) return 4;
  return 5;
}

/**
 * Heuristic: returns true when the TextNode is likely a heading.
 * Criteria: fontWeight ≥ 600 OR fontSize ≥ 22 OR text style name contains
 * "heading", "/h", or "title" (case-insensitive).
 */
export function isLikelyHeading(node: TextNode, resolvedStyleName?: string | null): boolean {
  const size = typeof node.fontSize === "number" ? node.fontSize : 0;
  if (size >= 22) return true;

  const weight = typeof node.fontWeight === "number" ? node.fontWeight : 0;
  if (weight >= 600) return true;

  if (resolvedStyleName) {
    const n = resolvedStyleName.toLowerCase();
    if (
      n.includes("heading") ||
      n.includes("title") ||
      n.includes("display") ||
      n.includes("/h") ||
      /\bh[1-6]\b/.test(n)
    )
      return true;
  }

  return false;
}

/**
 * Extracts typography override fields from a TextNode.
 * Returns only fields that differ from defaults (non-mixed, non-zero values).
 * When a property is bound to a Figma variable, emits a CSS custom property
 * with the raw value as fallback (e.g. `var(--typography-body-size, 16px)`).
 */
export function extractTypographyOverrides(node: TextNode): Partial<TypographyOverrides> {
  const overrides: Partial<TypographyOverrides> = {};

  // Collect variable bindings from the node (not in TS typings — access defensively)
  const boundVars = (
    node as TextNode & {
      boundVariables?: Record<string, { type: "VARIABLE_ALIAS"; id: string }>;
    }
  ).boundVariables;

  // Font family
  const fontName = node.fontName;
  if (fontName !== figma.mixed) {
    const fontFamilyVar = resolveTypographyVariable(boundVars, "fontFamily", fontName.family);
    overrides.fontFamily = fontFamilyVar ?? fontName.family;
  }

  // Font size
  const fontSize = node.fontSize;
  if (fontSize !== figma.mixed) {
    const rawPx = toPx(fontSize);
    const fontSizeVar = resolveTypographyVariable(boundVars, "fontSize", rawPx);
    overrides.fontSize = fontSizeVar ?? rawPx;
  }

  // Font weight (Figma exposes as fontWeight on TextNode in newer API versions)
  const fontWeight = (node as unknown as { fontWeight?: number | symbol }).fontWeight;
  if (fontWeight !== undefined && fontWeight !== figma.mixed && typeof fontWeight === "number") {
    overrides.fontWeight = fontWeight;
  } else if (fontName !== figma.mixed) {
    // Fallback: derive weight from font style name
    overrides.fontWeight = inferFontWeightFromStyle(fontName.style);
  }

  // Letter spacing
  const ls = node.letterSpacing;
  if (ls !== figma.mixed && ls.value !== 0) {
    const rawLs = figmaLetterSpacingToCSS(ls);
    const letterSpacingVar = resolveTypographyVariable(boundVars, "letterSpacing", rawLs);
    overrides.letterSpacing = letterSpacingVar ?? rawLs;
  }

  // Line height
  const lh = node.lineHeight;
  if (lh !== figma.mixed && lh.unit !== "AUTO") {
    const rawLh = figmaLineHeightToCSS(lh);
    const lineHeightVar = resolveTypographyVariable(boundVars, "lineHeight", rawLh);
    overrides.lineHeight = lineHeightVar ?? rawLh;
  }

  // Text align — textAlignHorizontal is never mixed on TextNode, guard kept for uniformity
  const align = node.textAlignHorizontal as
    | "LEFT"
    | "CENTER"
    | "RIGHT"
    | "JUSTIFIED"
    | typeof figma.mixed;
  if (align !== figma.mixed) {
    overrides.textAlign = figmaTextAlignToCSS(align);
  }

  // Text decoration
  const decoration = node.textDecoration;
  if (decoration !== figma.mixed && decoration !== "NONE") {
    overrides.textDecoration = decoration.toLowerCase();
  }

  // Text case (textTransform)
  const textCase = node.textCase;
  if (textCase !== figma.mixed && textCase !== "ORIGINAL") {
    overrides.textTransform = figmaTextCaseToCSS(textCase);
  }

  return overrides;
}

export function figmaLetterSpacingToCSS(ls: LetterSpacing): string {
  if (ls.unit === "PERCENT") {
    // Figma: 10% = 0.1em
    return `${(ls.value / 100).toFixed(4).replace(/\.?0+$/, "")}em`;
  }
  return toPx(ls.value);
}

function figmaLineHeightToCSS(lh: LineHeight): string {
  if (lh.unit === "PIXELS") return toPx(lh.value);
  if (lh.unit === "PERCENT") return `${(lh.value / 100).toFixed(4).replace(/\.?0+$/, "")}`;
  return "normal";
}

export function figmaTextAlignToCSS(align: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED"): string {
  switch (align) {
    case "LEFT":
      return "left";
    case "CENTER":
      return "center";
    case "RIGHT":
      return "right";
    case "JUSTIFIED":
      return "justify";
  }
}

function figmaTextCaseToCSS(
  textCase: "UPPER" | "LOWER" | "TITLE" | "ORIGINAL" | "SMALL_CAPS" | "SMALL_CAPS_FORCED"
): string {
  switch (textCase) {
    case "UPPER":
      return "uppercase";
    case "LOWER":
      return "lowercase";
    case "TITLE":
      return "capitalize";
    case "SMALL_CAPS":
    case "SMALL_CAPS_FORCED":
      return "uppercase"; // closest CSS approximation
    default:
      return "none";
  }
}

function inferFontWeightFromStyle(style: string): number {
  const s = style.toLowerCase();
  if (s.includes("thin")) return 100;
  if (s.includes("extralight") || s.includes("extra light") || s.includes("ultralight")) return 200;
  if (s.includes("light")) return 300;
  if (s.includes("medium")) return 500;
  if (s.includes("semibold") || s.includes("semi bold") || s.includes("demibold")) return 600;
  if (s.includes("extrabold") || s.includes("extra bold") || s.includes("ultrabold")) return 800;
  if (s.includes("black") || s.includes("heavy")) return 900;
  if (s.includes("bold")) return 700;
  return 400; // regular / normal
}
