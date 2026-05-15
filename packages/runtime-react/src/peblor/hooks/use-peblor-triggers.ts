"use client";

import { useMemo } from "react";
import type { bgBlock, SectionBlock } from "@pb/contracts/types";
import type { TriggerAction } from "@pb/contracts/types";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";
import { usePeblorOverrides } from "./use-peblor-overrides";
import { usePeblorTransitionState } from "./use-peblor-transition-state";
import { usePeblorTriggerListener } from "./use-peblor-trigger-listener";

export type PeblorTriggersParams = {
  resolvedBg: bgBlock | null;
  resolvedSections: SectionBlock[];
  onPageProgress?: TriggerAction;
  bgDefinitions?: Record<string, bgBlock>;
  transitions?: BackgroundTransitionEffect | BackgroundTransitionEffect[];
};

export type PeblorTriggersResult = {
  currentBg: bgBlock | null;
  sectionsWithOverrides: SectionBlock[];
  activeTransitionIds: Set<string>;
  reversingTransitionIds: Set<string>;
  transitionProgress: Map<string, number>;
  setActiveTransitionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setReversingTransitionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  transitionsArray: BackgroundTransitionEffect[];
};

/** Composes overrides, transition state, and trigger listener. Single place to wire peblor trigger behavior. */
export function usePeblorTriggers({
  resolvedBg,
  resolvedSections,
  onPageProgress,
  bgDefinitions,
  transitions,
}: PeblorTriggersParams): PeblorTriggersResult {
  const transitionsArray = useMemo(() => {
    const raw = transitions ? (Array.isArray(transitions) ? transitions : [transitions]) : [];
    const filtered = raw.filter((transition) => {
      const id = transition.id;
      return typeof id === "string" && id.trim().length > 0;
    });
    if (process.env.NODE_ENV === "development" && filtered.length !== raw.length) {
      console.warn(
        `[peblor] usePeblorTriggers: dropped ${raw.length - filtered.length} transition(s) with missing/empty id`
      );
    }
    return filtered;
  }, [transitions]);

  const { currentBg, sectionsWithOverrides, setOverrides } = usePeblorOverrides({
    resolvedBg,
    resolvedSections,
  });

  const {
    activeTransitionIds,
    reversingTransitionIds,
    transitionProgress,
    setActiveTransitionIds,
    setReversingTransitionIds,
    setTransitionProgress,
  } = usePeblorTransitionState({ transitionsArray, onPageProgress });

  usePeblorTriggerListener({
    setOverrides,
    setActiveTransitionIds,
    setReversingTransitionIds,
    setTransitionProgress,
    resolvedBg,
    bgDefinitions,
    transitionsArray,
  });

  return {
    currentBg,
    sectionsWithOverrides,
    activeTransitionIds,
    reversingTransitionIds,
    transitionProgress,
    setActiveTransitionIds,
    setReversingTransitionIds,
    transitionsArray,
  };
}
