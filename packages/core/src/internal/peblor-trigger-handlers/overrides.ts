import type React from "react";
import type {
  BackgroundSwitchAction,
  ContentOverrideAction,
  bgBlock,
} from "@pb/contracts/peblor/core/peblor-schemas";
import { OVERRIDE_KEY_BG } from "@pb/contracts/peblor/core/trigger-action-types";
import { isBgBlockPayload, type OverridesMap } from "../peblor-overrides";
import { computeBgProgressOverrides } from "./context-and-bg-progress";

export function createBgTransitionProgressOverrideHandler(
  resolvedBg: bgBlock | null,
  lastProgressRef: { current: number | null },
  setOverrides: React.Dispatch<React.SetStateAction<OverridesMap>>
) {
  return (progress: number) => {
    if (lastProgressRef.current === null || Math.abs(progress - lastProgressRef.current) > 0.001) {
      lastProgressRef.current = progress;
      setOverrides((prev) => {
        const next = computeBgProgressOverrides(prev, resolvedBg, progress);
        return next ?? prev;
      });
    }
  };
}

export function createContentOverrideHandler(
  setOverrides: React.Dispatch<React.SetStateAction<OverridesMap>>
) {
  return (action: ContentOverrideAction) => {
    const { key, value } = action.payload;
    if (key) setOverrides((prev) => ({ ...prev, [key]: value }));
  };
}

export function createBackgroundSwitchHandler(
  bgDefinitions: Record<string, bgBlock> | undefined,
  setOverrides: React.Dispatch<React.SetStateAction<OverridesMap>>
) {
  return (action: BackgroundSwitchAction) => {
    if (typeof action.payload === "string" && bgDefinitions) {
      const bgKey = action.payload;
      const bgFromDefs = bgDefinitions[bgKey];
      if (bgFromDefs && isBgBlockPayload(bgFromDefs)) {
        setOverrides((prev) => ({ ...prev, [OVERRIDE_KEY_BG]: bgFromDefs as bgBlock }));
      }
      return;
    }
    if (isBgBlockPayload(action.payload)) {
      const payload = action.payload as bgBlock;
      setOverrides((prev) => ({ ...prev, [OVERRIDE_KEY_BG]: { ...payload } }));
    }
  };
}
