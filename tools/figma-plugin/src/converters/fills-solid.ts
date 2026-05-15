/**
 * Solid fill and Figma variable alias extraction utilities.
 */

import { figmaRgbToHex, figmaPaintToCSS } from "../utils/color";

/**
 * Converts a Figma variable name to a CSS custom property name.
 * "colors/primary/500" → "--colors-primary-500"
 */
export function variableNameToCssVar(name: string): string {
  return (
    "--" +
    name
      .replace(/\//g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
  );
}

/**
 * Resolves a variable alias to a CSS custom property with hex fallback.
 * If the variable cannot be resolved, returns null.
 */
export function resolveVariableAlias(
  alias: { type: "VARIABLE_ALIAS"; id: string },
  fallbackHex: string
): string | null {
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
    if (!figmaVars?.getVariableById) return null;
    const variable = figmaVars.getVariableById(alias.id);
    if (!variable) return null;
    if (
      variable.resolvedType !== "COLOR" &&
      variable.resolvedType !== "FLOAT" &&
      variable.resolvedType !== "STRING"
    )
      return null;
    const cssVar = variableNameToCssVar(variable.name);
    return `var(${cssVar}, ${fallbackHex})`;
  } catch {
    return null;
  }
}

type BoundVariables = Record<string, { type: "VARIABLE_ALIAS"; id: string }>;

/**
 * Returns the CSS color string of the first visible solid fill,
 * or `undefined` if no solid fill is present.
 * When the fill's color is bound to a Figma variable, emits a CSS custom
 * property with a hex fallback.
 */
export function extractSolidFill(fills: readonly Paint[]): string | undefined {
  for (const fill of fills) {
    if (fill.type === "SOLID" && fill.visible !== false) {
      const boundVars = (fill as SolidPaint & { boundVariables?: BoundVariables }).boundVariables;
      if (boundVars?.["color"]?.type === "VARIABLE_ALIAS") {
        const effectiveOpacity =
          (fill as SolidPaint).opacity !== undefined ? (fill as SolidPaint).opacity! : 1;
        const fallback = figmaRgbToHex(
          fill.color.r,
          fill.color.g,
          fill.color.b,
          effectiveOpacity < 0.99 ? effectiveOpacity : undefined
        );
        const varStr = resolveVariableAlias(boundVars["color"], fallback);
        if (varStr) return varStr;
      }
      const css = figmaPaintToCSS(fill);
      if (css !== null) return css;
    }
  }
  return undefined;
}
