export type ImageTransformParams = {
  [key: string]: string;
};

function normalizeBoundedInt(value: unknown, min: number, max: number): string | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const bounded = Math.round(Math.max(min, Math.min(parsed, max)));
  return String(bounded);
}

export function normalizeImageTransformParams(
  input: Record<string, unknown> | undefined
): ImageTransformParams | undefined {
  if (!input) return undefined;

  const normalized: ImageTransformParams = {};
  const width = normalizeBoundedInt(input.width ?? input.w, 1, 4096);
  if (width) normalized.width = width;

  const height = normalizeBoundedInt(input.height, 1, 4096);
  if (height) normalized.height = height;

  const quality = normalizeBoundedInt(input.quality ?? input.q, 1, 100);
  if (quality) normalized.quality = quality;

  const format = typeof input.format === "string" ? input.format.trim().toLowerCase() : "";
  if (format && /^(avif|webp|jpg|jpeg|png)$/.test(format)) {
    normalized.format = format;
  }

  const aspectRatio = typeof input.aspect_ratio === "string" ? input.aspect_ratio.trim() : "";
  if (aspectRatio && /^\d+(?::|\/)\d+$/.test(aspectRatio)) {
    normalized.aspect_ratio = aspectRatio.replace("/", ":");
  }

  const className = typeof input.class === "string" ? input.class.trim() : "";
  if (className && /^[a-zA-Z0-9_-]+$/.test(className)) {
    normalized.class = className;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
