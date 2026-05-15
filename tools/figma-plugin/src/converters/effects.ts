/**
 * Effect extraction utilities.
 * Converts Figma shadow and blur effects to CSS strings.
 */

import { figmaRgbToHex } from "../utils/color";
import { toPx } from "../utils/css";
import { inferGlassClipPath } from "./glass-clip-path";

export type ExtractedGlassEffect = {
  type: "glass";
  lightIntensity?: number;
  lightAngle?: number;
  refraction?: number;
  depth?: number;
  dispersion?: number;
  frost?: string;
  splay?: number;
  displacementScale?: number;
  blurAmount?: number;
  saturation?: number;
  aberrationIntensity?: number;
  elasticity?: number;
  reflection?: number;
  overLight?: boolean;
  mouseFollow?: boolean;
  mode?: "standard" | "polar" | "prominent" | "shader";
  // Physics overrides inferred from node geometry at export time.
  // Developers can adjust these in JSON; they take precedence over Figma-semantic fields.
  bezelType?: "convex_circle" | "convex_squircle" | "concave" | "lip";
  bezelWidth?: number;
  // Clip-path for non-rectangular shapes (Polygon, Star, Ellipse, custom Vector, etc.).
  // Normalized to objectBoundingBox [0,1]×[0,1] — scales to any rendered element size.
  // Undefined for rectangular/frame nodes (border-radius handles those).
  clipPath?: string;
  clipRule?: "nonzero" | "evenodd";
};

const DEFAULT_GLASS_LIGHT_INTENSITY = 0.5;
const DEFAULT_GLASS_LIGHT_ANGLE = 50;
const DEFAULT_GLASS_REFRACTION = 1;
const DEFAULT_GLASS_DEPTH = 46;
const DEFAULT_GLASS_DISPERSION = 1;
const DEFAULT_GLASS_FROST = "0px";
const DEFAULT_GLASS_SPLAY = 0.03;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeFrostRadius(radius: number | undefined): string | undefined {
  if (typeof radius !== "number" || !Number.isFinite(radius)) return undefined;
  if (radius < 0) return undefined;
  // Figma blur radii visually map closer to half-radius in CSS blur functions.
  return toPx(radius / 2);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function parsePx(value: string | undefined): number | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  const numeric = normalized.endsWith("px")
    ? Number.parseFloat(normalized.slice(0, -2))
    : Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeSplay(splay: number | undefined): number {
  if (typeof splay !== "number" || !Number.isFinite(splay)) return DEFAULT_GLASS_SPLAY;
  const normalized = splay > 1 ? splay / 100 : splay;
  return round(clamp(Math.max(0, normalized), 0, 1), 3);
}

function resolveGlassMode(
  explicitMode: ExtractedGlassEffect["mode"] | undefined,
  refraction: number,
  dispersion: number,
  depth: number
): NonNullable<ExtractedGlassEffect["mode"]> {
  if (
    explicitMode === "standard" ||
    explicitMode === "polar" ||
    explicitMode === "prominent" ||
    explicitMode === "shader"
  ) {
    return explicitMode;
  }
  if (refraction >= 0.7 || dispersion >= 0.5 || depth >= 16) return "prominent";
  if (refraction >= 0.45 || dispersion >= 0.2) return "polar";
  return "standard";
}

export function withLiquidGlassDefaults(
  value: Partial<ExtractedGlassEffect> | undefined
): ExtractedGlassEffect {
  const lightIntensity = round(clamp(value?.lightIntensity ?? DEFAULT_GLASS_LIGHT_INTENSITY, 0, 1));
  const lightAngle = round(value?.lightAngle ?? DEFAULT_GLASS_LIGHT_ANGLE, 2);
  const refraction = round(clamp(value?.refraction ?? DEFAULT_GLASS_REFRACTION, 0, 1));
  const depth = round(Math.max(1, value?.depth ?? DEFAULT_GLASS_DEPTH), 2);
  const dispersion = round(clamp(value?.dispersion ?? DEFAULT_GLASS_DISPERSION, 0, 1));
  const frostPx = Math.max(0, parsePx(value?.frost ?? DEFAULT_GLASS_FROST) ?? 0);
  const frost = `${round(frostPx, 2)}px`;
  const splay = normalizeSplay(value?.splay);
  const mode = resolveGlassMode(value?.mode, refraction, dispersion, depth);

  const displacementScale = round(
    clamp(
      value?.displacementScale ?? 22 + refraction * 26 + Math.min(depth, 120) * 0.34 + splay * 90,
      16,
      120
    ),
    2
  );
  const blurAmount = round(clamp(value?.blurAmount ?? frostPx / 32, 0, 2), 3);
  const saturation = round(
    clamp(
      value?.saturation ?? 110 + lightIntensity * 38 + refraction * 24 + dispersion * 18,
      100,
      220
    ),
    2
  );
  const aberrationIntensity = round(
    clamp(value?.aberrationIntensity ?? 0.4 + dispersion * 3.6, 0.4, 6),
    3
  );
  const elasticity = round(clamp(value?.elasticity ?? 0.04 + splay * 0.8, 0, 1), 3);
  const reflection = round(
    clamp(value?.reflection ?? 0.22 + lightIntensity * 0.5 + refraction * 0.12, 0.15, 1),
    3
  );
  const overLight = typeof value?.overLight === "boolean" ? value.overLight : false;
  const mouseFollow = asBoolean(value?.mouseFollow);

  return {
    type: "glass",
    lightIntensity,
    lightAngle,
    refraction,
    depth,
    dispersion,
    frost,
    splay,
    displacementScale,
    blurAmount,
    saturation,
    aberrationIntensity,
    elasticity,
    reflection,
    overLight,
    ...(mouseFollow !== undefined ? { mouseFollow } : {}),
    mode,
  };
}

/**
 * Infers bezelType and bezelWidth from a Figma node's geometry.
 *
 * bezelType: convex_circle when cornerRadius ≥ 50% of the shorter dimension
 *            (i.e. a pill or circle shape), otherwise convex_squircle.
 * bezelWidth: 16% of the shorter dimension, matching the runtime default,
 *             so the exported JSON is an accurate starting point.
 */
function inferBezelFromNode(
  node: SceneNode | undefined
): Pick<ExtractedGlassEffect, "bezelType" | "bezelWidth"> {
  if (!node || !("width" in node) || !("height" in node)) return {};
  const width = (node as { width: number }).width;
  const height = (node as { height: number }).height;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return {};

  const minDim = Math.min(width, height);

  // Read corner radius — may be a uniform number or a figma Mixed symbol.
  let cornerRadius = 0;
  const cr = (node as { cornerRadius?: number | symbol }).cornerRadius;
  if (typeof cr === "number" && Number.isFinite(cr)) {
    cornerRadius = cr;
  } else {
    // Mixed corners — take the maximum of the four individual radii.
    const tl = (node as { topLeftRadius?: number }).topLeftRadius ?? 0;
    const tr = (node as { topRightRadius?: number }).topRightRadius ?? 0;
    const bl = (node as { bottomLeftRadius?: number }).bottomLeftRadius ?? 0;
    const br = (node as { bottomRightRadius?: number }).bottomRightRadius ?? 0;
    cornerRadius = Math.max(tl, tr, bl, br);
  }

  // A shape is "circular" when the radius meets or exceeds half the shorter side.
  const isCircular = cornerRadius >= minDim / 2 - 1;
  const bezelType = isCircular ? "convex_circle" : "convex_squircle";
  const bezelWidth = Math.max(Math.round(minDim * 0.16), 4);

  return { bezelType, bezelWidth };
}

function hasGlassStyleHint(node: SceneNode | undefined): boolean {
  if (!node) return false;
  const rawEffectStyleId = (node as SceneNode & { effectStyleId?: unknown }).effectStyleId;
  if (typeof rawEffectStyleId !== "string" || rawEffectStyleId.trim().length === 0) return false;
  const figmaApi = (globalThis as { figma?: PluginAPI }).figma;
  if (!figmaApi?.getStyleById) return false;

  try {
    const style = figmaApi.getStyleById(rawEffectStyleId);
    if (!style || style.type !== "EFFECT") return false;
    const styleName = style.name?.toLowerCase() ?? "";
    const styleEffects =
      "effects" in style && Array.isArray((style as { effects?: readonly Effect[] }).effects)
        ? ((style as { effects?: readonly Effect[] }).effects ?? [])
        : [];
    return (
      styleName.includes("glass") ||
      styleEffects.some((effect) => effect.visible !== false && effect.type === "GLASS")
    );
  } catch {
    return false;
  }
}

/**
 * Converts Figma DROP_SHADOW and INNER_SHADOW effects to a CSS `box-shadow` string.
 * Multiple shadows are comma-separated.
 * Returns `undefined` if no visible shadow effects are present.
 */
export function extractBoxShadow(effects: readonly Effect[]): string | undefined {
  const parts: string[] = [];

  for (const effect of effects) {
    if (effect.visible === false) continue;
    if (effect.type !== "DROP_SHADOW" && effect.type !== "INNER_SHADOW") continue;

    const shadow = effect as DropShadowEffect | InnerShadowEffect;
    const { r, g, b, a } = shadow.color;
    const colorStr = figmaRgbToHex(r, g, b, a < 1 ? a : undefined);
    const inset = effect.type === "INNER_SHADOW" ? "inset " : "";

    parts.push(
      `${inset}${toPx(shadow.offset.x)} ${toPx(shadow.offset.y)} ${toPx(shadow.radius)} ${toPx(shadow.spread ?? 0)} ${colorStr}`
    );
  }

  return parts.length > 0 ? parts.join(", ") : undefined;
}

/**
 * Converts a Figma LAYER_BLUR effect to a CSS `filter` string.
 * Only the first visible LAYER_BLUR is used (Figma allows at most one).
 * Returns `undefined` if no layer blur is present.
 */
export function extractFilter(effects: readonly Effect[]): string | undefined {
  for (const effect of effects) {
    if (effect.visible === false) continue;
    if (effect.type !== "LAYER_BLUR") continue;
    return `blur(${toPx((effect as BlurEffect).radius / 2)})`;
  }
  return undefined;
}

/**
 * Converts a Figma BACKGROUND_BLUR effect to a CSS `backdrop-filter` string.
 * Only the first visible BACKGROUND_BLUR is used.
 * Returns `undefined` if no background blur is present.
 */
export function extractBackdropFilter(effects: readonly Effect[]): string | undefined {
  for (const effect of effects) {
    if (effect.visible === false) continue;
    if (effect.type !== "BACKGROUND_BLUR") continue;
    return `blur(${toPx((effect as BlurEffect).radius / 2)})`;
  }
  return undefined;
}

/**
 * Extracts a Figma GLASS effect into a structured section-effect payload.
 * If the node is using an effect style named "glass" (without a native GLASS effect),
 * this returns a minimal fallback payload so the Peblor still applies glass treatment.
 */
export function extractGlassEffect(
  effects: readonly Effect[],
  node?: SceneNode
): ExtractedGlassEffect | undefined {
  const bezelDefaults = inferBezelFromNode(node);
  const clipPathDefaults = inferGlassClipPath(node);

  for (const effect of effects) {
    if (effect.visible === false) continue;
    if (effect.type !== "GLASS") continue;
    const glass = effect as GlassEffect & { splay?: number; mouseFollow?: boolean };
    const frost = normalizeFrostRadius(glass.radius);
    return {
      ...withLiquidGlassDefaults({
        lightIntensity: round(clamp(glass.lightIntensity, 0, 1)),
        lightAngle: round(glass.lightAngle, 2),
        refraction: round(clamp(glass.refraction, 0, 1)),
        depth: round(Math.max(1, glass.depth), 2),
        dispersion: round(clamp(glass.dispersion, 0, 1)),
        ...(frost !== undefined ? { frost } : {}),
        ...(typeof glass.splay === "number" && Number.isFinite(glass.splay)
          ? { splay: glass.splay }
          : {}),
        ...(typeof glass.mouseFollow === "boolean" ? { mouseFollow: glass.mouseFollow } : {}),
      }),
      ...bezelDefaults,
      ...clipPathDefaults,
    };
  }

  // Compatibility fallback: some plugin/runtime versions may surface newer glass payloads
  // without the `type: "GLASS"` discriminator in typings. Detect by signature.
  for (const effect of effects) {
    const rec = effect as unknown as Record<string, unknown>;
    if (rec.visible === false) continue;
    const type = typeof rec.type === "string" ? rec.type.toLowerCase() : "";
    const lightIntensity = asNumber(rec.lightIntensity);
    const lightAngle = asNumber(rec.lightAngle);
    const refraction = asNumber(rec.refraction);
    const depth = asNumber(rec.depth);
    const dispersion = asNumber(rec.dispersion);
    const radius = asNumber(rec.radius);
    const splay = asNumber(rec.splay);
    const mouseFollow = asBoolean(rec.mouseFollow);
    const frost = normalizeFrostRadius(radius);
    const hasGlassShape =
      type.includes("glass") ||
      lightIntensity !== undefined ||
      lightAngle !== undefined ||
      refraction !== undefined ||
      depth !== undefined ||
      dispersion !== undefined;
    if (!hasGlassShape) continue;
    return {
      ...withLiquidGlassDefaults({
        ...(lightIntensity !== undefined
          ? { lightIntensity: round(clamp(lightIntensity, 0, 1)) }
          : {}),
        ...(lightAngle !== undefined ? { lightAngle: round(lightAngle, 2) } : {}),
        ...(refraction !== undefined ? { refraction: round(clamp(refraction, 0, 1)) } : {}),
        ...(depth !== undefined ? { depth: round(Math.max(1, depth), 2) } : {}),
        ...(dispersion !== undefined ? { dispersion: round(clamp(dispersion, 0, 1)) } : {}),
        ...(frost !== undefined ? { frost } : {}),
        ...(splay !== undefined ? { splay } : {}),
        ...(mouseFollow !== undefined ? { mouseFollow } : {}),
      }),
      ...bezelDefaults,
      ...clipPathDefaults,
    };
  }

  // Style-name fallback: support teams that tag an Effect Style as "glass"
  // but don't use the native GLASS effect node yet.
  if (hasGlassStyleHint(node)) {
    const fallbackBackgroundBlur = effects.find(
      (effect): effect is BlurEffect =>
        effect.visible !== false && effect.type === "BACKGROUND_BLUR"
    );
    const frost = normalizeFrostRadius(fallbackBackgroundBlur?.radius);
    return {
      ...withLiquidGlassDefaults({
        ...(frost ? { frost } : {}),
      }),
      ...bezelDefaults,
      ...clipPathDefaults,
    };
  }

  return undefined;
}
