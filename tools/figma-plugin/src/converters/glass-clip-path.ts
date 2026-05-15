/**
 * Extracts a normalized SVG clip-path from a Figma node's vector paths.
 *
 * Rectangular/frame nodes are excluded — border-radius already handles those.
 * All other vector shapes (Polygon, Star, Ellipse, Vector, etc.) are converted
 * to SVG path data normalized to [0,1]×[0,1] objectBoundingBox coordinates so
 * the clip-path scales correctly regardless of rendered element size.
 */

// These node types use CSS border-radius for shape clipping; no clip-path needed.
const BORDER_RADIUS_TYPES = new Set([
  "RECTANGLE",
  "FRAME",
  "COMPONENT",
  "INSTANCE",
  "COMPONENT_SET",
  "GROUP",
  "SECTION",
  "BOOLEAN_OPERATION",
]);

type VectorPathLike = { windingRule?: string; data: string };

function hasVectorPaths(
  node: SceneNode
): node is SceneNode & { vectorPaths: readonly VectorPathLike[] } {
  const vp = (node as { vectorPaths?: unknown }).vectorPaths;
  return Array.isArray(vp) && (vp as unknown[]).length > 0;
}

/** Round to 5 decimal places — sufficient precision for objectBoundingBox coords. */
function r(n: number): number {
  return Math.round(n * 100000) / 100000;
}

/**
 * Normalize an SVG path string to [0,1]×[0,1] objectBoundingBox coordinates.
 * Handles all standard SVG path commands (M L H V C S Q T A Z, upper and lower).
 */
function normalizeSvgPath(d: string, width: number, height: number): string {
  const wx = 1 / width;
  const wy = 1 / height;

  const tokens: Array<{ cmd: string; args: number[] }> = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1];
    const raw = (m[2] ?? "").trim();
    const args =
      raw.length > 0
        ? raw
            .split(/[\s,]+/)
            .filter(Boolean)
            .map(Number)
            .filter((n) => !isNaN(n))
        : [];
    tokens.push({ cmd, args });
  }

  const parts: string[] = [];

  for (const { cmd, args } of tokens) {
    switch (cmd) {
      // --- x y pairs ---
      case "M":
      case "m":
      case "L":
      case "l":
      case "T":
      case "t": {
        const sc: number[] = [];
        for (let i = 0; i + 1 < args.length; i += 2) {
          sc.push(r(args[i] * wx), r(args[i + 1] * wy));
        }
        if (sc.length > 0) parts.push(`${cmd}${sc.join(" ")}`);
        break;
      }
      // --- horizontal lineto ---
      case "H":
      case "h": {
        const sc = args.map((x) => r(x * wx));
        if (sc.length > 0) parts.push(`${cmd}${sc.join(" ")}`);
        break;
      }
      // --- vertical lineto ---
      case "V":
      case "v": {
        const sc = args.map((y) => r(y * wy));
        if (sc.length > 0) parts.push(`${cmd}${sc.join(" ")}`);
        break;
      }
      // --- cubic bezier: x1 y1 x2 y2 x y (groups of 6) ---
      case "C":
      case "c": {
        const sc: number[] = [];
        for (let i = 0; i + 5 < args.length; i += 6) {
          sc.push(
            r(args[i] * wx),
            r(args[i + 1] * wy),
            r(args[i + 2] * wx),
            r(args[i + 3] * wy),
            r(args[i + 4] * wx),
            r(args[i + 5] * wy)
          );
        }
        if (sc.length > 0) parts.push(`${cmd}${sc.join(" ")}`);
        break;
      }
      // --- smooth cubic: x2 y2 x y (groups of 4) ---
      case "S":
      case "s": {
        const sc: number[] = [];
        for (let i = 0; i + 3 < args.length; i += 4) {
          sc.push(r(args[i] * wx), r(args[i + 1] * wy), r(args[i + 2] * wx), r(args[i + 3] * wy));
        }
        if (sc.length > 0) parts.push(`${cmd}${sc.join(" ")}`);
        break;
      }
      // --- quadratic bezier: x1 y1 x y (groups of 4) ---
      case "Q":
      case "q": {
        const sc: number[] = [];
        for (let i = 0; i + 3 < args.length; i += 4) {
          sc.push(r(args[i] * wx), r(args[i + 1] * wy), r(args[i + 2] * wx), r(args[i + 3] * wy));
        }
        if (sc.length > 0) parts.push(`${cmd}${sc.join(" ")}`);
        break;
      }
      // --- arc: rx ry x-rotation large-arc-flag sweep-flag x y (groups of 7) ---
      case "A":
      case "a": {
        const sc: number[] = [];
        for (let i = 0; i + 6 < args.length; i += 7) {
          sc.push(
            r(args[i] * wx), // rx — scales with x axis
            r(args[i + 1] * wy), // ry — scales with y axis
            args[i + 2], // x-rotation — angle, don't scale
            args[i + 3], // large-arc-flag
            args[i + 4], // sweep-flag
            r(args[i + 5] * wx), // x
            r(args[i + 6] * wy) // y
          );
        }
        if (sc.length > 0) parts.push(`${cmd}${sc.join(" ")}`);
        break;
      }
      // --- closepath ---
      case "Z":
      case "z": {
        parts.push("Z");
        break;
      }
      // Unknown commands are silently skipped.
    }
  }

  return parts.join("");
}

function parseSvgAttr(tag: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`, "i"));
  return match?.[1]?.trim();
}

function parseSvgViewport(markup: string): { width: number; height: number } | undefined {
  const svgMatch = markup.match(/<svg\b[^>]*>/i);
  if (!svgMatch?.[0]) return undefined;
  const svgTag = svgMatch[0];

  const viewBox = parseSvgAttr(svgTag, "viewBox");
  if (viewBox) {
    const nums = viewBox
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part))
      .filter((value) => Number.isFinite(value));
    if (nums.length >= 4 && nums[2] > 0 && nums[3] > 0) {
      return { width: nums[2], height: nums[3] };
    }
  }

  const width = Number.parseFloat(parseSvgAttr(svgTag, "width") ?? "");
  const height = Number.parseFloat(parseSvgAttr(svgTag, "height") ?? "");
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }
  return undefined;
}

export type GlassClipPathResult = {
  /**
   * Normalized SVG path data in objectBoundingBox coordinates [0,1]×[0,1].
   * Use as `<path d={clipPath} />` inside a `<clipPath clipPathUnits="objectBoundingBox">`.
   */
  clipPath: string;
  /** SVG fill/clip rule for the path. */
  clipRule: "nonzero" | "evenodd";
};

/**
 * Infers a glass clip-path from a Figma node's vector paths.
 * Returns undefined for rectangular/frame nodes — border-radius handles those.
 *
 * The returned path is normalized to objectBoundingBox coordinates so the
 * runtime can apply it via SVG <clipPath clipPathUnits="objectBoundingBox">
 * and it will scale correctly to any rendered element size.
 */
export function inferGlassClipPath(node: SceneNode | undefined): GlassClipPathResult | undefined {
  if (!node) return undefined;
  if (BORDER_RADIUS_TYPES.has(node.type)) return undefined;
  if (!hasVectorPaths(node)) return undefined;

  const width = (node as { width?: number }).width ?? 0;
  const height = (node as { height?: number }).height ?? 0;
  if (width <= 0 || height <= 0) return undefined;

  const paths = (node as { vectorPaths: readonly VectorPathLike[] }).vectorPaths;

  // Use the first path's winding rule for the clip rule
  const firstRule = paths[0]?.windingRule;
  const clipRule: "nonzero" | "evenodd" =
    typeof firstRule === "string" && firstRule.toUpperCase() === "EVENODD" ? "evenodd" : "nonzero";

  // Combine all sub-paths and normalize coordinates
  const combined = paths
    .filter((p) => typeof p.data === "string" && p.data.trim().length > 0)
    .map((p) => p.data.trim())
    .join(" ");

  if (!combined) return undefined;

  try {
    const clipPath = normalizeSvgPath(combined, width, height);
    if (!clipPath) return undefined;
    return { clipPath, clipRule };
  } catch {
    return undefined;
  }
}

/**
 * Fallback inference from exported SVG markup.
 * Used when vectorPaths are unavailable on the Figma node (seen on some STAR/POLYGON exports).
 */
export function inferGlassClipPathFromSvgMarkup(
  markup: string | undefined
): GlassClipPathResult | undefined {
  if (typeof markup !== "string") return undefined;
  const source = markup.trim();
  if (!source) return undefined;

  const viewport = parseSvgViewport(source);
  if (!viewport) return undefined;

  const pathMatches = Array.from(source.matchAll(/<path\b[^>]*>/gi)).map((m) => m[0]);
  if (pathMatches.length === 0) return undefined;

  const clipRule: "nonzero" | "evenodd" = (() => {
    const first = pathMatches[0];
    const rule = parseSvgAttr(first, "clip-rule") ?? parseSvgAttr(first, "fill-rule");
    return typeof rule === "string" && rule.trim().toLowerCase() === "evenodd"
      ? "evenodd"
      : "nonzero";
  })();

  const combined = pathMatches
    .map((tag) => parseSvgAttr(tag, "d"))
    .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    .join(" ");
  if (!combined) return undefined;

  try {
    const clipPath = normalizeSvgPath(combined, viewport.width, viewport.height);
    if (!clipPath) return undefined;
    return { clipPath, clipRule };
  } catch {
    return undefined;
  }
}
