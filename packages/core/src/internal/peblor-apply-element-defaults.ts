import type { ElementBlock } from "@pb/contracts";

import { getPbBuilderDefaults } from "./adapters/host-config";
import {
  applyWorkbenchElementDefaults,
  isBoolean,
  isMissingResponsiveString,
  isNonEmptyString,
  isResponsiveStringValue,
  mergeMissingFromTemplate,
  resolveBodyVariantKey,
  resolveButtonVariantKey,
  resolveHeadingVariantKey,
  resolveInputVariantKey,
  resolveLinkVariantKey,
  resolveRangeVariantKey,
  resolveSpacerVariantKey,
  resolveVideoVariantKey,
} from "./peblor-apply-defaults-helpers";
import { applyImageDefaults } from "./peblor-apply-defaults-image";

// ---------------------------------------------------------------------------
// Per-element defaults application
// ---------------------------------------------------------------------------

function applyHeadingDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementHeading") return el;
  const rec = { ...el } as Record<string, unknown>;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveHeadingVariantKey(rec.variant);
  const template = defaults.elements.heading.variants[variantKey] as Record<string, unknown>;
  if (!template) return el;
  return mergeMissingFromTemplate(rec, template) ? (rec as ElementBlock) : el;
}

function applyBodyDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementBody") return el;
  const rec = { ...el } as Record<string, unknown>;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveBodyVariantKey(rec.variant);
  const template = defaults.elements.body.variants[variantKey] as Record<string, unknown>;
  if (!template) return el;
  return mergeMissingFromTemplate(rec, template) ? (rec as ElementBlock) : el;
}

function applyLinkDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementLink") return el;
  const rec = { ...el } as Record<string, unknown>;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveLinkVariantKey(rec.variant);
  const template = defaults.elements.link.variants[variantKey] as Record<string, unknown>;
  if (!template) return el;
  return mergeMissingFromTemplate(rec, template) ? (rec as ElementBlock) : el;
}

function applyButtonDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementButton") return el;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveButtonVariantKey(el.variant);
  const variant = defaults.elements.button.variants[variantKey];
  if (!variant) return el;
  const rec = { ...el } as Record<string, unknown>;
  let changed = false;

  // typography binding — nested in defaults but flat on the element
  if (rec.copyType == null && variant.typography.copyType) {
    rec.copyType = variant.typography.copyType;
    changed = true;
  }
  if (rec.level == null && variant.typography.level != null) {
    rec.level = variant.typography.level;
    changed = true;
  }

  // wrapper styling
  if (rec.wrapperFill == null && isNonEmptyString(variant.wrapperFill)) {
    rec.wrapperFill = variant.wrapperFill;
    changed = true;
  }
  if (rec.wrapperStroke == null && isNonEmptyString(variant.wrapperStroke)) {
    rec.wrapperStroke = variant.wrapperStroke;
    changed = true;
  }
  if (rec.wrapperPadding == null && isNonEmptyString(variant.wrapperPadding)) {
    rec.wrapperPadding = variant.wrapperPadding;
    changed = true;
  }
  if (rec.wrapperBorderRadius == null && isNonEmptyString(variant.wrapperBorderRadius)) {
    rec.wrapperBorderRadius = variant.wrapperBorderRadius;
    changed = true;
  }

  return changed ? (rec as ElementBlock) : el;
}

function applyVideoDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementVideo") return el;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveVideoVariantKey(el.variant);
  const variant = defaults.elements.video.variants[variantKey];
  if (!variant) return el;
  const rec = { ...el } as Record<string, unknown>;
  let changed = false;

  if (rec.objectFit == null && variant.objectFit) {
    rec.objectFit = variant.objectFit;
    changed = true;
  }
  if (isMissingResponsiveString(rec.aspectRatio) && isResponsiveStringValue(variant.aspectRatio)) {
    rec.aspectRatio = variant.aspectRatio;
    changed = true;
  }
  if (rec.module == null && isNonEmptyString(variant.module)) {
    rec.module = variant.module;
    changed = true;
  }
  if (!isBoolean(rec.showPlayButton) && isBoolean(variant.showPlayButton)) {
    rec.showPlayButton = variant.showPlayButton;
    changed = true;
  }
  if (!isBoolean(rec.autoplay) && isBoolean(variant.autoplay)) {
    rec.autoplay = variant.autoplay;
    changed = true;
  }
  if (!isBoolean(rec.loop) && isBoolean(variant.loop)) {
    rec.loop = variant.loop;
    changed = true;
  }
  if (!isBoolean(rec.muted) && isBoolean(variant.muted)) {
    rec.muted = variant.muted;
    changed = true;
  }

  return changed ? (rec as ElementBlock) : el;
}

function applySpacerDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementSpacer") return el;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveSpacerVariantKey(el.variant);
  const variant = defaults.elements.spacer.variants[variantKey];
  if (!variant) return el;
  const rec = { ...el } as Record<string, unknown>;
  let changed = false;

  if (!isResponsiveStringValue(rec.height) && isNonEmptyString(variant.height)) {
    rec.height = variant.height;
    changed = true;
  }

  return changed ? (rec as ElementBlock) : el;
}

function applyInputDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementInput") return el;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveInputVariantKey(el.variant);
  const variant = defaults.elements.input.variants[variantKey];
  if (!variant) return el;
  const rec = { ...el } as Record<string, unknown>;
  let changed = false;

  if (!isBoolean(rec.showIcon) && isBoolean(variant.showIcon)) {
    rec.showIcon = variant.showIcon;
    changed = true;
  }
  if (!isNonEmptyString(rec.color) && isNonEmptyString(variant.color)) {
    rec.color = variant.color;
    changed = true;
  }
  if (!isNonEmptyString(rec.height) && isNonEmptyString(variant.height)) {
    rec.height = variant.height;
    changed = true;
  }

  return changed ? (rec as ElementBlock) : el;
}

function applyRangeDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementRange") return el;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveRangeVariantKey(el.variant);
  const variant = defaults.elements.range.variants[variantKey];
  if (!variant) return el;
  const rec = { ...el } as Record<string, unknown>;
  let changed = false;

  // Merge style sub-keys individually — do not overwrite a partially-set style object
  const existingStyle =
    rec.style != null && typeof rec.style === "object" && !Array.isArray(rec.style)
      ? (rec.style as Record<string, unknown>)
      : {};
  const variantStyle = variant.style;
  const nextStyle: Record<string, unknown> = { ...existingStyle };
  let styleChanged = false;

  for (const key of [
    "trackColor",
    "fillColor",
    "trackHeight",
    "thumbSize",
    "borderRadius",
  ] as const) {
    if (!isNonEmptyString(nextStyle[key]) && isNonEmptyString(variantStyle[key])) {
      nextStyle[key] = variantStyle[key];
      styleChanged = true;
    }
  }

  if (styleChanged) {
    rec.style = nextStyle;
    changed = true;
  }

  return changed ? (rec as ElementBlock) : el;
}

// ---------------------------------------------------------------------------
// Dispatch map
// ---------------------------------------------------------------------------

const APPLY_DEFAULTS_BY_TYPE: Record<string, (element: ElementBlock) => ElementBlock> = {
  elementImage: applyImageDefaults,
  elementVideo: applyVideoDefaults,
  elementHeading: applyHeadingDefaults,
  elementBody: applyBodyDefaults,
  elementLink: applyLinkDefaults,
  elementButton: applyButtonDefaults,
  elementInput: applyInputDefaults,
  elementRange: applyRangeDefaults,
  elementSpacer: applySpacerDefaults,
  elementRichText: (element) =>
    applyWorkbenchElementDefaults(element, "elementRichText", "richText"),
  elementVideoTime: (element) =>
    applyWorkbenchElementDefaults(element, "elementVideoTime", "videoTime"),
  elementVector: (element) => applyWorkbenchElementDefaults(element, "elementVector", "vector"),
  elementSVG: (element) => applyWorkbenchElementDefaults(element, "elementSVG", "svg"),
  elementModel3D: (element) => applyWorkbenchElementDefaults(element, "elementModel3D", "model3d"),
  elementRive: (element) => applyWorkbenchElementDefaults(element, "elementRive", "rive"),
  elementScrollProgressBar: (element) =>
    applyWorkbenchElementDefaults(element, "elementScrollProgressBar", "scrollProgressBar"),
  // No-op entries for element types that intentionally have no defaults to apply.
  elementAudio: (el) => el,
  elementCounter: (el) => el,
  elementDivider: (el) => el,
  elementDrag: (el) => el,
  elementFormField: (el) => el,
  elementGroup: (el) => el,
  elementImageCompare: (el) => el,
  elementInfiniteScroll: (el) => el,
  elementLottie: (el) => el,
  elementMarquee: (el) => el,
  elementTabs: (el) => el,
  elementTooltip: (el) => el,
  elementVideoQualitySelect: (el) => el,
};

// ---------------------------------------------------------------------------
// Per-element defaults dispatch
// ---------------------------------------------------------------------------

export function applyDefaultsToElement(el: ElementBlock): ElementBlock {
  const applyDefaults = APPLY_DEFAULTS_BY_TYPE[el.type];
  return applyDefaults ? applyDefaults(el) : el;
}
