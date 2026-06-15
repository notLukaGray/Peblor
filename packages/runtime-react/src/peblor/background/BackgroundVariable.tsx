"use client";

import type { bgBlock } from "@pb/contracts/types";
import { AnimatedBgVariableLayer } from "./AnimatedBgVariableLayer";
import { lowerThemeStringOrGradientToCss } from "@/peblor/theme/theme-string";

type Props = Extract<bgBlock, { type: "backgroundVariable" }>;
const THEMED_BACKGROUND_CLASS =
  "pointer-events-none fixed inset-0 z-[var(--pb-z-base)] [color-scheme:light] dark:[color-scheme:dark]";

/**
 * Page builder background: variable layers (fill, blend mode, opacity, motion).
 *
 * Each layer in the array is rendered as an `AnimatedBgVariableLayer`, which handles
 * both static CSS layers (no `motion` field) and fully animated layers (loop, entrance,
 * scroll, pointer, parallax, trigger — composable in any combination).
 */
export function BackgroundVariable({ layers }: Props) {
  if (!layers?.length) return null;

  return (
    <section className={THEMED_BACKGROUND_CLASS} aria-hidden>
      {layers.map((layer, i) => (
        <AnimatedBgVariableLayer
          key={i}
          fill={lowerThemeStringOrGradientToCss(layer.fill)}
          blendMode={layer.blendMode}
          opacity={layer.opacity}
          backgroundSize={layer.backgroundSize}
          backgroundPosition={layer.backgroundPosition}
          motion={layer.motion}
        />
      ))}
    </section>
  );
}
