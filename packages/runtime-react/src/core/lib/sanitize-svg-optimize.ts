/**
 * Server-side SVGO optimization for sanitized SVG markup.
 *
 * Applies SVGO optimization to reduce bloat from Figma-authored SVGs
 * (high-precision coordinates, redundant groups, etc.). SVGO routinely
 * achieves 40-60% reduction.
 *
 * This file MUST NOT be imported by client components — it imports `svgo`
 * (Node.js) which tries to resolve `fs/promises`. Keep it server-only.
 */
import type { optimize as svgoOptimize } from "svgo";

/** Cached promise for the SVGO optimize function (lazy singleton). */
let svgoPromise: Promise<typeof svgoOptimize | null> | null = null;

async function loadSvgoOptimize(): Promise<typeof svgoOptimize | null> {
  try {
    const mod = await import("svgo");
    return mod.optimize;
  } catch {
    return null;
  }
}

function getSvgoOptimize(): Promise<typeof svgoOptimize | null> {
  if (svgoPromise === null) {
    svgoPromise = loadSvgoOptimize();
  }
  return svgoPromise;
}

/**
 * Apply SVGO optimization to already-sanitized SVG markup.
 * Standard optimization plugins with `removeViewBox` kept active (needed for
 * responsive SVGs). Logs byte reduction when > 0%.
 */
export async function optimizeSvgWithSvgo(sanitized: string): Promise<string> {
  if (!sanitized) return sanitized;

  const optimize = await getSvgoOptimize();
  if (!optimize) return sanitized;

  try {
    const before = sanitized.length;
    const result = optimize(sanitized, {
      plugins: [
        "removeDoctype",
        "removeXMLProcInst",
        "removeComments",
        "removeMetadata",
        "removeEditorsNSData",
        "cleanupAttrs",
        "mergeStyles",
        "inlineStyles",
        "minifyStyles",
        "removeUselessDefs",
        "cleanupNumericValues",
        "convertColors",
        "removeNonInheritableGroupAttrs",
        "removeUselessStrokeAndFill",
        "cleanupEnableBackground",
        "removeHiddenElems",
        "removeEmptyText",
        "convertShapeToPath",
        "moveElemsAttrsToGroup",
        "moveGroupAttrsToElems",
        "collapseGroups",
        "convertPathData",
        "convertTransform",
        "removeEmptyAttrs",
        "removeEmptyContainers",
        "mergePaths",
        "removeUnusedNS",
        "sortAttrs",
      ],
    });
    const after = result.data.length;
    const reduction = ((before - after) / before) * 100;
    if (reduction > 0) {
      console.warn(
        `[pb-runtime-react] SVGO reduced SVG by ${reduction.toFixed(1)}% (${before} → ${after} bytes)`
      );
    }
    return result.data;
  } catch {
    // Optimization failed — return original (safe) markup
    return sanitized;
  }
}
