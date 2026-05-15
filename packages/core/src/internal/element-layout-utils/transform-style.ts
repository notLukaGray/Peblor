import type { CSSProperties } from "react";

export type ElementLayoutTransformOptions = {
  width?: string;
  height?: string;
  align?: "left" | "center" | "right";
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  rotate?: number | string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
};

function resolveRotate(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") return `${value}deg`;
  return String(value);
}

export function getElementTransformStyle(
  options: ElementLayoutTransformOptions | undefined
): CSSProperties {
  if (!options) return {};
  const rotateDeg = resolveRotate(options.rotate);
  const parts: string[] = [];
  if (rotateDeg) parts.push(`rotate(${rotateDeg})`);
  if (options.flipHorizontal) parts.push("scaleX(-1)");
  if (options.flipVertical) parts.push("scaleY(-1)");
  if (parts.length === 0) return {};
  return {
    transform: parts.join(" "),
    width: "100%",
    height: "100%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

/**
 * Rotate + flip only (no flex fill shell). Use on typography / inline layout wrappers so
 * `elementLayoutSchema` flip/rotate fields render in the Peblor.
 */
export function getLayoutRotateFlipStyle(
  options:
    | Pick<ElementLayoutTransformOptions, "rotate" | "flipHorizontal" | "flipVertical">
    | undefined
): CSSProperties {
  if (!options) return {};
  const rotateDeg = resolveRotate(options.rotate);
  const parts: string[] = [];
  if (rotateDeg) parts.push(`rotate(${rotateDeg})`);
  if (options.flipHorizontal) parts.push("scaleX(-1)");
  if (options.flipVertical) parts.push("scaleY(-1)");
  if (parts.length === 0) return {};
  return { transform: parts.join(" ") };
}
