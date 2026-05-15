import type { FontWeightMap } from "@/app/fonts/config";
import type { TypeScaleConfig } from "@/app/fonts/type-scale";

export type FontWorkbenchSlotName = "primary" | "secondary" | "mono";

export type FontWorkbenchSlotConfig = {
  family: string;
  weights: FontWeightMap;
  italic: boolean;
  source: "local" | "webfont";
};

const DEFAULT_WEIGHTS: FontWeightMap = {
  thin: 100,
  light: 300,
  regular: 400,
  book: 500,
  bold: 700,
  black: 900,
};

export const DEV_NEUTRAL_FONT_CONFIGS: Record<FontWorkbenchSlotName, FontWorkbenchSlotConfig> = {
  primary: {
    family: "Manrope",
    weights: { ...DEFAULT_WEIGHTS },
    italic: true,
    source: "webfont",
  },
  secondary: {
    family: "Lora",
    weights: { ...DEFAULT_WEIGHTS },
    italic: true,
    source: "webfont",
  },
  mono: {
    family: "IBM Plex Mono",
    weights: { ...DEFAULT_WEIGHTS },
    italic: false,
    source: "webfont",
  },
};

export const DEV_NEUTRAL_TYPE_SCALE: TypeScaleConfig = {
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
