import type { WorkbenchSessionV2 } from "@/app/dev/workbench/workbench-defaults";
import { BASE_DEFAULTS as INPUT_BASE_DEFAULTS } from "@/app/dev/elements/input/constants";
import { BASE_DEFAULTS as BUTTON_BASE_DEFAULTS } from "@/app/dev/elements/button/constants";

/** fieldTypes that render as a text input — eligible for input variant styles. */
export const INPUT_FIELD_TYPES = [
  "text",
  "email",
  "password",
  "tel",
  "url",
  "number",
  "date",
  "time",
  "datetime-local",
  "color",
  "search",
  "paragraph",
] as const;

type VariantRecord = Record<string, unknown>;
type StylePatch = Record<string, unknown>;

function findGlassEffect(effects: unknown): { type: string; frost?: string } | undefined {
  if (!Array.isArray(effects)) return undefined;
  return (effects as Array<{ type: string; frost?: string }>).find((e) => e.type === "glass");
}

function copyEffects(effects: unknown): unknown[] | undefined {
  if (!Array.isArray(effects)) return undefined;
  return effects.map((effect) =>
    effect && typeof effect === "object" ? { ...(effect as Record<string, unknown>) } : effect
  );
}

function copyProp(
  patch: StylePatch,
  targetKey: string,
  variant: VariantRecord,
  sourceKey: string
): void {
  const value = variant[sourceKey];
  if (value) patch[targetKey] = value;
}

/**
 * Resolve a variant from the live session, falling back to BASE_DEFAULTS when
 * the stored session predates the variant (e.g. glass added after last save).
 */
function resolveInputVariant(
  variantKey: string,
  session: WorkbenchSessionV2
): VariantRecord | undefined {
  const fromSession = (session.elements.input.variants as Record<string, VariantRecord>)[
    variantKey
  ];
  if (fromSession) return fromSession;
  return (INPUT_BASE_DEFAULTS.variants as Record<string, VariantRecord>)[variantKey];
}

function resolveButtonVariant(
  variantKey: string,
  session: WorkbenchSessionV2
): VariantRecord | undefined {
  const fromSession = (session.elements.button.variants as Record<string, VariantRecord>)[
    variantKey
  ];
  if (fromSession) return fromSession;
  return (BUTTON_BASE_DEFAULTS.variants as Record<string, VariantRecord>)[variantKey];
}

/**
 * Translates a workbench input variant into form-field-compatible style props.
 */
export function getInputVariantStylePatch(
  variantKey: string,
  session: WorkbenchSessionV2
): StylePatch {
  const variant = resolveInputVariant(variantKey, session);
  if (!variant) return {};

  const patch: StylePatch = {};
  copyProp(patch, "color", variant, "color");
  const effects = copyEffects(variant.effects);
  if (effects) patch.effects = effects;

  const glass = findGlassEffect(variant.effects);
  if (glass) {
    patch.fill = "rgba(255,255,255,0.05)";
    patch.stroke = "rgba(255,255,255,0.15)";
    patch.borderRadius = "0.5rem";
  }

  return patch;
}

/**
 * Translates a workbench button variant into form-field-compatible style props
 * for button fields. Maps wrapperFill → fill, wrapperStroke → stroke, etc.
 */
export function getButtonVariantStylePatch(
  variantKey: string,
  session: WorkbenchSessionV2
): StylePatch {
  const variant = resolveButtonVariant(variantKey, session);
  if (!variant) return {};

  const patch: StylePatch = {};
  copyProp(patch, "fill", variant, "wrapperFill");
  copyProp(patch, "stroke", variant, "wrapperStroke");
  copyProp(patch, "borderRadius", variant, "wrapperBorderRadius");
  copyProp(patch, "padding", variant, "wrapperPadding");
  copyProp(patch, "color", variant, "linkDefault");
  const effects = copyEffects(variant.effects);
  if (effects) patch.effects = effects;

  const glass = findGlassEffect(variant.effects);
  if (glass) {
    patch.fill = "rgba(255,255,255,0.06)";
  }

  return patch;
}
