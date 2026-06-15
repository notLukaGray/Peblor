"use client";

import { createElement } from "react";
import type { CSSProperties } from "react";
import type { bgBlock } from "@pb/contracts/types";
import { BG_COMPONENTS, isKnownBgType } from "@/peblor/background";
import { globals } from "@pb/runtime-react/core/lib/globals";

type Props = {
  fromBg: bgBlock | null;
  toBg: bgBlock | null;
  fromOpacity: number;
  toOpacity: number;
  transitionStyle: CSSProperties;
};

function BackgroundLayer({
  bg,
  opacity,
  zIndex,
  transitionStyle,
}: {
  bg: bgBlock;
  opacity: number;
  zIndex: number;
  transitionStyle: CSSProperties;
}) {
  const Component = isKnownBgType(bg.type) ? BG_COMPONENTS[bg.type] : null;
  if (!Component) return null;

  const safeOpacity = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        pointerEvents: "none",
        opacity: safeOpacity,
        ...transitionStyle,
      }}
      aria-hidden
    >
      {createElement(Component, bg)}
    </div>
  );
}

function BackgroundFallback({ bg }: { bg: bgBlock }) {
  const Component = isKnownBgType(bg.type) ? BG_COMPONENTS[bg.type] : null;
  if (!Component) return null;
  return (
    <section className="pointer-events-none fixed inset-0 z-[var(--pb-z-base)]" aria-hidden>
      {createElement(Component, bg)}
    </section>
  );
}

export function BackgroundTransitionEffectLayers({
  fromBg,
  toBg,
  fromOpacity,
  toOpacity,
  transitionStyle,
}: Props) {
  const hasFrom = !!fromBg && isKnownBgType(fromBg.type);
  const hasTo = !!toBg && isKnownBgType(toBg.type);

  if (!hasFrom || !hasTo) {
    if (hasFrom && fromBg) return <BackgroundFallback bg={fromBg} />;
    if (hasTo && toBg) return <BackgroundFallback bg={toBg} />;
    return null;
  }

  return (
    <>
      {fromBg && (
        <BackgroundLayer
          bg={fromBg}
          opacity={fromOpacity}
          zIndex={globals.zIndexBase}
          transitionStyle={transitionStyle}
        />
      )}
      {toBg && (
        <BackgroundLayer
          bg={toBg}
          opacity={toOpacity}
          zIndex={globals.zIndexRaised}
          transitionStyle={transitionStyle}
        />
      )}
    </>
  );
}
