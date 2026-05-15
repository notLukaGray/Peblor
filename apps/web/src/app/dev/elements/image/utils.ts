import type { PbImageAnimationCurve } from "@/app/theme/pb-builder-defaults";

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function curvePreviewLabel(curve: PbImageAnimationCurve): string {
  if (curve.preset !== "customBezier") return curve.preset;
  const [x1, y1, x2, y2] = curve.customBezier;
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

export function parseAspectRatioValue(ratio: string | undefined): number | null {
  if (!ratio) return null;
  const trimmed = ratio.trim();
  if (!trimmed) return null;
  const fraction = trimmed.match(/^([0-9]*\.?[0-9]+)\s*\/\s*([0-9]*\.?[0-9]+)$/);
  if (fraction) {
    const left = Number(fraction[1]);
    const right = Number(fraction[2]);
    return left > 0 && right > 0 ? left / right : null;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}
