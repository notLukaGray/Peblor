/**
 * Named opacity steps for element defaults and /dev editors.
 * Not injected as CSS variables — opacity is usually inline style (0–1).
 */
export type OpacityScale = {
  muted: number;
  dimmed: number;
  subtle: number;
  strong: number;
  full: number;
};

export const DEFAULT_OPACITY_SCALE: OpacityScale = {
  muted: 0.4,
  dimmed: 0.6,
  subtle: 0.75,
  strong: 0.9,
  full: 1,
};

export const OPACITY_SCALE_KEYS = [
  "muted",
  "dimmed",
  "subtle",
  "strong",
  "full",
] as const satisfies readonly (keyof OpacityScale)[];

export function clampUnitOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_OPACITY_SCALE.full;
  return Math.min(1, Math.max(0, value));
}
