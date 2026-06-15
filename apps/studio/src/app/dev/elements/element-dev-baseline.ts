import {
  createPbBuilderDefaultsFromFoundations,
  pbBuilderDefaultsV1,
  type PbBodyDefaults,
  type PbHeadingDefaults,
  type PbImageAnimationDefaults,
  type PbImageDefaults,
  type PbLinkDefaults,
  type PbBuilderDefaults,
  type PbBuilderFoundations,
} from "@/app/theme/pb-builder-defaults";

export const DEV_NEUTRAL_PB_FOUNDATIONS: PbBuilderFoundations = {
  alignment: "start",
  spacingBaseRem: 0.75,
  radiusBaseRem: 0.5,
};

export const DEV_NEUTRAL_PB_DEFAULTS: PbBuilderDefaults = createPbBuilderDefaultsFromFoundations(
  DEV_NEUTRAL_PB_FOUNDATIONS
);

export function cloneTypographyAnimationFromImageDefaults(
  imageDefaults: PbImageDefaults
): PbImageAnimationDefaults {
  return JSON.parse(
    JSON.stringify(imageDefaults.variants[imageDefaults.defaultVariant].animation)
  ) as PbImageAnimationDefaults;
}

function withTypographyAnimation<K extends string, T extends Record<string, unknown>>(
  variants: Record<K, T>,
  animationSeed: PbImageAnimationDefaults
): Record<K, T & { animation: PbImageAnimationDefaults }> {
  const out = {} as Record<K, T & { animation: PbImageAnimationDefaults }>;
  for (const key of Object.keys(variants) as K[]) {
    out[key] = {
      ...variants[key],
      animation: JSON.parse(JSON.stringify(animationSeed)) as PbImageAnimationDefaults,
    };
  }
  return out;
}

export function createTypographyDevDefaults(source: Pick<PbBuilderDefaults, "elements">): {
  heading: PbHeadingDefaults;
  body: PbBodyDefaults;
  link: PbLinkDefaults;
} {
  const animationSeed = cloneTypographyAnimationFromImageDefaults(source.elements.image);
  return {
    heading: {
      defaultVariant: source.elements.heading.defaultVariant,
      variants: withTypographyAnimation(source.elements.heading.variants, animationSeed),
    },
    body: {
      defaultVariant: source.elements.body.defaultVariant,
      variants: withTypographyAnimation(source.elements.body.variants, animationSeed),
    },
    link: {
      defaultVariant: source.elements.link.defaultVariant,
      variants: withTypographyAnimation(source.elements.link.variants, animationSeed),
    },
  };
}

const NEUTRAL_TYPOGRAPHY_DEFAULTS = createTypographyDevDefaults(DEV_NEUTRAL_PB_DEFAULTS);
const PRODUCTION_TYPOGRAPHY_DEFAULTS = createTypographyDevDefaults(pbBuilderDefaultsV1);

export const DEV_NEUTRAL_IMAGE_DEFAULTS: PbImageDefaults = DEV_NEUTRAL_PB_DEFAULTS.elements.image;
export const DEV_NEUTRAL_HEADING_DEFAULTS: PbHeadingDefaults = NEUTRAL_TYPOGRAPHY_DEFAULTS.heading;
export const DEV_NEUTRAL_BODY_DEFAULTS: PbBodyDefaults = NEUTRAL_TYPOGRAPHY_DEFAULTS.body;
export const DEV_NEUTRAL_LINK_DEFAULTS: PbLinkDefaults = NEUTRAL_TYPOGRAPHY_DEFAULTS.link;

export const DEV_PRODUCTION_IMAGE_DEFAULTS: PbImageDefaults = pbBuilderDefaultsV1.elements.image;
export const DEV_PRODUCTION_HEADING_DEFAULTS: PbHeadingDefaults =
  PRODUCTION_TYPOGRAPHY_DEFAULTS.heading;
export const DEV_PRODUCTION_BODY_DEFAULTS: PbBodyDefaults = PRODUCTION_TYPOGRAPHY_DEFAULTS.body;
export const DEV_PRODUCTION_LINK_DEFAULTS: PbLinkDefaults = PRODUCTION_TYPOGRAPHY_DEFAULTS.link;
