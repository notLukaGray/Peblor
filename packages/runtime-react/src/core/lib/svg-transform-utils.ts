/** Parsed rotate(angle [cx [cy]]) for gradient transform. */
export type ParsedRotateTransform = {
  type: "rotate";
  angle: number;
  cx: number;
  cy: number;
};

/** Parse a gradient transform string; returns rotate params or null if not a rotate(...). */
export function parseTransformString(
  transform: string | undefined | null
): ParsedRotateTransform | null {
  if (!transform || typeof transform !== "string") return null;
  const trimmed = transform.trim();
  const rotateMatch = trimmed.match(
    /^rotate\s*\(\s*([-\d.]+)(?:\s+([-\d.]+))?(?:\s+([-\d.]+))?\s*\)$/i
  );
  if (!rotateMatch || rotateMatch[1] == null) return null;
  const angle = parseFloat(rotateMatch[1]);
  const cx = rotateMatch[2] != null ? parseFloat(rotateMatch[2]) : 0;
  const cy = rotateMatch[3] != null ? parseFloat(rotateMatch[3]) : 0;
  return { type: "rotate", angle, cx, cy };
}

/** SVG matrix components in order: m11, m21, m12, m22, m31, m32. */
export type TransformMatrix = [number, number, number, number, number, number];

/** Build 2D transform matrix from parsed rotate (objectBoundingBox-friendly). */
export function buildGradientTransformMatrix(
  parsed: ParsedRotateTransform | null
): TransformMatrix | null {
  if (!parsed || parsed.type !== "rotate") return null;
  const { angle, cx, cy } = parsed;
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const m11 = cos;
  const m12 = -sin;
  const m21 = sin;
  const m22 = cos;
  const m31 = cx * (1 - cos) + cy * sin;
  const m32 = cy * (1 - cos) - cx * sin;
  return [m11, m21, m12, m22, m31, m32];
}

/** Serialize matrix to SVG gradientTransform string. */
export function serializeTransformMatrix(matrix: TransformMatrix): string {
  const [m11, m21, m12, m22, m31, m32] = matrix;
  return `matrix(${m11.toFixed(6)} ${m21.toFixed(6)} ${m12.toFixed(6)} ${m22.toFixed(6)} ${m31.toFixed(6)} ${m32.toFixed(6)})`;
}

/** Convert rotate(...) to matrix(...) for mobile; pass-through otherwise. */
export function convertRotateToMatrix(transform: string | undefined | null): string | undefined {
  if (transform === null) return undefined;
  if (!transform || typeof transform !== "string") return transform;
  const parsed = parseTransformString(transform);
  const matrix = buildGradientTransformMatrix(parsed);
  return matrix != null ? serializeTransformMatrix(matrix) : transform;
}
