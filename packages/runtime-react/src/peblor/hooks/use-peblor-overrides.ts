"use client";

import { useState, useMemo } from "react";
import type { bgBlock, SectionBlock } from "@pb/contracts/types";
import { OVERRIDE_KEY_BG } from "@pb/contracts/peblor/core/trigger-action-types";
import { applyElementOverrides, isBgBlockPayload, type OverridesMap } from "@pb/core/overrides";

export type UsePeblorOverridesParams = {
  resolvedBg: bgBlock | null;
  resolvedSections: SectionBlock[];
};

export type UsePeblorOverridesResult = {
  currentBg: bgBlock | null;
  sectionsWithOverrides: SectionBlock[];
  setOverrides: React.Dispatch<React.SetStateAction<OverridesMap>>;
};

export function usePeblorOverrides({
  resolvedBg,
  resolvedSections,
}: UsePeblorOverridesParams): UsePeblorOverridesResult {
  const [overrides, setOverrides] = useState<OverridesMap>({});

  const currentBg = useMemo(
    () =>
      overrides[OVERRIDE_KEY_BG] != null && isBgBlockPayload(overrides[OVERRIDE_KEY_BG])
        ? (overrides[OVERRIDE_KEY_BG] as bgBlock)
        : resolvedBg,
    [overrides, resolvedBg]
  );

  const sectionsWithOverrides = useMemo(
    () => applyElementOverrides(resolvedSections, overrides),
    [resolvedSections, overrides]
  );

  return { currentBg, sectionsWithOverrides, setOverrides };
}
