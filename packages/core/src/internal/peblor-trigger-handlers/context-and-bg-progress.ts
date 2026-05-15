import type React from "react";
import type { bgBlock } from "@pb/contracts/types";
import { OVERRIDE_KEY_BG } from "@pb/contracts/peblor/core/peblor-schemas";
import type { BackgroundTransitionEffect } from "@pb/contracts/types";
import type { OverridesMap } from "../peblor-overrides";

export type TriggerHandlerContext = {
  setOverrides: React.Dispatch<React.SetStateAction<OverridesMap>>;
  setActiveTransitionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setReversingTransitionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setTransitionProgress: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  resolvedBg: bgBlock | null;
  bgDefinitions?: Record<string, bgBlock>;
  transitionsArray: BackgroundTransitionEffect[];
  lastProgressRef: { current: number | null };
  lastTriggerTimeRef: { current: Map<string, number> };
  dispatchStart: (transitionId: string, forward: boolean) => void;
  dispatchUpdateProgress: (transitionId: string, progressValue: number) => void;
};

export function computeBgProgressOverrides(
  prev: OverridesMap,
  resolvedBg: bgBlock | null,
  progress: number
): OverridesMap | null {
  const currentBg = prev[OVERRIDE_KEY_BG] as (bgBlock & { progress?: number }) | undefined;
  const baseBg = currentBg || resolvedBg;
  if (
    !baseBg ||
    typeof baseBg !== "object" ||
    !("type" in baseBg) ||
    baseBg.type !== "backgroundTransition"
  ) {
    return null;
  }
  const bgTransition = baseBg as bgBlock & { progress?: number };
  if (bgTransition.progress === progress) return null;
  return { ...prev, [OVERRIDE_KEY_BG]: { ...baseBg, progress } };
}
