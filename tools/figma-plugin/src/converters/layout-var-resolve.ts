/**
 * Figma variable resolution for numeric CSS properties.
 */

type VariableAliasLike = { type: "VARIABLE_ALIAS"; id: string };
type BoundVarsMap = Record<string, VariableAliasLike | VariableAliasLike[] | undefined>;

function toCssVarName(raw: string): string {
  return (
    "--" +
    raw
      .replace(/\//g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
  );
}

function readAlias(
  boundVars: BoundVarsMap | undefined,
  propKey: string
): VariableAliasLike | undefined {
  const raw = boundVars?.[propKey];
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first?.type === "VARIABLE_ALIAS" ? first : undefined;
  }
  return raw.type === "VARIABLE_ALIAS" ? raw : undefined;
}

function getModeAwareFallback(
  variable: {
    variableCollectionId?: string;
    valuesByMode?: Record<string, unknown>;
    resolvedType?: string;
  } | null,
  node: SceneNode | undefined,
  fallback: number
): number {
  if (!variable || variable.resolvedType !== "FLOAT") return fallback;
  const collectionId = variable.variableCollectionId;
  if (!collectionId) return fallback;
  const modeMap = (
    node as (SceneNode & { resolvedVariableModes?: Record<string, string> }) | undefined
  )?.resolvedVariableModes;
  const modeId = modeMap?.[collectionId];
  if (!modeId) return fallback;
  const value = variable.valuesByMode?.[modeId];
  return typeof value === "number" ? value : fallback;
}

/**
 * Attempts to resolve a numeric Figma property to a CSS var() string.
 * Falls back to the resolved numeric value as a string with the given unit.
 *
 * @param boundVars - The node's boundVariables map (may be undefined)
 * @param propKey   - The property key to look up (e.g. "fontSize", "paddingTop")
 * @param fallback  - The resolved numeric value to use as fallback
 * @param unit      - CSS unit suffix for the fallback (default: "px")
 */
export function resolveNumericVar(
  boundVars: BoundVarsMap | undefined,
  propKey: string,
  fallback: number,
  unit = "px",
  node?: SceneNode
): string | number {
  const alias = readAlias(boundVars, propKey);
  if (alias?.type === "VARIABLE_ALIAS") {
    try {
      const figmaVars = (
        globalThis as unknown as {
          figma?: {
            variables?: {
              getVariableById?: (id: string) => {
                name: string;
                resolvedType: string;
                variableCollectionId?: string;
                valuesByMode?: Record<string, unknown>;
              } | null;
            };
          };
        }
      ).figma?.variables;
      const variable = figmaVars?.getVariableById?.(alias.id);
      if (variable && (variable.resolvedType === "FLOAT" || variable.resolvedType === "STRING")) {
        const cssVar = toCssVarName(variable.name);
        const modeAwareFallback = getModeAwareFallback(variable, node, fallback);
        const fallbackStr = `${modeAwareFallback}${unit}`;
        return `var(${cssVar}, ${fallbackStr})`;
      }
    } catch {
      // fall through
    }
  }
  return fallback;
}

export type { BoundVarsMap };
