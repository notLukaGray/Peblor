"use client";

import { useEffect, useMemo } from "react";
import type { BackgroundTransitionEffect, bgBlock } from "@pb/contracts/types";
import { usePeblorTriggers } from "../hooks/use-peblor-triggers";
import { PeblorBackground } from "../PeblorBackground";

export function ClientBackgroundTransitionRuntime({
  resolvedBg,
  bgDefinitions,
  transitions,
  onReady,
}: {
  resolvedBg: bgBlock | null;
  bgDefinitions?: Record<string, bgBlock>;
  transitions: BackgroundTransitionEffect | BackgroundTransitionEffect[];
  onReady?: () => void;
}) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  const {
    currentBg,
    activeTransitionIds,
    reversingTransitionIds,
    transitionProgress,
    setActiveTransitionIds,
    setReversingTransitionIds,
    transitionsArray,
  } = usePeblorTriggers({
    resolvedBg,
    resolvedSections: [],
    bgDefinitions,
    transitions,
  });

  const resolvedTransitionBackgrounds = useMemo(() => {
    if (transitionsArray.length === 0 || !bgDefinitions) {
      return new Map<string, { fromBg: bgBlock | null; toBg: bgBlock | null }>();
    }

    const resolved = new Map<string, { fromBg: bgBlock | null; toBg: bgBlock | null }>();
    for (const transition of transitionsArray) {
      resolved.set(transition.id, {
        fromBg: bgDefinitions[transition.from] ?? null,
        toBg: bgDefinitions[transition.to] ?? null,
      });
    }
    return resolved;
  }, [transitionsArray, bgDefinitions]);

  return (
    <PeblorBackground
      bg={currentBg}
      transitionsArray={transitionsArray}
      activeTransitionIds={activeTransitionIds}
      reversingTransitionIds={reversingTransitionIds}
      transitionProgress={transitionProgress}
      resolvedTransitionBackgrounds={resolvedTransitionBackgrounds}
      setActiveTransitionIds={setActiveTransitionIds}
      setReversingTransitionIds={setReversingTransitionIds}
    />
  );
}
