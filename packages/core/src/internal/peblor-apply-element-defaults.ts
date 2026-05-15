import {
  buildImageMotionTimingFromAnimationDefaults,
  type PbBodyVariantKey,
  type PbButtonVariantKey,
  type PbHeadingVariantKey,
  type PbImageVariantKey,
  type PbInputVariantKey,
  type PbLinkVariantKey,
  type PbRangeVariantKey,
  type PbSpacerVariantKey,
  type PbVideoVariantKey,
  type PbWorkbenchElementDefaults,
  type PbWorkbenchElementDefaultSet,
} from "./defaults/pb-builder-defaults";
import { getPbBuilderDefaults } from "./adapters/host-config";
import type { ElementBlock, SectionBlock } from "@pb/contracts";

/**
 * `ElementBlock` is a wide Zod union; this module merges partial defaults by walking string keys on
 * shallow copies. Remaining `asRecord` boundaries narrow unknown JSON-shaped fields; prefer
 * `Extract<ElementBlock, { type: … }>` for new element defaults (see `applyImageDefaults`).
 */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isResponsiveStringValue(value: unknown): boolean {
  if (isNonEmptyString(value)) return true;
  if (!Array.isArray(value) || value.length !== 2) return false;
  return value.some((entry) => isNonEmptyString(entry));
}

function isMissingResponsiveString(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (!Array.isArray(value) || value.length !== 2) return true;
  return value.every((entry) => typeof entry === "string" && entry.trim().length === 0);
}

function isConstraintObject(
  value: unknown
): value is { minWidth?: string; maxWidth?: string; minHeight?: string; maxHeight?: string } {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isMotionExitTrigger(value: unknown): value is "manual" | "leaveViewport" {
  return value === "manual" || value === "leaveViewport";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeVariantAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function resolveVariantKey<K extends string>(
  value: unknown,
  variants: Record<K, unknown>,
  fallback: K,
  aliases?: Record<string, K>
): K {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!raw) return fallback;
  if (raw in variants) return raw as K;

  const normalized = normalizeVariantAlias(raw);
  for (const key of Object.keys(variants) as K[]) {
    if (normalizeVariantAlias(key) === normalized) return key;
  }

  if (aliases?.[normalized]) return aliases[normalized];
  return fallback;
}

const IMAGE_VARIANT_ALIASES: Record<string, PbImageVariantKey> = {
  cover: "fullCover",
  full: "fullCover",
  fullscreen: "fullCover",
  fullbleed: "fullCover",
  featured: "feature",
  cropped: "crop",
};

const HEADING_VARIANT_ALIASES: Record<string, PbHeadingVariantKey> = {
  headline: "display",
  title: "display",
  subheading: "section",
  subhead: "section",
  eyebrow: "label",
  overline: "label",
};

const BODY_VARIANT_ALIASES: Record<string, PbBodyVariantKey> = {
  intro: "lead",
  paragraph: "standard",
  body: "standard",
  bodytext: "standard",
  caption: "fine",
  fineprint: "fine",
  small: "fine",
};

const LINK_VARIANT_ALIASES: Record<string, PbLinkVariantKey> = {
  primary: "inline",
  cta: "emphasis",
  navigation: "nav",
  navbar: "nav",
  menu: "nav",
};

const BUTTON_VARIANT_ALIASES: Record<string, PbButtonVariantKey> = {
  primary: "accent",
  secondary: "ghost",
  tertiary: "text",
  link: "text",
  naked: "text",
};

const VIDEO_VARIANT_ALIASES: Record<string, PbVideoVariantKey> = {
  full: "fullcover",
  fullscreen: "fullcover",
  cover: "fullcover",
  featured: "hero",
};

const INPUT_VARIANT_ALIASES: Record<string, PbInputVariantKey> = {
  search: "default",
  text: "default",
  condensed: "compact",
  bare: "minimal",
};

const RANGE_VARIANT_ALIASES: Record<string, PbRangeVariantKey> = {
  thick: "default",
  thin: "slim",
  colored: "accent",
};

const SPACER_VARIANT_ALIASES: Record<string, PbSpacerVariantKey> = {
  small: "sm",
  medium: "md",
  large: "lg",
  xs: "sm",
  xl: "lg",
};

function resolveImageVariantKey(value: unknown): PbImageVariantKey {
  const defaults = getPbBuilderDefaults();
  const variants = defaults.elements.image.variants;
  return resolveVariantKey(
    value,
    variants,
    defaults.elements.image.defaultVariant,
    IMAGE_VARIANT_ALIASES
  );
}

function resolveHeadingVariantKey(value: unknown): PbHeadingVariantKey {
  const defaults = getPbBuilderDefaults();
  const variants = defaults.elements.heading.variants;
  return resolveVariantKey(
    value,
    variants,
    defaults.elements.heading.defaultVariant,
    HEADING_VARIANT_ALIASES
  );
}

function resolveBodyVariantKey(value: unknown): PbBodyVariantKey {
  const defaults = getPbBuilderDefaults();
  const variants = defaults.elements.body.variants;
  return resolveVariantKey(
    value,
    variants,
    defaults.elements.body.defaultVariant,
    BODY_VARIANT_ALIASES
  );
}

function resolveLinkVariantKey(value: unknown): PbLinkVariantKey {
  const defaults = getPbBuilderDefaults();
  const variants = defaults.elements.link.variants;
  return resolveVariantKey(
    value,
    variants,
    defaults.elements.link.defaultVariant,
    LINK_VARIANT_ALIASES
  );
}

function resolveButtonVariantKey(value: unknown): PbButtonVariantKey {
  const defaults = getPbBuilderDefaults();
  const variants = defaults.elements.button.variants;
  return resolveVariantKey(
    value,
    variants,
    defaults.elements.button.defaultVariant,
    BUTTON_VARIANT_ALIASES
  );
}

function resolveVideoVariantKey(value: unknown): PbVideoVariantKey {
  const defaults = getPbBuilderDefaults();
  const variants = defaults.elements.video.variants;
  return resolveVariantKey(
    value,
    variants,
    defaults.elements.video.defaultVariant,
    VIDEO_VARIANT_ALIASES
  );
}

function resolveInputVariantKey(value: unknown): PbInputVariantKey {
  const defaults = getPbBuilderDefaults();
  const variants = defaults.elements.input.variants;
  return resolveVariantKey(
    value,
    variants,
    defaults.elements.input.defaultVariant,
    INPUT_VARIANT_ALIASES
  );
}

function resolveRangeVariantKey(value: unknown): PbRangeVariantKey {
  const defaults = getPbBuilderDefaults();
  const variants = defaults.elements.range.variants;
  return resolveVariantKey(
    value,
    variants,
    defaults.elements.range.defaultVariant,
    RANGE_VARIANT_ALIASES
  );
}

function resolveSpacerVariantKey(value: unknown): PbSpacerVariantKey {
  const defaults = getPbBuilderDefaults();
  const variants = defaults.elements.spacer.variants;
  return resolveVariantKey(
    value,
    variants,
    defaults.elements.spacer.defaultVariant,
    SPACER_VARIANT_ALIASES
  );
}

function mergeMissingFromTemplate(
  el: Record<string, unknown>,
  template: Record<string, unknown>
): boolean {
  let changed = false;
  for (const [key, val] of Object.entries(template)) {
    if (val === undefined) continue;
    if (el[key] === undefined) {
      el[key] = val;
      changed = true;
    }
  }
  return changed;
}

function omitWorkbenchOnlyDefaults(template: Record<string, unknown>): Record<string, unknown> {
  const { animation: _animation, ...rest } = template;
  return rest;
}

function resolveWorkbenchVariantKey(
  value: unknown,
  defaults: PbWorkbenchElementDefaultSet
): string {
  return resolveVariantKey(value, defaults.variants, defaults.defaultVariant, undefined) as string;
}

function applyWorkbenchElementDefaults<K extends keyof PbWorkbenchElementDefaults>(
  el: ElementBlock,
  type: ElementBlock["type"],
  key: K
): ElementBlock {
  if (el.type !== type) return el;
  const defaults = getPbBuilderDefaults().workbenchElements?.[key];
  if (!defaults) return el;
  const rec = { ...el } as Record<string, unknown>;
  const variantKey = resolveWorkbenchVariantKey(rec.variant, defaults);
  const template = defaults.variants[variantKey];
  if (!template) return el;
  return mergeMissingFromTemplate(rec, omitWorkbenchOnlyDefaults(template))
    ? (rec as ElementBlock)
    : el;
}

function applyHeadingDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementHeading") return el;
  const rec = { ...el } as Record<string, unknown>;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveHeadingVariantKey(rec.variant);
  const template = defaults.elements.heading.variants[variantKey] as Record<string, unknown>;
  return mergeMissingFromTemplate(rec, template) ? (rec as ElementBlock) : el;
}

function applyBodyDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementBody") return el;
  const rec = { ...el } as Record<string, unknown>;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveBodyVariantKey(rec.variant);
  const template = defaults.elements.body.variants[variantKey] as Record<string, unknown>;
  return mergeMissingFromTemplate(rec, template) ? (rec as ElementBlock) : el;
}

function applyLinkDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementLink") return el;
  const rec = { ...el } as Record<string, unknown>;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveLinkVariantKey(rec.variant);
  const template = defaults.elements.link.variants[variantKey] as Record<string, unknown>;
  return mergeMissingFromTemplate(rec, template) ? (rec as ElementBlock) : el;
}

function applyButtonDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementButton") return el;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveButtonVariantKey(el.variant);
  const variant = defaults.elements.button.variants[variantKey];
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

function applySpacerDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementSpacer") return el;
  const defaults = getPbBuilderDefaults();
  const variantKey = resolveSpacerVariantKey(el.variant);
  const variant = defaults.elements.spacer.variants[variantKey];
  const rec = { ...el } as Record<string, unknown>;
  let changed = false;

  if (!isNonEmptyString(rec.height) && isNonEmptyString(variant.height)) {
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
  const rec = { ...el } as Record<string, unknown>;
  let changed = false;

  // Merge style sub-keys individually — do not overwrite a partially-set style object
  const existingStyle = asRecord(rec.style) ?? {};
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

function applyImageDefaults(el: ElementBlock): ElementBlock {
  if (el.type !== "elementImage") return el;

  const imageDefaults = getPbBuilderDefaults().elements.image;
  const image = el as ElementBlock & {
    variant?: unknown;
    motion?: unknown;
    motionTiming?: unknown;
    objectPosition?: unknown;
    objectFit?: unknown;
    aspectRatio?: unknown;
    width?: unknown;
    height?: unknown;
    constraints?: unknown;
    borderRadius?: unknown;
    align?: unknown;
    alignY?: unknown;
    marginTop?: unknown;
    marginBottom?: unknown;
    marginLeft?: unknown;
    marginRight?: unknown;
    rotate?: unknown;
    flipHorizontal?: unknown;
    flipVertical?: unknown;
    opacity?: unknown;
    blendMode?: unknown;
    boxShadow?: unknown;
    filter?: unknown;
    backdropFilter?: unknown;
    overflow?: unknown;
    hidden?: unknown;
    priority?: unknown;
    exitPreset?: unknown;
    imageCrop?: unknown;
  };
  const variantKey = resolveImageVariantKey(image.variant);
  const variant = imageDefaults.variants[variantKey];
  const variantMotionTiming = buildImageMotionTimingFromAnimationDefaults(variant.animation);
  const hasCustomMotion = image.motion != null;

  let changed = false;
  const out: Record<string, unknown> = { ...image };

  if (image.objectFit == null) {
    out.objectFit = variant.objectFit;
    changed = true;
  }
  if (variant.layoutMode === "aspectRatio") {
    if (
      isMissingResponsiveString(image.aspectRatio) &&
      isResponsiveStringValue(variant.aspectRatio)
    ) {
      out.aspectRatio = variant.aspectRatio;
      changed = true;
    }
  } else if (variant.layoutMode === "fill") {
    if (isMissingResponsiveString(image.width) && isResponsiveStringValue(variant.width)) {
      out.width = variant.width;
      changed = true;
    }
    if (isMissingResponsiveString(image.height) && isResponsiveStringValue(variant.height)) {
      out.height = variant.height;
      changed = true;
    }
  } else if (variant.layoutMode === "constraints") {
    if (image.constraints == null && variant.constraints != null) {
      out.constraints = variant.constraints;
      changed = true;
    } else if (isConstraintObject(image.constraints) && isConstraintObject(variant.constraints)) {
      const nextConstraints: Record<string, unknown> = { ...image.constraints };
      let constraintsChanged = false;
      for (const key of ["minWidth", "maxWidth", "minHeight", "maxHeight"] as const) {
        if (!isNonEmptyString(nextConstraints[key]) && isNonEmptyString(variant.constraints[key])) {
          nextConstraints[key] = variant.constraints[key];
          constraintsChanged = true;
        }
      }
      if (constraintsChanged) {
        out.constraints = nextConstraints;
        changed = true;
      }
    }
  }
  if (image.imageCrop == null && variant.imageCrop != null) {
    out.imageCrop = variant.imageCrop;
    changed = true;
  }
  if (!isNonEmptyString(image.objectPosition) && isNonEmptyString(variant.objectPosition)) {
    out.objectPosition = variant.objectPosition;
    changed = true;
  }
  if (
    isMissingResponsiveString(image.borderRadius) &&
    isResponsiveStringValue(variant.borderRadius)
  ) {
    out.borderRadius = variant.borderRadius;
    changed = true;
  }
  if (image.align == null && variant.align != null) {
    out.align = variant.align;
    changed = true;
  }
  if (image.alignY == null && variant.alignY != null) {
    out.alignY = variant.alignY;
    changed = true;
  }
  if (isMissingResponsiveString(image.marginTop) && isResponsiveStringValue(variant.marginTop)) {
    out.marginTop = variant.marginTop;
    changed = true;
  }
  if (
    isMissingResponsiveString(image.marginBottom) &&
    isResponsiveStringValue(variant.marginBottom)
  ) {
    out.marginBottom = variant.marginBottom;
    changed = true;
  }
  if (isMissingResponsiveString(image.marginLeft) && isResponsiveStringValue(variant.marginLeft)) {
    out.marginLeft = variant.marginLeft;
    changed = true;
  }
  if (
    isMissingResponsiveString(image.marginRight) &&
    isResponsiveStringValue(variant.marginRight)
  ) {
    out.marginRight = variant.marginRight;
    changed = true;
  }
  if (image.rotate == null && variant.rotate != null) {
    out.rotate = variant.rotate;
    changed = true;
  }
  if (!isBoolean(image.flipHorizontal) && isBoolean(variant.flipHorizontal)) {
    out.flipHorizontal = variant.flipHorizontal;
    changed = true;
  }
  if (!isBoolean(image.flipVertical) && isBoolean(variant.flipVertical)) {
    out.flipVertical = variant.flipVertical;
    changed = true;
  }
  if (!isFiniteNumber(image.opacity) && isFiniteNumber(variant.opacity)) {
    out.opacity = variant.opacity;
    changed = true;
  }
  if (!isNonEmptyString(image.blendMode) && isNonEmptyString(variant.blendMode)) {
    out.blendMode = variant.blendMode;
    changed = true;
  }
  if (!isNonEmptyString(image.boxShadow) && isNonEmptyString(variant.boxShadow)) {
    out.boxShadow = variant.boxShadow;
    changed = true;
  }
  if (!isNonEmptyString(image.filter) && isNonEmptyString(variant.filter)) {
    out.filter = variant.filter;
    changed = true;
  }
  if (!isNonEmptyString(image.backdropFilter) && isNonEmptyString(variant.backdropFilter)) {
    out.backdropFilter = variant.backdropFilter;
    changed = true;
  }
  if (!isNonEmptyString(image.overflow) && isNonEmptyString(variant.overflow)) {
    out.overflow = variant.overflow;
    changed = true;
  }
  if (!isBoolean(image.hidden) && isBoolean(variant.hidden)) {
    out.hidden = variant.hidden;
    changed = true;
  }
  if (!isBoolean(image.priority) && isBoolean(variant.priority)) {
    out.priority = variant.priority;
    changed = true;
  }

  if (!hasCustomMotion) {
    const motionTiming = asRecord(image.motionTiming);
    if (!motionTiming) {
      out.motionTiming = variantMotionTiming;
      changed = true;
    } else {
      const nextMotionTiming: Record<string, unknown> = { ...motionTiming };
      let motionChanged = false;
      if (!isNonEmptyString(nextMotionTiming.trigger)) {
        nextMotionTiming.trigger = variantMotionTiming.trigger;
        motionChanged = true;
      }
      if (!isNonEmptyString(nextMotionTiming.entrancePreset)) {
        nextMotionTiming.entrancePreset = variantMotionTiming.entrancePreset;
        motionChanged = true;
      }
      if (!isNonEmptyString(nextMotionTiming.exitPreset)) {
        nextMotionTiming.exitPreset = variantMotionTiming.exitPreset;
        motionChanged = true;
      }
      if (
        !isMotionExitTrigger(nextMotionTiming.exitTrigger) &&
        isMotionExitTrigger(variantMotionTiming.exitTrigger)
      ) {
        nextMotionTiming.exitTrigger = variantMotionTiming.exitTrigger;
        motionChanged = true;
      }
      if (nextMotionTiming.exitViewport == null && variantMotionTiming.exitViewport != null) {
        nextMotionTiming.exitViewport = variantMotionTiming.exitViewport;
        motionChanged = true;
      }
      if (nextMotionTiming.entranceMotion == null && variantMotionTiming.entranceMotion != null) {
        nextMotionTiming.entranceMotion = variantMotionTiming.entranceMotion;
        motionChanged = true;
      }
      if (nextMotionTiming.exitMotion == null && variantMotionTiming.exitMotion != null) {
        nextMotionTiming.exitMotion = variantMotionTiming.exitMotion;
        motionChanged = true;
      }
      if (motionChanged) {
        out.motionTiming = nextMotionTiming;
        changed = true;
      }
    }
  }

  return changed ? (out as ElementBlock) : el;
}

function processElement(el: unknown): unknown {
  const rec = asRecord(el);
  if (!rec || typeof rec.type !== "string") return el;
  if (rec.type === "cssGradient") return el;

  let changed = false;
  let withDefaults = el as ElementBlock;
  const applyDefaults = APPLY_DEFAULTS_BY_TYPE[rec.type];
  if (applyDefaults) {
    withDefaults = applyDefaults(withDefaults);
  }
  if (withDefaults !== el) changed = true;
  const result = structuredClone(withDefaults as Record<string, unknown>);

  // elementGroup / elementInfiniteScroll: recurse into section.definitions
  if (result.type === "elementGroup" || result.type === "elementInfiniteScroll") {
    const section = asRecord(result.section);
    const definitions = asRecord(section?.definitions);
    if (section && definitions) {
      const nextDefs: Record<string, unknown> = {};
      let defsChanged = false;
      for (const [k, def] of Object.entries(definitions)) {
        const nextDef = processElement(def);
        if (nextDef !== def) defsChanged = true;
        nextDefs[k] = nextDef;
      }
      if (defsChanged) {
        result.section = { ...section, definitions: nextDefs };
        changed = true;
      }
    }
  }

  // moduleConfig slots: recurse into nested definitions
  const moduleConfig = asRecord(result.moduleConfig);
  const slots = asRecord(moduleConfig?.slots);
  if (moduleConfig && slots) {
    const nextSlots: Record<string, unknown> = {};
    let slotsChanged = false;
    for (const [slotKey, slotVal] of Object.entries(slots)) {
      const slot = asRecord(slotVal);
      const section = asRecord(slot?.section);
      const definitions = asRecord(section?.definitions);
      if (!slot || !section || !definitions) {
        nextSlots[slotKey] = slotVal;
        continue;
      }
      const nextDefs: Record<string, unknown> = {};
      let defsChanged = false;
      for (const [defKey, defVal] of Object.entries(definitions)) {
        const nextDef = processElement(defVal);
        if (nextDef !== defVal) defsChanged = true;
        nextDefs[defKey] = nextDef;
      }
      if (defsChanged) {
        nextSlots[slotKey] = { ...slot, section: { ...section, definitions: nextDefs } };
        slotsChanged = true;
      } else {
        nextSlots[slotKey] = slotVal;
      }
    }
    if (slotsChanged) {
      result.moduleConfig = { ...moduleConfig, slots: nextSlots };
      changed = true;
    }
  }

  return changed ? result : el;
}

function processSection(section: SectionBlock): SectionBlock {
  const rec = asRecord(section);
  if (!rec) return section;
  let changed = false;
  const out: Record<string, unknown> = { ...rec };

  if (Array.isArray(rec.elements)) {
    const elements = rec.elements as unknown[];
    const nextElements = elements.map((el) => processElement(el));
    if (nextElements.some((el, i) => el !== elements[i])) {
      out.elements = nextElements;
      changed = true;
    }
  }

  if (rec.type === "revealSection") {
    if (Array.isArray(rec.collapsedElements)) {
      const collapsedElements = rec.collapsedElements as unknown[];
      const nextCollapsed = collapsedElements.map((el) => processElement(el));
      if (nextCollapsed.some((el, i) => el !== collapsedElements[i])) {
        out.collapsedElements = nextCollapsed;
        changed = true;
      }
    }
    if (Array.isArray(rec.revealedElements)) {
      const revealedElements = rec.revealedElements as unknown[];
      const nextRevealed = revealedElements.map((el) => processElement(el));
      if (nextRevealed.some((el, i) => el !== revealedElements[i])) {
        out.revealedElements = nextRevealed;
        changed = true;
      }
    }
  }

  return changed ? (out as SectionBlock) : section;
}

/**
 * Injects missing element-level defaults from `pbBuilderDefaultsV1` (image, heading, body, link
 * variant templates) before entrance-motion resolution and rendering.
 */
export function applyBuilderElementDefaultsToSections(sections: SectionBlock[]): SectionBlock[] {
  return sections.map((section) => processSection(section));
}
