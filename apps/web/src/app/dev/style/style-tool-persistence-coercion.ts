import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import { emptyLocks, PB_GUIDELINE_KEYS, type StyleToolSeeds } from "@/app/theme/pb-style-suggest";
import { DEFAULT_MOTION_FOUNDATIONS } from "@/app/theme/pb-motion-tokens";
import {
  DEFAULT_BORDER_WIDTH_SCALE,
  DEFAULT_CONTENT_WIDTH_PRESETS,
  deriveSectionMarginScale,
  deriveSpacingScale,
} from "@/app/theme/pb-spacing-tokens";
import { DEFAULT_SHADOW_SCALE, DEFAULT_SHADOW_SCALE_DARK } from "@/app/theme/pb-shadow-tokens";
import { DEFAULT_OPACITY_SCALE } from "@/app/theme/pb-opacity-tokens";
import { DEFAULT_BREAKPOINTS } from "@/app/theme/pb-breakpoint-tokens";
import { DEFAULT_Z_INDEX_LAYERS } from "@/app/theme/pb-z-index-layers";
import {
  createNeutralStyleGuidelines,
  DEV_NEUTRAL_STYLE_SEEDS,
} from "@/app/dev/style/style-tool-baseline";
import {
  BORDER_WIDTH_KEYS,
  CONTENT_WIDTH_KEYS,
  SECTION_MARGIN_KEYS,
  SHADOW_SCALE_KEYS,
  SPACING_SCALE_KEYS,
  STYLE_TOOL_LEGACY_STORAGE_KEY_V1,
  STYLE_TOOL_LEGACY_STORAGE_KEY_V2,
  type StyleToolPersistedV2,
  type StyleToolPersistedV3,
} from "@/app/dev/style/style-tool-persistence-types";
import {
  coerceBreakpoints,
  coerceMotionFoundations,
  coerceOpacityScale,
  coerceZIndexLayers,
  pickBoolLocks,
  pickStringMap,
  toSpacingSeedLocks,
  toSpacingSeedScale,
} from "@/app/dev/style/style-tool-persistence-coercion-helpers";

export function fillRequiredGuidelineDefaults(
  guidelines: PbContentGuidelines
): PbContentGuidelines {
  const baseline = createNeutralStyleGuidelines();
  const out = { ...guidelines };
  const pick = <K extends keyof PbContentGuidelines>(key: K) => {
    const value = out[key];
    if (value == null || (typeof value === "string" && value.trim() === "")) {
      (out as Record<string, unknown>)[key] = baseline[key];
    }
  };
  pick("frameJustifyContentDefault");
  pick("framePaddingDefault");
  pick("frameFlexWrapDefault");
  pick("frameBorderRadiusDefault");
  pick("richTextCodeBorderRadius");
  pick("buttonNakedBorderRadius");
  return out;
}

function readStyleFromV2Raw(raw: string): StyleToolPersistedV2 | null {
  const data = JSON.parse(raw) as Partial<StyleToolPersistedV2>;
  if (data.v !== 2 || !data.seeds || !data.locks || !data.guidelines) return null;
  const locks = { ...emptyLocks(), ...data.locks } as Record<keyof PbContentGuidelines, boolean>;
  return {
    v: 2,
    seeds: { ...DEV_NEUTRAL_STYLE_SEEDS, ...data.seeds },
    locks,
    guidelines: fillRequiredGuidelineDefaults({
      ...createNeutralStyleGuidelines(),
      ...data.guidelines,
    } as PbContentGuidelines),
  };
}

function readStyleFromV3Raw(raw: string): StyleToolPersistedV3 | null {
  const data = JSON.parse(raw) as Partial<StyleToolPersistedV3>;
  if (data.v !== 3 || !data.seeds || !data.locks || !data.guidelines) return null;

  const baseRem =
    typeof data.seeds.spacingBaseRem === "number" && Number.isFinite(data.seeds.spacingBaseRem)
      ? data.seeds.spacingBaseRem
      : DEV_NEUTRAL_STYLE_SEEDS.spacingBaseRem;
  const derivedSpacingScale = deriveSpacingScale(baseRem);
  const spacingScale = pickStringMap(SPACING_SCALE_KEYS, data.spacingScale, derivedSpacingScale);
  const spacingScaleLocks = pickBoolLocks(SPACING_SCALE_KEYS, data.spacingScaleLocks);
  const sectionMarginFallback = deriveSectionMarginScale(spacingScale);
  const sectionMarginScale = pickStringMap(
    SECTION_MARGIN_KEYS,
    data.sectionMarginScale,
    sectionMarginFallback
  );
  const sectionMarginScaleLocks = pickBoolLocks(SECTION_MARGIN_KEYS, data.sectionMarginScaleLocks);
  const seeds: StyleToolSeeds = {
    ...DEV_NEUTRAL_STYLE_SEEDS,
    ...data.seeds,
    spacingScale: toSpacingSeedScale(spacingScale),
    spacingScaleLocks: toSpacingSeedLocks(spacingScaleLocks),
  };
  return {
    v: 3,
    seeds,
    locks: { ...emptyLocks(), ...data.locks } as Record<keyof PbContentGuidelines, boolean>,
    guidelines: fillRequiredGuidelineDefaults({
      ...createNeutralStyleGuidelines(),
      ...data.guidelines,
    } as PbContentGuidelines),
    spacingScale,
    spacingScaleLocks,
    shadowScale: pickStringMap(SHADOW_SCALE_KEYS, data.shadowScale, DEFAULT_SHADOW_SCALE),
    shadowScaleDark: pickStringMap(
      SHADOW_SCALE_KEYS,
      data.shadowScaleDark,
      DEFAULT_SHADOW_SCALE_DARK
    ),
    borderWidthScale: pickStringMap(
      BORDER_WIDTH_KEYS,
      data.borderWidthScale,
      DEFAULT_BORDER_WIDTH_SCALE
    ),
    motion: coerceMotionFoundations(data.motion),
    breakpoints: coerceBreakpoints(data.breakpoints),
    contentWidths: pickStringMap(
      CONTENT_WIDTH_KEYS,
      data.contentWidths,
      DEFAULT_CONTENT_WIDTH_PRESETS
    ),
    sectionMarginScale,
    sectionMarginScaleLocks,
    opacityScale: coerceOpacityScale(data.opacityScale),
    zIndexLayers: coerceZIndexLayers(data.zIndexLayers),
  };
}

export function coerceStyleToolV2toV3(v2: StyleToolPersistedV2): StyleToolPersistedV3 {
  const baseRem =
    typeof v2.seeds.spacingBaseRem === "number" && Number.isFinite(v2.seeds.spacingBaseRem)
      ? v2.seeds.spacingBaseRem
      : DEV_NEUTRAL_STYLE_SEEDS.spacingBaseRem;
  const spacingScale = deriveSpacingScale(baseRem);
  const spacingScaleLocks = pickBoolLocks(SPACING_SCALE_KEYS, undefined);
  const sectionMarginScale = deriveSectionMarginScale(spacingScale);
  const sectionMarginScaleLocks = pickBoolLocks(SECTION_MARGIN_KEYS, undefined);
  return {
    v: 3,
    seeds: {
      ...v2.seeds,
      spacingScale: toSpacingSeedScale(spacingScale),
      spacingScaleLocks: toSpacingSeedLocks(spacingScaleLocks),
    },
    locks: { ...v2.locks },
    guidelines: fillRequiredGuidelineDefaults(v2.guidelines),
    spacingScale,
    spacingScaleLocks,
    shadowScale: { ...DEFAULT_SHADOW_SCALE },
    shadowScaleDark: { ...DEFAULT_SHADOW_SCALE_DARK },
    borderWidthScale: { ...DEFAULT_BORDER_WIDTH_SCALE },
    motion: {
      durations: { ...DEFAULT_MOTION_FOUNDATIONS.durations },
      easings: { ...DEFAULT_MOTION_FOUNDATIONS.easings },
      staggerStep: DEFAULT_MOTION_FOUNDATIONS.staggerStep,
      reduceMotionPolicy: DEFAULT_MOTION_FOUNDATIONS.reduceMotionPolicy,
    },
    breakpoints: { ...DEFAULT_BREAKPOINTS },
    contentWidths: { ...DEFAULT_CONTENT_WIDTH_PRESETS },
    sectionMarginScale,
    sectionMarginScaleLocks,
    opacityScale: { ...DEFAULT_OPACITY_SCALE },
    zIndexLayers: { ...DEFAULT_Z_INDEX_LAYERS },
  };
}

function readLegacyV2(): StyleToolPersistedV3 | null {
  const raw = localStorage.getItem(STYLE_TOOL_LEGACY_STORAGE_KEY_V2);
  if (!raw) return null;
  const parsedV3 = readStyleFromV3Raw(raw);
  if (parsedV3) return parsedV3;
  const parsedV2 = readStyleFromV2Raw(raw);
  return parsedV2 ? coerceStyleToolV2toV3(parsedV2) : null;
}

function readLegacyV1(): StyleToolPersistedV3 | null {
  const raw = localStorage.getItem(STYLE_TOOL_LEGACY_STORAGE_KEY_V1);
  if (!raw) return null;
  const flat = JSON.parse(raw) as Partial<PbContentGuidelines>;
  const guidelines = fillRequiredGuidelineDefaults({
    ...createNeutralStyleGuidelines(),
    ...flat,
  } as PbContentGuidelines);
  const v2: StyleToolPersistedV2 = {
    v: 2,
    seeds: { ...DEV_NEUTRAL_STYLE_SEEDS },
    locks: Object.fromEntries(PB_GUIDELINE_KEYS.map((key) => [key, true])) as Record<
      keyof PbContentGuidelines,
      boolean
    >,
    guidelines,
  };
  return coerceStyleToolV2toV3(v2);
}

/** Read style tool state from pre-workbench localStorage keys only. */
export function readStyleToolFromLegacyLocalStorage(): StyleToolPersistedV3 | null {
  if (typeof window === "undefined") return null;
  try {
    return readLegacyV2() ?? readLegacyV1() ?? null;
  } catch {
    return null;
  }
}

export function coerceStyleToolPersisted(data: unknown): StyleToolPersistedV3 | null {
  if (!data || typeof data !== "object") return null;
  try {
    const raw = JSON.stringify(data);
    const v3 = readStyleFromV3Raw(raw);
    if (v3) return v3;
    const v2 = readStyleFromV2Raw(raw);
    return v2 ? coerceStyleToolV2toV3(v2) : null;
  } catch {
    return null;
  }
}
