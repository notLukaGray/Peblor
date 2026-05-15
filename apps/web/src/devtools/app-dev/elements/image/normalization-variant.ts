import type { PbImageVariantDefaults } from "@/app/theme/pb-builder-defaults";
import {
  ALIGN_OPTIONS,
  ALIGN_Y_OPTIONS,
  OBJECT_FIT_OPTIONS,
  OVERFLOW_OPTIONS,
} from "@/app/dev/elements/image/constants";
import { clampNumber } from "@/app/dev/elements/image/utils";
import { normalizePbImageAnimationDefaults } from "./normalization-motion";
import {
  asString,
  normalizeConstraints,
  normalizeResponsiveValue,
} from "./normalization-value-utils";

function normalizeObjectFit(
  seed: PbImageVariantDefaults["objectFit"],
  incoming: unknown
): PbImageVariantDefaults["objectFit"] {
  return (
    normalizeResponsiveValue(
      seed,
      incoming,
      (value: unknown): value is "cover" | "contain" | "fillWidth" | "fillHeight" | "crop" =>
        typeof value === "string" && (OBJECT_FIT_OPTIONS as readonly string[]).includes(value)
    ) ?? seed
  );
}

function normalizeAlign(
  seed: PbImageVariantDefaults["align"],
  incoming: unknown
): PbImageVariantDefaults["align"] {
  return normalizeResponsiveValue(
    seed,
    incoming,
    (value: unknown): value is "left" | "center" | "right" =>
      typeof value === "string" && (ALIGN_OPTIONS as readonly string[]).includes(value)
  );
}

function normalizeAlignY(
  seed: PbImageVariantDefaults["alignY"],
  incoming: unknown
): PbImageVariantDefaults["alignY"] {
  return normalizeResponsiveValue(
    seed,
    incoming,
    (value: unknown): value is "top" | "center" | "bottom" =>
      typeof value === "string" && (ALIGN_Y_OPTIONS as readonly string[]).includes(value)
  );
}

function normalizeTextResponsive(
  seed: PbImageVariantDefaults[keyof PbImageVariantDefaults],
  incoming: unknown
) {
  return normalizeResponsiveValue(
    seed as string | [string, string] | undefined,
    incoming,
    asString
  );
}

function normalizeCrop(
  seedCrop: PbImageVariantDefaults["imageCrop"],
  incomingCrop: PbImageVariantDefaults["imageCrop"] | undefined
): PbImageVariantDefaults["imageCrop"] {
  if (incomingCrop == null && seedCrop == null) return undefined;
  const merged = { ...(seedCrop ?? {}), ...(incomingCrop ?? {}) };
  const crop: PbImageVariantDefaults["imageCrop"] = {
    x: Number(merged.x ?? 0),
    y: Number(merged.y ?? 0),
    scale: Math.max(1, Math.min(4, Number(merged.scale ?? 1))),
  };
  assignFocalCoordinate(crop, "focalX", merged.focalX);
  assignFocalCoordinate(crop, "focalY", merged.focalY);
  return crop;
}

function assignFocalCoordinate(
  crop: NonNullable<PbImageVariantDefaults["imageCrop"]>,
  key: "focalX" | "focalY",
  value: unknown
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  crop[key] = clampNumber(value, 0, 1);
}

function normalizeFiniteNumber(value: unknown, fallback: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeOpacity(value: unknown, fallback: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clampNumber(value, 0, 1);
}

function normalizeOverflow(
  seed: PbImageVariantDefaults["overflow"] | undefined,
  incoming: unknown
): PbImageVariantDefaults["overflow"] | undefined {
  if (typeof incoming !== "string") return seed;
  return OVERFLOW_OPTIONS.includes(incoming as (typeof OVERFLOW_OPTIONS)[number])
    ? (incoming as PbImageVariantDefaults["overflow"])
    : seed;
}

export function normalizeVariant(
  seed: PbImageVariantDefaults,
  incoming?: Partial<PbImageVariantDefaults>
): PbImageVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;

  return {
    ...seed,
    ...incoming,
    objectFit: normalizeObjectFit(seed.objectFit, incoming.objectFit),
    aspectRatio: normalizeTextResponsive(seed.aspectRatio, incoming.aspectRatio),
    width: normalizeTextResponsive(seed.width, incoming.width),
    height: normalizeTextResponsive(seed.height, incoming.height),
    constraints: normalizeConstraints(seed.constraints, incoming.constraints),
    borderRadius:
      normalizeTextResponsive(seed.borderRadius, incoming.borderRadius) ?? seed.borderRadius,
    align: normalizeAlign(seed.align, incoming.align),
    alignY: normalizeAlignY(seed.alignY, incoming.alignY),
    marginTop: normalizeTextResponsive(seed.marginTop, incoming.marginTop),
    marginBottom: normalizeTextResponsive(seed.marginBottom, incoming.marginBottom),
    marginLeft: normalizeTextResponsive(seed.marginLeft, incoming.marginLeft),
    marginRight: normalizeTextResponsive(seed.marginRight, incoming.marginRight),
    zIndex: normalizeFiniteNumber(incoming.zIndex, seed.zIndex),
    opacity: normalizeOpacity(incoming.opacity, seed.opacity),
    overflow: normalizeOverflow(seed.overflow, incoming.overflow),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming.animation),
    imageCrop: normalizeCrop(seed.imageCrop, incoming.imageCrop),
  };
}
