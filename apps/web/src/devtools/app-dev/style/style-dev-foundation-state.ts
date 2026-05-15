import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import { deriveSectionMarginScale, type SectionMarginScale } from "@/app/theme/pb-spacing-tokens";
import { resolveSpacingScaleFromSeeds, type StyleToolSeeds } from "@/app/theme/pb-style-suggest";
import type { StyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";
import type { StyleFoundationSlices } from "./style-foundation-slices-types";

function mergeSectionMarginsWithLocks(
  previous: Pick<StyleToolPersistedV3, "sectionMarginScale" | "sectionMarginScaleLocks">,
  spacingScale: StyleToolPersistedV3["spacingScale"]
): SectionMarginScale {
  const derived = deriveSectionMarginScale(spacingScale);
  for (const key of Object.keys(derived) as (keyof SectionMarginScale)[]) {
    if (previous.sectionMarginScaleLocks[key]) {
      derived[key] = previous.sectionMarginScale[key];
    }
  }
  return derived;
}

function toSpacingLocks(
  seedLocks: StyleToolSeeds["spacingScaleLocks"]
): StyleToolPersistedV3["spacingScaleLocks"] {
  const out: StyleToolPersistedV3["spacingScaleLocks"] = {
    none: false,
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
    "2xl": false,
    "3xl": false,
    "4xl": false,
  };
  for (const key of ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const) {
    out[key] = seedLocks?.[key] === true;
  }
  return out;
}

export function pickFoundationSlices(style: StyleToolPersistedV3): StyleFoundationSlices {
  return {
    shadowScale: style.shadowScale,
    shadowScaleDark: style.shadowScaleDark,
    borderWidthScale: style.borderWidthScale,
    motion: style.motion,
    breakpoints: style.breakpoints,
    contentWidths: style.contentWidths,
    sectionMarginScale: style.sectionMarginScale,
    sectionMarginScaleLocks: style.sectionMarginScaleLocks,
    opacityScale: style.opacityScale,
    zIndexLayers: style.zIndexLayers,
  };
}

type BuildStyleToolPersistedInput = {
  seeds: StyleToolSeeds;
  locks: Record<keyof PbContentGuidelines, boolean>;
  guidelines: PbContentGuidelines;
  foundationSlices: StyleFoundationSlices;
};

export function buildStyleToolPersisted({
  seeds,
  locks,
  guidelines,
  foundationSlices,
}: BuildStyleToolPersistedInput): StyleToolPersistedV3 {
  const spacingScale = resolveSpacingScaleFromSeeds(seeds);
  const sectionMarginScale = mergeSectionMarginsWithLocks(
    {
      sectionMarginScale: foundationSlices.sectionMarginScale,
      sectionMarginScaleLocks: foundationSlices.sectionMarginScaleLocks,
    },
    spacingScale
  );
  return {
    v: 3,
    seeds,
    locks,
    guidelines,
    spacingScale,
    spacingScaleLocks: toSpacingLocks(seeds.spacingScaleLocks),
    shadowScale: foundationSlices.shadowScale,
    shadowScaleDark: foundationSlices.shadowScaleDark,
    borderWidthScale: foundationSlices.borderWidthScale,
    motion: foundationSlices.motion,
    breakpoints: foundationSlices.breakpoints,
    contentWidths: foundationSlices.contentWidths,
    sectionMarginScale,
    sectionMarginScaleLocks: foundationSlices.sectionMarginScaleLocks,
    opacityScale: foundationSlices.opacityScale,
    zIndexLayers: foundationSlices.zIndexLayers,
  };
}
