"use client";

import { createElement, memo, useCallback, useMemo, type ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import dynamic from "next/dynamic";
import type { bgBlock, BackgroundTransitionEffect } from "@pb/contracts/types";
import { BG_COMPONENTS, isKnownBgType } from "@/peblor/background";

const BackgroundTransitionEffectComponent = dynamic(
  () =>
    import("./BackgroundTransitionEffect").then((m) => ({
      default: m.BackgroundTransitionEffect,
    })),
  { loading: () => null }
);

/** Stable no-op for scroll-driven transitions (reverse completion unused). */
const scrollTransitionReverseComplete = () => {};

export type PeblorBackgroundProps = {
  bg: bgBlock | null;
  transitionsArray: BackgroundTransitionEffect[];
  activeTransitionIds: Set<string>;
  reversingTransitionIds: Set<string>;
  transitionProgress: Map<string, number>;
  resolvedTransitionBackgrounds: Map<string, { fromBg: bgBlock | null; toBg: bgBlock | null }>;
  setActiveTransitionIds: Dispatch<SetStateAction<Set<string>>>;
  setReversingTransitionIds: Dispatch<SetStateAction<Set<string>>>;
};

type NonScrollTransitionItemProps = {
  transition: BackgroundTransitionEffect;
  fromBg: bgBlock | null;
  toBg: bgBlock | null;
  isReversing: boolean;
  setActiveTransitionIds: Dispatch<SetStateAction<Set<string>>>;
  setReversingTransitionIds: Dispatch<SetStateAction<Set<string>>>;
};

const NonScrollTransitionItem = memo((props: NonScrollTransitionItemProps) => {
  const {
    transition,
    fromBg,
    toBg,
    isReversing,
    setActiveTransitionIds,
    setReversingTransitionIds,
  } = props;
  const transitionId = transition.id;
  const onReverseComplete = useCallback(() => {
    if (transition.type !== "TRIGGER") {
      setActiveTransitionIds((prev) => {
        const next = new Set(prev);
        next.delete(transitionId);
        return next;
      });
    }
    setReversingTransitionIds((prev) => {
      const next = new Set(prev);
      next.delete(transitionId);
      return next;
    });
  }, [transition.type, transitionId, setActiveTransitionIds, setReversingTransitionIds]);

  return (
    <BackgroundTransitionEffectComponent
      effect={transition}
      fromBg={fromBg}
      toBg={toBg}
      transitionId={transitionId}
      isReversing={isReversing}
      onReverseComplete={onReverseComplete}
    />
  );
});

NonScrollTransitionItem.displayName = "NonScrollTransitionItem";

/** Renders the correct background or transition based on transition state. Presentational. */
export function PeblorBackground({
  bg,
  transitionsArray,
  activeTransitionIds,
  reversingTransitionIds,
  transitionProgress,
  resolvedTransitionBackgrounds,
  setActiveTransitionIds,
  setReversingTransitionIds,
}: PeblorBackgroundProps): ReactNode {
  const showBg = !!bg;
  const BgComponent = bg && isKnownBgType(bg.type) ? BG_COMPONENTS[bg.type] : null;

  const mainBgProps = bg ? { ...bg, priority: true as const } : null;

  const activeNonScroll = useMemo(
    () => transitionsArray.filter((t) => t.type !== "SCROLL" && activeTransitionIds.has(t.id)),
    [transitionsArray, activeTransitionIds]
  );
  const scrollTransition = useMemo(
    () => transitionsArray.find((t) => t.type === "SCROLL"),
    [transitionsArray]
  );
  const scrollTransitionId = scrollTransition?.id ?? null;
  const hasScrollProgress = useMemo(
    () => scrollTransitionId != null && transitionProgress.has(scrollTransitionId),
    [scrollTransitionId, transitionProgress]
  );

  if (activeNonScroll.length > 0) {
    return activeNonScroll.map((transition) => {
      const transitionId = transition.id;
      const backgrounds = resolvedTransitionBackgrounds.get(transitionId);
      if (!backgrounds) return null;
      return (
        <NonScrollTransitionItem
          key={`transition-${transitionId}`}
          transition={transition}
          fromBg={backgrounds.fromBg}
          toBg={backgrounds.toBg}
          isReversing={reversingTransitionIds.has(transitionId)}
          setActiveTransitionIds={setActiveTransitionIds}
          setReversingTransitionIds={setReversingTransitionIds}
        />
      );
    });
  }

  if (scrollTransition && scrollTransitionId != null && hasScrollProgress) {
    const backgrounds = resolvedTransitionBackgrounds.get(scrollTransitionId);
    const p = transitionProgress.get(scrollTransitionId) ?? 0;
    if (backgrounds) {
      const effectWithProgress = {
        ...scrollTransition,
        progress: p,
      } as BackgroundTransitionEffect;
      return (
        <BackgroundTransitionEffectComponent
          key={`transition-${scrollTransitionId}`}
          effect={effectWithProgress}
          fromBg={backgrounds.fromBg}
          toBg={backgrounds.toBg}
          transitionId={scrollTransitionId}
          isReversing={false}
          onReverseComplete={scrollTransitionReverseComplete}
        />
      );
    }
  }

  return showBg && BgComponent && mainBgProps
    ? createElement(BgComponent, mainBgProps as bgBlock)
    : null;
}
