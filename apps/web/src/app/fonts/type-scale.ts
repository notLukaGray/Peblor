import type { FontWeightRole } from "./config";

export type TypeScaleEntry = {
  sizeDesktop: number;

  sizeMobile: number;

  lineHeightDesktop: number;

  lineHeightMobile: number;

  letterSpacing: string;

  fontWeightRole: FontWeightRole;
};

export type TypeScaleConfig = {
  // ── Headings (XS → 2XL, smallest → largest) ───────────────────────────────
  headingXs: TypeScaleEntry;
  headingSm: TypeScaleEntry;
  headingMd: TypeScaleEntry;
  headingLg: TypeScaleEntry;
  headingXl: TypeScaleEntry;
  heading2xl: TypeScaleEntry;

  // ── Body (XS → 2XL, smallest → largest) ───────────────────────────────────
  bodyXs: TypeScaleEntry;
  bodySm: TypeScaleEntry;
  bodyMd: TypeScaleEntry;
  bodyLg: TypeScaleEntry;
  bodyXl: TypeScaleEntry;
  body2xl: TypeScaleEntry;
};

export const typeScaleConfig: TypeScaleConfig = {
  headingXs: {
    sizeDesktop: 20,
    sizeMobile: 16,
    lineHeightDesktop: 24,
    lineHeightMobile: 20,
    letterSpacing: "0",
    fontWeightRole: "regular",
  },
  headingSm: {
    sizeDesktop: 24,
    sizeMobile: 18,
    lineHeightDesktop: 30,
    lineHeightMobile: 24,
    letterSpacing: "0",
    fontWeightRole: "book",
  },
  headingMd: {
    sizeDesktop: 30,
    sizeMobile: 22,
    lineHeightDesktop: 36,
    lineHeightMobile: 28,
    letterSpacing: "0",
    fontWeightRole: "book",
  },
  headingLg: {
    sizeDesktop: 38,
    sizeMobile: 28,
    lineHeightDesktop: 44,
    lineHeightMobile: 34,
    letterSpacing: "0",
    fontWeightRole: "bold",
  },
  headingXl: {
    sizeDesktop: 48,
    sizeMobile: 34,
    lineHeightDesktop: 54,
    lineHeightMobile: 40,
    letterSpacing: "0",
    fontWeightRole: "bold",
  },
  heading2xl: {
    sizeDesktop: 62,
    sizeMobile: 42,
    lineHeightDesktop: 70,
    lineHeightMobile: 48,
    letterSpacing: "0",
    fontWeightRole: "black",
  },
  bodyXs: {
    sizeDesktop: 12,
    sizeMobile: 11,
    lineHeightDesktop: 18,
    lineHeightMobile: 16,
    letterSpacing: "0",
    fontWeightRole: "regular",
  },
  bodySm: {
    sizeDesktop: 14,
    sizeMobile: 12,
    lineHeightDesktop: 20,
    lineHeightMobile: 18,
    letterSpacing: "0",
    fontWeightRole: "regular",
  },
  bodyMd: {
    sizeDesktop: 16,
    sizeMobile: 14,
    lineHeightDesktop: 24,
    lineHeightMobile: 20,
    letterSpacing: "0",
    fontWeightRole: "regular",
  },
  bodyLg: {
    sizeDesktop: 18,
    sizeMobile: 16,
    lineHeightDesktop: 27,
    lineHeightMobile: 24,
    letterSpacing: "0",
    fontWeightRole: "book",
  },
  bodyXl: {
    sizeDesktop: 22,
    sizeMobile: 18,
    lineHeightDesktop: 32,
    lineHeightMobile: 26,
    letterSpacing: "0",
    fontWeightRole: "book",
  },
  body2xl: {
    sizeDesktop: 26,
    sizeMobile: 20,
    lineHeightDesktop: 38,
    lineHeightMobile: 30,
    letterSpacing: "0",
    fontWeightRole: "book",
  },
};

export const TYPE_SCALE_VAR_PREFIXES: Record<keyof TypeScaleConfig, string> = {
  headingXs: "--type-heading-xs",
  headingSm: "--type-heading-sm",
  headingMd: "--type-heading-md",
  headingLg: "--type-heading-lg",
  headingXl: "--type-heading-xl",
  heading2xl: "--type-heading-2xl",
  bodyXs: "--type-body-xs",
  bodySm: "--type-body-sm",
  bodyMd: "--type-body-md",
  bodyLg: "--type-body-lg",
  bodyXl: "--type-body-xl",
  body2xl: "--type-body-2xl",
};

export const TYPE_SCALE_LABELS: Record<keyof TypeScaleConfig, string> = {
  headingXs: "Heading Extra Small",
  headingSm: "Heading Small",
  headingMd: "Heading Medium",
  headingLg: "Heading Large",
  headingXl: "Heading Extra Large",
  heading2xl: "Heading Double Extra Large",
  bodyXs: "Body Extra Small",
  bodySm: "Body Small",
  bodyMd: "Body Medium",
  bodyLg: "Body Large",
  bodyXl: "Body Extra Large",
  body2xl: "Body Double Extra Large",
};

export const TYPE_SCALE_SHORT_TAG: Record<keyof TypeScaleConfig, string> = {
  headingXs: "XS",
  headingSm: "SM",
  headingMd: "MD",
  headingLg: "LG",
  headingXl: "XL",
  heading2xl: "2XL",
  bodyXs: "XS",
  bodySm: "SM",
  bodyMd: "MD",
  bodyLg: "LG",
  bodyXl: "XL",
  body2xl: "2XL",
};

export const TYPE_SCALE_UTILITY_CLASS: Record<keyof TypeScaleConfig, string> = {
  headingXs: "typography-heading-xs",
  headingSm: "typography-heading-sm",
  headingMd: "typography-heading-md",
  headingLg: "typography-heading-lg",
  headingXl: "typography-heading-xl",
  heading2xl: "typography-heading-2xl",
  bodyXs: "typography-body-xs",
  bodySm: "typography-body-sm",
  bodyMd: "typography-body-md",
  bodyLg: "typography-body-lg",
  bodyXl: "typography-body-xl",
  body2xl: "typography-body-2xl",
};

export const TYPE_SCALE_LEGACY_KEYS: Record<string, keyof TypeScaleConfig> = {
  headingPrimary: "heading2xl",
  headingSecondary: "headingXl",
  headingTertiaryBold: "headingLg",
  headingTertiaryLight: "headingMd",
  headingCardBold: "headingSm",
  headingCardLight: "headingXs",
  bodyLargeRegular: "body2xl",
  bodyLargeThin: "bodyXl",
  bodyMediumRegular: "bodyLg",
  bodyMediumThin: "bodyMd",
  bodyLegalBook: "bodySm",
  bodyLegalLight: "bodyXs",
};

export const TYPE_SCALE_PREVIOUS_TSHIRT_SLOT_MAP: Record<string, keyof TypeScaleConfig> = {
  headingXl: "heading2xl",
  headingLg: "headingXl",
  headingMd: "headingLg",
  headingSm: "headingMd",
  headingXs: "headingSm",
  heading2xs: "headingXs",
  bodyXl: "body2xl",
  bodyLg: "bodyXl",
  bodyMd: "bodyLg",
  bodySm: "bodyMd",
  bodyXs: "bodySm",
  body2xs: "bodyXs",
};
