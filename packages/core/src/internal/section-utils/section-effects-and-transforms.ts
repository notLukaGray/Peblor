import type { CSSProperties } from "react";
import { DEFAULT_BLEND_MODE } from "../section-constants";

const DEFAULT_BLEND = DEFAULT_BLEND_MODE;

export type ParallaxConfig = {
  scrollSpeed: number;
  defaultScrollSpeed: number;
  basePosition: number | null;
  sectionTop: number;
};

export function computeParallaxOffset(scrollTop: number, config: ParallaxConfig): number {
  const speedMultiplier = config.scrollSpeed - config.defaultScrollSpeed;
  if (config.basePosition !== null) {
    return -(scrollTop * speedMultiplier);
  }
  // Continuous: (scrollTop - sectionTop) * multiplier for all scroll. No gate so parallax runs from page start.
  return (scrollTop - config.sectionTop) * speedMultiplier;
}

export function getDefaultBlendMode(): string {
  return DEFAULT_BLEND;
}

export function buildTransformString(
  existingTransform?: string,
  parallaxY?: number
): string | undefined {
  const transformParts: string[] = [];

  if (existingTransform) transformParts.push(existingTransform);

  if (parallaxY !== undefined && parallaxY !== 0) {
    transformParts.push(`translateY(${parallaxY}px)`);
  }

  return transformParts.length > 0 ? transformParts.join(" ") : undefined;
}

export function borderToCss(border?: {
  width?: string;
  style?: string;
  color?: string;
}): string | undefined {
  if (!border) return undefined;
  const width = border.width ?? "1px";
  const style = border.style ?? "solid";
  const color = border.color ?? "#000";
  return `${width} ${style} ${color}`;
}

export function castBlendMode(blendMode?: string): CSSProperties["mixBlendMode"] {
  return (blendMode ?? DEFAULT_BLEND) as CSSProperties["mixBlendMode"];
}
