import { useMemo } from "react";
import { clampUnitOpacity } from "@/app/theme/pb-opacity-tokens";
import { resolveSpacingScaleFromSeeds, type StyleToolSeeds } from "@/app/theme/pb-style-suggest";
import { StyleFoundationCoreSections } from "./style-foundation-core-sections";
import { StyleFoundationMotionSections } from "./style-foundation-motion-sections";
import { StyleFoundationSpacingSections } from "./style-foundation-spacing-sections";
import type {
  BorderWidthKey,
  ContentWidthKey,
  DurationKey,
  EasingKey,
  OpacityKey,
  ShadowLevelKey,
  SpacingStepKey,
  StyleFoundationSlices,
  ZIndexKey,
} from "./style-foundation-slices-types";
import { SPACING_STEP_KEYS } from "./style-foundation-slices-types";

type Props = {
  seeds: StyleToolSeeds;
  foundationSlices: StyleFoundationSlices;
  onSeedsChange: (patch: Partial<StyleToolSeeds>) => void;
  onFoundationSlicesChange: (patch: Partial<StyleFoundationSlices>) => void;
};

function toFinite(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNonNegativeInt(value: string, fallback: number): number {
  return Math.max(0, Math.round(toFinite(value, fallback)));
}

function toSpacingOverrideRecord(
  overrides: StyleToolSeeds["spacingScale"] | undefined,
  resolved: ReturnType<typeof resolveSpacingScaleFromSeeds>
): Record<SpacingStepKey, string> {
  const out = {} as Record<SpacingStepKey, string>;
  for (const key of SPACING_STEP_KEYS) {
    out[key] = overrides?.[key] ?? resolved[key];
  }
  return out;
}

export type { StyleFoundationSlices } from "./style-foundation-slices-types";

export function StyleFoundationSlicesPanel({
  seeds,
  foundationSlices,
  onSeedsChange,
  onFoundationSlicesChange,
}: Props) {
  const spacingScale = useMemo(() => resolveSpacingScaleFromSeeds(seeds), [seeds]);
  const spacingOverrides = useMemo(
    () => toSpacingOverrideRecord(seeds.spacingScale, spacingScale),
    [seeds.spacingScale, spacingScale]
  );
  const spacingLocks: Partial<Record<SpacingStepKey, boolean>> = seeds.spacingScaleLocks ?? {};
  const breakpointWarning =
    foundationSlices.breakpoints.mobile >= foundationSlices.breakpoints.desktop;

  const onSpacingOverrideChange = (key: SpacingStepKey, value: string) =>
    onSeedsChange({ spacingScale: { ...spacingOverrides, [key]: value } });
  const onSpacingLockToggle = (key: SpacingStepKey) =>
    onSeedsChange({ spacingScaleLocks: { ...spacingLocks, [key]: spacingLocks[key] !== true } });
  const onShadowChange = (theme: "light" | "dark", key: ShadowLevelKey, value: string) =>
    onFoundationSlicesChange(
      theme === "light"
        ? { shadowScale: { ...foundationSlices.shadowScale, [key]: value } }
        : { shadowScaleDark: { ...foundationSlices.shadowScaleDark, [key]: value } }
    );
  const onBorderWidthChange = (key: BorderWidthKey, value: string) =>
    onFoundationSlicesChange({
      borderWidthScale: { ...foundationSlices.borderWidthScale, [key]: value },
    });
  const onContentWidthChange = (key: ContentWidthKey, value: string) =>
    onFoundationSlicesChange({
      contentWidths: { ...foundationSlices.contentWidths, [key]: value },
    });
  const onSectionMarginChange = (key: "none" | "xs" | "sm" | "md" | "lg" | "xl", value: string) =>
    onFoundationSlicesChange({
      sectionMarginScale: { ...foundationSlices.sectionMarginScale, [key]: value },
    });
  const onSectionMarginLockToggle = (key: "none" | "xs" | "sm" | "md" | "lg" | "xl") =>
    onFoundationSlicesChange({
      sectionMarginScaleLocks: {
        ...foundationSlices.sectionMarginScaleLocks,
        [key]: !foundationSlices.sectionMarginScaleLocks[key],
      },
    });
  const onBreakpointChange = (key: "mobile" | "desktop", value: string) =>
    onFoundationSlicesChange({
      breakpoints: {
        ...foundationSlices.breakpoints,
        [key]: toNonNegativeInt(value, foundationSlices.breakpoints[key]),
      },
    });
  const onDurationChange = (key: DurationKey, value: string) =>
    onFoundationSlicesChange({
      motion: {
        ...foundationSlices.motion,
        durations: {
          ...foundationSlices.motion.durations,
          [key]: toNonNegativeInt(value, foundationSlices.motion.durations[key]),
        },
      },
    });
  const onEasingChange = (key: EasingKey, value: string) =>
    onFoundationSlicesChange({
      motion: {
        ...foundationSlices.motion,
        easings: { ...foundationSlices.motion.easings, [key]: value },
      },
    });
  const onOpacityChange = (key: OpacityKey, value: string) =>
    onFoundationSlicesChange({
      opacityScale: {
        ...foundationSlices.opacityScale,
        [key]: clampUnitOpacity(toFinite(value, foundationSlices.opacityScale[key])),
      },
    });
  const onZIndexChange = (key: ZIndexKey, value: string) =>
    onFoundationSlicesChange({
      zIndexLayers: {
        ...foundationSlices.zIndexLayers,
        [key]: Math.round(toFinite(value, foundationSlices.zIndexLayers[key])),
      },
    });
  const onReduceMotionPolicyChange = (
    value: StyleFoundationSlices["motion"]["reduceMotionPolicy"]
  ) =>
    onFoundationSlicesChange({ motion: { ...foundationSlices.motion, reduceMotionPolicy: value } });
  const onStaggerStepChange = (value: string) =>
    onFoundationSlicesChange({
      motion: {
        ...foundationSlices.motion,
        staggerStep: toNonNegativeInt(value, foundationSlices.motion.staggerStep),
      },
    });

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/20 p-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Foundation slices
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Advanced controls for all persisted workbench tokens. Spacing and section-margin locks pin
          values while the rest remain derivation-driven.
        </p>
      </div>

      <StyleFoundationSpacingSections
        spacingScale={spacingScale}
        spacingOverrides={spacingOverrides}
        spacingLocks={spacingLocks}
        onSpacingOverrideChange={onSpacingOverrideChange}
        onSpacingLockToggle={onSpacingLockToggle}
        foundationSlices={foundationSlices}
        onSectionMarginChange={onSectionMarginChange}
        onSectionMarginLockToggle={onSectionMarginLockToggle}
      />
      <StyleFoundationCoreSections
        foundationSlices={foundationSlices}
        breakpointWarning={breakpointWarning}
        onShadowChange={onShadowChange}
        onBorderWidthChange={onBorderWidthChange}
        onContentWidthChange={onContentWidthChange}
        onBreakpointChange={onBreakpointChange}
      />
      <StyleFoundationMotionSections
        foundationSlices={foundationSlices}
        onReduceMotionPolicyChange={onReduceMotionPolicyChange}
        onStaggerStepChange={onStaggerStepChange}
        onDurationChange={onDurationChange}
        onEasingChange={onEasingChange}
        onOpacityChange={onOpacityChange}
        onZIndexChange={onZIndexChange}
      />
    </section>
  );
}
