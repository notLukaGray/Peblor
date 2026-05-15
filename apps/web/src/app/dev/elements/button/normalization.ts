import {
  normalizeTypographyVariants,
  pickBoolean,
  pickFiniteNumber,
  pickOverflowValue,
  pickString,
  pickUnitOpacity,
  readElementPersistedPayload,
  resolveTypographyDefaultVariant,
} from "@/app/dev/elements/_shared/typography-normalization-helpers";
import type { PbResponsiveValue } from "@/app/theme/pb-builder-defaults";

function pickResponsiveString(
  incoming: unknown,
  fallback: PbResponsiveValue<string> | undefined
): PbResponsiveValue<string> | undefined {
  if (incoming === undefined) return fallback;
  if (typeof incoming === "string") return incoming || undefined;
  if (
    Array.isArray(incoming) &&
    incoming.length === 2 &&
    typeof incoming[0] === "string" &&
    typeof incoming[1] === "string"
  ) {
    return incoming as [string, string];
  }
  return fallback;
}
import { typographyVariantForThemeExport } from "@/app/dev/elements/_shared/typography-export-block";
import { normalizePbImageAnimationDefaults } from "@/app/dev/elements/image/normalization";
import { parseButtonAction, type SectionEffect } from "@pb/contracts";
import { BASE_DEFAULTS, STORAGE_KEY, VARIANT_ORDER } from "./constants";
import type { ButtonVariantDefaults, ButtonVariantKey, PersistedButtonDefaults } from "./types";

type GlassEffect = Extract<SectionEffect, { type: "glass" }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isGlassEffect(e: SectionEffect | undefined): e is GlassEffect {
  return e?.type === "glass";
}

/**
 * Persisted JSON often omits glass physics fields. Merge each incoming `glass` entry onto the
 * seed variant's glass effect so defaults stay stable across exports.
 */
function mergeGlassIntoEffects(
  seedEffects: SectionEffect[] | undefined,
  incomingEffects: SectionEffect[]
): SectionEffect[] {
  const seedGlass = seedEffects?.find(isGlassEffect);
  return incomingEffects.map((effect) =>
    isGlassEffect(effect)
      ? { ...(seedGlass ?? { type: "glass" as const }), ...effect, type: "glass" as const }
      : effect
  );
}

function pickButtonEffects(
  incoming: ButtonVariantDefaults["effects"] | undefined,
  seed: ButtonVariantDefaults["effects"]
): ButtonVariantDefaults["effects"] | undefined {
  if (incoming === undefined) return seed;
  if (!Array.isArray(incoming)) return seed;
  if (incoming.length === 0) return [];
  if (incoming.some(isGlassEffect)) {
    return mergeGlassIntoEffects(seed, incoming);
  }
  return incoming;
}

function pickWrapperInteractionVars(
  incoming: Partial<ButtonVariantDefaults>,
  seed: ButtonVariantDefaults["wrapperInteractionVars"]
): ButtonVariantDefaults["wrapperInteractionVars"] {
  const raw = incoming.wrapperInteractionVars;
  if (raw === undefined) return seed;
  if (raw == null) return undefined;
  if (!isRecord(raw)) return seed;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("--") && typeof v === "string") out[k] = v;
  }
  if (Object.keys(out).length === 0) return undefined;
  return out;
}

function pickLinkTransition(
  incoming: unknown,
  seed: ButtonVariantDefaults["linkTransition"]
): ButtonVariantDefaults["linkTransition"] {
  if (incoming === undefined) return seed;
  if (typeof incoming === "number" && Number.isFinite(incoming)) return incoming;
  if (typeof incoming === "string") return incoming;
  return seed;
}

function pickCopyType(
  incoming: unknown,
  fallback: ButtonVariantDefaults["copyType"]
): ButtonVariantDefaults["copyType"] {
  return incoming === "heading" || incoming === "body" ? incoming : fallback;
}

function pickButtonLevel(
  incoming: unknown,
  fallback: ButtonVariantDefaults["level"]
): ButtonVariantDefaults["level"] {
  if (typeof incoming === "number" && incoming >= 1 && incoming <= 6) {
    return incoming as ButtonVariantDefaults["level"];
  }
  return fallback;
}

function pickWrapperStrokeWidthPx(
  incoming: unknown,
  fallback: ButtonVariantDefaults["wrapperStrokeWidth"]
): ButtonVariantDefaults["wrapperStrokeWidth"] {
  if (incoming === undefined) return fallback;
  if (typeof incoming !== "number" || !Number.isFinite(incoming)) return fallback;
  return Math.round(Math.min(Math.max(incoming, 0), 48));
}

export function normalizeButtonVariant(
  seed: ButtonVariantDefaults,
  incoming?: Partial<ButtonVariantDefaults>
): ButtonVariantDefaults {
  if (!incoming || typeof incoming !== "object") return seed;
  return {
    ...seed,
    ...incoming,
    label: pickString(incoming.label, seed.label),
    href: pickString(incoming.href, seed.href),
    copyType: pickCopyType(incoming.copyType, seed.copyType),
    level: pickButtonLevel(incoming.level, seed.level),
    fontFamily: pickString(incoming.fontFamily, seed.fontFamily),
    external: pickBoolean(incoming.external, seed.external),
    disabled: pickBoolean(incoming.disabled, seed.disabled),
    wordWrap: pickBoolean(incoming.wordWrap, seed.wordWrap),
    action: parseButtonAction(
      pickString(incoming.action, seed.action)
    ) as ButtonVariantDefaults["action"],
    actionPayload: incoming.actionPayload ?? seed.actionPayload,
    linkDefault: pickString(incoming.linkDefault, seed.linkDefault),
    linkHover: pickString(incoming.linkHover, seed.linkHover),
    linkActive: pickString(incoming.linkActive, seed.linkActive),
    linkDisabled: pickString(incoming.linkDisabled, seed.linkDisabled),
    linkTransition: pickLinkTransition(incoming.linkTransition, seed.linkTransition),
    wrapperFill: pickString(incoming.wrapperFill, seed.wrapperFill),
    wrapperStroke: pickString(incoming.wrapperStroke, seed.wrapperStroke),
    wrapperStrokeWidth: pickWrapperStrokeWidthPx(
      incoming.wrapperStrokeWidth,
      seed.wrapperStrokeWidth
    ),
    wrapperPadding: pickResponsiveString(incoming.wrapperPadding, seed.wrapperPadding),
    wrapperBorderRadius: pickResponsiveString(
      incoming.wrapperBorderRadius,
      seed.wrapperBorderRadius
    ),
    wrapperWidth: pickResponsiveString(incoming.wrapperWidth, seed.wrapperWidth),
    wrapperHeight: pickResponsiveString(incoming.wrapperHeight, seed.wrapperHeight),
    wrapperMinWidth: pickResponsiveString(incoming.wrapperMinWidth, seed.wrapperMinWidth),
    wrapperMinHeight: pickResponsiveString(incoming.wrapperMinHeight, seed.wrapperMinHeight),
    wrapperFillHover: pickString(incoming.wrapperFillHover, seed.wrapperFillHover),
    wrapperFillActive: pickString(incoming.wrapperFillActive, seed.wrapperFillActive),
    wrapperStrokeHover: pickString(incoming.wrapperStrokeHover, seed.wrapperStrokeHover),
    wrapperFillDisabled: pickString(incoming.wrapperFillDisabled, seed.wrapperFillDisabled),
    wrapperScaleHover: pickFiniteNumber(incoming.wrapperScaleHover, seed.wrapperScaleHover),
    wrapperScaleActive: pickFiniteNumber(incoming.wrapperScaleActive, seed.wrapperScaleActive),
    wrapperScaleDisabled: pickFiniteNumber(
      incoming.wrapperScaleDisabled,
      seed.wrapperScaleDisabled
    ),
    wrapperOpacityHover: pickUnitOpacity(incoming.wrapperOpacityHover, seed.wrapperOpacityHover),
    wrapperTransition: pickString(incoming.wrapperTransition, seed.wrapperTransition),
    wrapperInteractionVars: pickWrapperInteractionVars(incoming, seed.wrapperInteractionVars),
    opacity: pickUnitOpacity(incoming.opacity, seed.opacity),
    zIndex: pickFiniteNumber(incoming.zIndex, seed.zIndex),
    overflow: pickOverflowValue(incoming.overflow, seed.overflow),
    animation: normalizePbImageAnimationDefaults(seed.animation, incoming?.animation),
    effects: pickButtonEffects(incoming.effects, seed.effects),
  };
}

export function readPersistedButton(): PersistedButtonDefaults | null {
  if (typeof window === "undefined") return null;
  try {
    const d = readElementPersistedPayload("button", STORAGE_KEY) as Record<string, unknown> | null;
    if (!d || !d.defaultVariant || !d.variants) return null;
    return {
      v: 1,
      defaultVariant: resolveTypographyDefaultVariant(
        VARIANT_ORDER,
        d.defaultVariant as string,
        BASE_DEFAULTS.defaultVariant
      ) as ButtonVariantKey,
      variants: normalizeTypographyVariants(
        VARIANT_ORDER,
        BASE_DEFAULTS.variants,
        d.variants as Record<string, unknown>,
        normalizeButtonVariant
      ),
    };
  } catch {
    return null;
  }
}

export function toButtonExportJson(data: PersistedButtonDefaults): string {
  const variants = Object.fromEntries(
    Object.entries(data.variants).map(([key, v]) => [
      key,
      typographyVariantForThemeExport(v as Record<string, unknown>),
    ])
  );
  return JSON.stringify({ button: { defaultVariant: data.defaultVariant, variants } }, null, 2);
}

export function toButtonPersisted(
  defaultVariant: ButtonVariantKey,
  variants: Record<ButtonVariantKey, ButtonVariantDefaults>
): PersistedButtonDefaults {
  return { v: 1, defaultVariant, variants };
}
