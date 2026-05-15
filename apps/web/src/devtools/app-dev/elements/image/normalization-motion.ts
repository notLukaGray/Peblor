import type {
  PbImageAnimationDefaults,
  PbImageAnimationFineTune,
  PbImageEntranceFineTune,
  PbImageExitFineTune,
  PbImageHybridStackPreset,
  PbImageSideAnimationBehavior,
} from "@/app/theme/pb-builder-defaults";
import { DIRECTION_OPTIONS, HYBRID_STACK_OPTIONS } from "@/app/dev/elements/image/constants";
import { clampNumber } from "@/app/dev/elements/image/utils";
import { normalizeCurve, toFiniteNumber, toNonNegativeNumber } from "./normalization-value-utils";

type LegacyFineTuneFields = {
  hybridDuration?: number;
  hybridComposition?: "ordered" | "layered";
};

function isHybridStackPreset(value: unknown): value is PbImageHybridStackPreset {
  return typeof value === "string" && (HYBRID_STACK_OPTIONS as readonly string[]).includes(value);
}

function isSideBehavior(value: unknown): value is PbImageSideAnimationBehavior {
  return value === "preset" || value === "hybrid" || value === "custom";
}

function normalizeDirection(value: unknown, fallback: PbImageEntranceFineTune["direction"]) {
  return value && DIRECTION_OPTIONS.includes(value as PbImageEntranceFineTune["direction"])
    ? (value as PbImageEntranceFineTune["direction"])
    : fallback;
}

function normalizeHybridStack(
  seed: PbImageHybridStackPreset[],
  incomingList: unknown,
  legacySingle: unknown
): PbImageHybridStackPreset[] {
  if (Array.isArray(incomingList)) {
    const filtered = incomingList.filter(isHybridStackPreset);
    if (filtered.length > 0) return filtered;
  }
  if (isHybridStackPreset(legacySingle)) return [legacySingle];
  return seed.length > 0 ? seed : ["none"];
}

function normalizeOptionalPresetDuration(
  seed: number | undefined,
  incoming: unknown
): number | undefined {
  if (incoming === null || incoming === "") return undefined;
  const parsed = toFiniteNumber(incoming, Number.NaN);
  if (Number.isNaN(parsed)) return seed;
  return Math.max(0.05, parsed);
}

function resolveBehavior(
  incoming: unknown,
  fallback: PbImageSideAnimationBehavior
): PbImageSideAnimationBehavior {
  return isSideBehavior(incoming) ? incoming : fallback;
}

function resolveHybridCompositionIn(
  incoming: Partial<PbImageAnimationFineTune> | undefined,
  legacyComposition: LegacyFineTuneFields["hybridComposition"],
  seed: PbImageAnimationFineTune
): PbImageAnimationFineTune["hybridCompositionIn"] {
  if (incoming?.hybridCompositionIn === "layered" || incoming?.hybridCompositionIn === "ordered") {
    return incoming.hybridCompositionIn;
  }
  if (legacyComposition === "layered" || legacyComposition === "ordered") {
    return legacyComposition;
  }
  return seed.hybridCompositionIn;
}

function resolveHybridDuration(
  incomingDuration: unknown,
  legacyDuration: number | undefined,
  seedDuration: number
): number {
  const parsedIncoming = toFiniteNumber(incomingDuration, Number.NaN);
  const fallback = legacyDuration ?? seedDuration;
  return Math.max(0.05, Number.isNaN(parsedIncoming) ? fallback : parsedIncoming);
}

function normalizeStepDurations(incoming: unknown, seed: number[]): number[] {
  if (!Array.isArray(incoming)) return seed;
  return incoming.map((entry) => {
    const parsed = toFiniteNumber(entry, Number.NaN);
    return Number.isNaN(parsed) ? 0.2 : Math.max(0.01, parsed);
  });
}

function normalizeEntranceFineTune(
  seed: PbImageEntranceFineTune,
  incoming?: Partial<PbImageEntranceFineTune>
): PbImageEntranceFineTune {
  const source = { ...seed, ...(incoming ?? {}) };
  return {
    direction: normalizeDirection(source.direction, seed.direction),
    distancePx: toNonNegativeNumber(source.distancePx, seed.distancePx),
    fromOpacity: clampNumber(toFiniteNumber(source.fromOpacity, seed.fromOpacity), 0, 1),
    toOpacity: clampNumber(toFiniteNumber(source.toOpacity, seed.toOpacity), 0, 1),
    fromX: toFiniteNumber(source.fromX, seed.fromX),
    toX: toFiniteNumber(source.toX, seed.toX),
    fromY: toFiniteNumber(source.fromY, seed.fromY),
    toY: toFiniteNumber(source.toY, seed.toY),
    fromScale: Math.max(0, toFiniteNumber(source.fromScale, seed.fromScale)),
    toScale: Math.max(0, toFiniteNumber(source.toScale, seed.toScale)),
    fromRotate: toFiniteNumber(source.fromRotate, seed.fromRotate),
    toRotate: toFiniteNumber(source.toRotate, seed.toRotate),
    duration: toNonNegativeNumber(source.duration, seed.duration),
    delay: toNonNegativeNumber(source.delay, seed.delay),
    curve: normalizeCurve(seed.curve, incoming?.curve),
  };
}

function normalizeExitFineTune(
  seed: PbImageExitFineTune,
  incoming?: Partial<PbImageExitFineTune>
): PbImageExitFineTune {
  const source = { ...seed, ...(incoming ?? {}) };
  return {
    direction: normalizeDirection(source.direction, seed.direction),
    distancePx: toNonNegativeNumber(source.distancePx, seed.distancePx),
    toOpacity: clampNumber(toFiniteNumber(source.toOpacity, seed.toOpacity), 0, 1),
    toX: toFiniteNumber(source.toX, seed.toX),
    toY: toFiniteNumber(source.toY, seed.toY),
    toScale: Math.max(0, toFiniteNumber(source.toScale, seed.toScale)),
    toRotate: toFiniteNumber(source.toRotate, seed.toRotate),
    duration: toNonNegativeNumber(source.duration, seed.duration),
    delay: toNonNegativeNumber(source.delay, seed.delay),
    curve: normalizeCurve(seed.curve, incoming?.curve),
  };
}

function normalizeExitViewportAmount(value: unknown) {
  if (value === "some" || value === "all") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function normalizeExitViewport(
  seed: PbImageAnimationDefaults["exitViewport"],
  incoming: unknown
): PbImageAnimationDefaults["exitViewport"] {
  if (incoming == null || typeof incoming !== "object" || Array.isArray(incoming)) return seed;
  const record = incoming as Record<string, unknown>;
  const normalized: NonNullable<PbImageAnimationDefaults["exitViewport"]> = {};
  if (typeof record.once === "boolean") normalized.once = record.once;
  const amount = normalizeExitViewportAmount(record.amount);
  if (amount !== undefined) normalized.amount = amount;
  if (typeof record.margin === "string") normalized.margin = record.margin;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeImageFineTune(
  seed: PbImageAnimationFineTune,
  incoming?: Partial<PbImageAnimationFineTune> & LegacyFineTuneFields
): PbImageAnimationFineTune {
  const source = incoming ?? {};
  const legacyIn = (source as { hybridStackInPreset?: PbImageHybridStackPreset })
    .hybridStackInPreset;
  const legacyOut = (source as { hybridStackOutPreset?: PbImageHybridStackPreset })
    .hybridStackOutPreset;

  const legacyDuration = Number.isFinite(Number(source.hybridDuration))
    ? Number(source.hybridDuration)
    : undefined;

  return {
    entranceBehavior: resolveBehavior(source.entranceBehavior, seed.entranceBehavior),
    exitBehavior: resolveBehavior(source.exitBehavior, seed.exitBehavior),
    hybridCompositionIn: resolveHybridCompositionIn(source, source.hybridComposition, seed),
    hybridLayerStaggerEnabled:
      typeof source.hybridLayerStaggerEnabled === "boolean"
        ? source.hybridLayerStaggerEnabled
        : seed.hybridLayerStaggerEnabled,
    hybridLayerStaggerSec: toNonNegativeNumber(
      source.hybridLayerStaggerSec,
      seed.hybridLayerStaggerSec
    ),
    hybridOrderedUseStepDurations:
      typeof source.hybridOrderedUseStepDurations === "boolean"
        ? source.hybridOrderedUseStepDurations
        : seed.hybridOrderedUseStepDurations,
    hybridOrderedStepDurations: normalizeStepDurations(
      source.hybridOrderedStepDurations,
      seed.hybridOrderedStepDurations
    ),
    hybridStackIn: normalizeHybridStack(seed.hybridStackIn, source.hybridStackIn, legacyIn),
    hybridStackOut: normalizeHybridStack(seed.hybridStackOut, source.hybridStackOut, legacyOut),
    hybridEntranceDuration: resolveHybridDuration(
      source.hybridEntranceDuration,
      legacyDuration,
      seed.hybridEntranceDuration
    ),
    hybridExitDuration: resolveHybridDuration(
      source.hybridExitDuration,
      legacyDuration,
      seed.hybridExitDuration
    ),
    entrance: normalizeEntranceFineTune(seed.entrance, source.entrance),
    exit: normalizeExitFineTune(seed.exit, source.exit),
  };
}

function resolveExitTrigger(
  incoming: PbImageAnimationDefaults["exitTrigger"] | undefined,
  seed: PbImageAnimationDefaults["exitTrigger"]
): PbImageAnimationDefaults["exitTrigger"] {
  return incoming === "manual" || incoming === "leaveViewport" ? incoming : seed;
}

/** Exported for typography dev tools (heading / body / link) that reuse the same animation lab model as image. */
export function normalizePbImageAnimationDefaults(
  seed: PbImageAnimationDefaults,
  incoming?: Partial<PbImageAnimationDefaults>
): PbImageAnimationDefaults {
  const incomingFineTune = incoming?.fineTune as
    | (Partial<PbImageAnimationFineTune> & LegacyFineTuneFields)
    | undefined;

  return {
    ...seed,
    ...incoming,
    exitTrigger: resolveExitTrigger(incoming?.exitTrigger, seed.exitTrigger),
    exitViewport: normalizeExitViewport(seed.exitViewport, incoming?.exitViewport),
    presetEntranceDuration: normalizeOptionalPresetDuration(
      seed.presetEntranceDuration,
      incoming?.presetEntranceDuration
    ),
    presetExitDuration: normalizeOptionalPresetDuration(
      seed.presetExitDuration,
      incoming?.presetExitDuration
    ),
    fineTune: normalizeImageFineTune(seed.fineTune, incomingFineTune),
  };
}
