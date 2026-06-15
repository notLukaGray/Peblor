import type { CSSProperties } from "react";
import type { ElementBlock, ElementBodyVariant, ElementImageObjectFit } from "@pb/contracts";
import type { ResponsiveValueOf } from "@pb/contracts/peblor/core/peblor-schemas/responsive-value-schemas";
import type { HeadingLevel } from "../element-body-typography";

export type PbTypographyBinding =
  | { copyType: "body"; level: ElementBodyVariant }
  | { copyType: "heading"; level: HeadingLevel };

export type PbBuilderFoundations = {
  alignment: "start" | "center" | "end";
  spacingBaseRem: number;
  radiusBaseRem: number;
  sectionGap?: string | null;
};

export type PbSectionDefaults = {
  defaultTextAlign: CSSProperties["textAlign"];
};

export type PbModuleFrameDefaults = {
  gapWhenUnset: string | null;
  rowGapWhenUnset: string | null;
  columnGapWhenUnset: string | null;
  alignItemsDefault: NonNullable<CSSProperties["alignItems"]>;
  flexDirectionDefault: NonNullable<CSSProperties["flexDirection"]>;
  justifyContentDefault: string;
  paddingDefault: string;
  flexWrapDefault: NonNullable<CSSProperties["flexWrap"]>;
  borderRadiusDefault: string;
};

export type PbRichTextDefaults = {
  paragraphGap: string;
  codeBorderRadius: string;
  headingH1Margin: string;
  headingH1MarginTop: string | null;
  headingH1MarginBottom: string | null;
  headingH2Margin: string;
  headingH2MarginTop: string | null;
  headingH2MarginBottom: string | null;
  headingH3Margin: string;
  headingH3MarginTop: string | null;
  headingH3MarginBottom: string | null;
  listMarginY: string;
  blockquoteMarginY: string;
  hrMarginY: string;
  preWrapMarginY: string;
};

export type PbButtonVariantKey = "default" | "accent" | "ghost" | "text";

export type PbButtonVariantDefaults = {
  typography: PbTypographyBinding;
  wrapperFill?: string;
  wrapperStroke?: string;
  wrapperPadding?: string;
  wrapperBorderRadius?: string;
};

export type PbButtonDefaults = {
  labelGap: string;
  nakedPadding: string;
  nakedPaddingY: string | null;
  nakedPaddingX: string | null;
  nakedBorderRadius: string;
  defaultVariant: PbButtonVariantKey;
  variants: Record<PbButtonVariantKey, PbButtonVariantDefaults>;
};

export type PbImageDefaults = {
  borderRadius: string;
  defaultVariant: PbImageVariantKey;
  variants: Record<PbImageVariantKey, PbImageVariantDefaults>;
};

export type PbImageVariantKey = "hero" | "inline" | "fullCover" | "feature" | "crop";

export type PbImageAnimationTrigger = "onMount" | "onFirstVisible" | "onEveryVisible" | "onTrigger";

/** Exit presence semantics for `motionTiming` / ElementExitWrapper. */
export type PbImageExitTrigger = "manual" | "leaveViewport";

/** Intersection options (mirrors motion `viewport` / `exitViewport` schema). */
export type PbImageMotionViewport = {
  once?: boolean;
  amount?: number | "some" | "all";
  margin?: string;
};

export type PbImageAnimationPreset = string;

export type PbImageAnimationDirection = "none" | "up" | "down" | "left" | "right";
export type PbImageHybridStackPreset = "none" | "zoomIn" | "zoomOut" | "tiltIn";

export type PbImageAnimationCurvePreset =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "customBezier";

export type PbImageAnimationCurve = {
  preset: PbImageAnimationCurvePreset;
  customBezier: [number, number, number, number];
};

export type PbImageEntranceFineTune = {
  direction: PbImageAnimationDirection;
  distancePx: number;
  fromOpacity: number;
  toOpacity: number;
  fromX: number;
  toX: number;
  fromY: number;
  toY: number;
  fromScale: number;
  toScale: number;
  fromRotate: number;
  toRotate: number;
  duration: number;
  delay: number;
  curve: PbImageAnimationCurve;
};

export type PbImageExitFineTune = {
  direction: PbImageAnimationDirection;
  distancePx: number;
  toOpacity: number;
  toX: number;
  toY: number;
  toScale: number;
  toRotate: number;
  duration: number;
  delay: number;
  curve: PbImageAnimationCurve;
};

/** Independent animation mode per side (UI labels: Preset / Hybrid / Complex). */
export type PbImageSideAnimationBehavior = "preset" | "hybrid" | "custom";

export type PbImageAnimationFineTune = {
  entranceBehavior: PbImageSideAnimationBehavior;
  exitBehavior: PbImageSideAnimationBehavior;
  /** Hybrid entrance: parallel vs sequential keyframes. */
  hybridCompositionIn: "ordered" | "layered";
  /** Layered hybrid only: stagger each stack layer by this delay (seconds) when enabled. */
  hybridLayerStaggerEnabled: boolean;
  hybridLayerStaggerSec: number;
  /** Ordered hybrid entrance: per-step weights vs equal splits. */
  hybridOrderedUseStepDurations: boolean;
  hybridOrderedStepDurations: number[];
  /** Ordered stack layers merged shallowly on top of base entrance preset (first → last wins on conflicts). */
  hybridStackIn: PbImageHybridStackPreset[];
  /** Ordered stack layers merged on top of base exit preset. */
  hybridStackOut: PbImageHybridStackPreset[];
  /** Hybrid / ordered entrance total duration (seconds); independent from exit. */
  hybridEntranceDuration: number;
  /** Hybrid exit total duration (seconds). */
  hybridExitDuration: number;
  entrance: PbImageEntranceFineTune;
  exit: PbImageExitFineTune;
};

export type PbImageAnimationDefaults = {
  trigger: PbImageAnimationTrigger;
  /** When / how exit runs in ElementExitWrapper (mirrors `motionTiming.exitTrigger`). */
  exitTrigger: PbImageExitTrigger;
  exitViewport?: PbImageMotionViewport;
  entrancePreset: PbImageAnimationPreset;
  exitPreset: PbImageAnimationPreset;
  /** Optional tween duration overrides for preset-based entrance/exit resolution (seconds). */
  presetEntranceDuration?: number;
  presetExitDuration?: number;
  fineTune: PbImageAnimationFineTune;
};

export type PbImageLayoutMode = "aspectRatio" | "fill" | "constraints";

export type PbResponsiveValue<T> = ResponsiveValueOf<T>;
export type PbImageConstraintValues = {
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
};
export type PbResponsiveImageConstraints = PbResponsiveValue<PbImageConstraintValues | undefined>;

export type PbImageVariantDefaults = {
  layoutMode: PbImageLayoutMode;
  objectFit: PbResponsiveValue<ElementImageObjectFit>;
  aspectRatio?: PbResponsiveValue<string>;
  width?: PbResponsiveValue<string>;
  height?: PbResponsiveValue<string>;
  constraints?: PbResponsiveImageConstraints;
  borderRadius: PbResponsiveValue<string>;
  objectPosition?: string;
  /** Pan/zoom inside a fixed frame when `objectFit` is `crop`. x/y are % translate; scale ≥ 1 zooms in from cover baseline. focalX/focalY are 0–1 metadata only (no CSS). */
  imageCrop?: { x: number; y: number; scale: number; focalX?: number; focalY?: number };
  selfAlign?: PbResponsiveValue<"left" | "center" | "right">;
  alignY?: PbResponsiveValue<"top" | "center" | "bottom">;
  marginTop?: PbResponsiveValue<string>;
  marginBottom?: PbResponsiveValue<string>;
  marginLeft?: PbResponsiveValue<string>;
  marginRight?: PbResponsiveValue<string>;
  /** Stacking order on the layout wrapper (`elementLayoutSchema.layer`). */
  layer?: number;
  rotate?: number | string;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  opacity?: number;
  blendMode?: string;
  boxShadow?: string;
  filter?: string;
  bgBlur?: string;
  scroll?: "hidden" | "visible" | "auto" | "scroll";
  hidden?: boolean;
  priority?: boolean;
  animation: PbImageAnimationDefaults;
};

export type PbInputVariantKey = "default" | "compact" | "minimal";

export type PbInputVariantDefaults = {
  showIcon?: boolean;
  color?: string;
  height?: string;
};

export type PbInputDefaults = {
  defaultVariant: PbInputVariantKey;
  variants: Record<PbInputVariantKey, PbInputVariantDefaults>;
};

export type PbRangeVariantKey = "default" | "slim" | "accent";

export type PbRangeVariantDefaults = {
  style: {
    trackColor: string;
    fillColor: string;
    trackHeight: string;
    thumbSize: string;
    borderRadius: string;
  };
};

export type PbRangeDefaults = {
  defaultVariant: PbRangeVariantKey;
  variants: Record<PbRangeVariantKey, PbRangeVariantDefaults>;
};

export type PbSpacerVariantKey = "sm" | "md" | "lg";

export type PbSpacerVariantDefaults = {
  height: string;
};

export type PbSpacerDefaults = {
  defaultVariant: PbSpacerVariantKey;
  variants: Record<PbSpacerVariantKey, PbSpacerVariantDefaults>;
};

export type PbWorkbenchElementDefaultSet<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  v?: number;
  defaultVariant: string;
  variants: Record<string, T>;
};

export type PbWorkbenchElementDefaults = {
  richText: PbWorkbenchElementDefaultSet;
  videoTime: PbWorkbenchElementDefaultSet;
  vector: PbWorkbenchElementDefaultSet;
  svg: PbWorkbenchElementDefaultSet;
  model3d: PbWorkbenchElementDefaultSet;
  rive: PbWorkbenchElementDefaultSet;
  scrollProgressBar: PbWorkbenchElementDefaultSet;
};

export type PbVideoVariantKey = "inline" | "compact" | "fullcover" | "hero";

export type PbVideoVariantDefaults = {
  objectFit: "cover" | "contain" | "fillWidth" | "fillHeight";
  aspectRatio?: string;
  module?: string;
  showPlayButton?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
};

export type PbVideoDefaults = {
  defaultVariant: PbVideoVariantKey;
  variants: Record<PbVideoVariantKey, PbVideoVariantDefaults>;
};

export type PbHeadingVariantKey = "display" | "section" | "label";

export type PbBodyVariantKey = "lead" | "standard" | "fine";

export type PbLinkVariantKey = "inline" | "emphasis" | "nav";

export type PbHeadingVariantDefaults = Omit<
  Extract<ElementBlock, { type: "elementHeading" }>,
  "type"
>;

export type PbBodyVariantDefaults = Omit<Extract<ElementBlock, { type: "elementBody" }>, "type">;

export type PbLinkVariantDefaults = Omit<Extract<ElementBlock, { type: "elementLink" }>, "type">;

export type PbHeadingDefaults = {
  defaultVariant: PbHeadingVariantKey;
  variants: Record<PbHeadingVariantKey, PbHeadingVariantDefaults>;
};

export type PbBodyDefaults = {
  defaultVariant: PbBodyVariantKey;
  variants: Record<PbBodyVariantKey, PbBodyVariantDefaults>;
};

export type PbLinkDefaults = {
  defaultVariant: PbLinkVariantKey;
  variants: Record<PbLinkVariantKey, PbLinkVariantDefaults>;
};

export type PbElementDefaults = {
  richText: PbRichTextDefaults;
  button: PbButtonDefaults;
  image: PbImageDefaults;
  video: PbVideoDefaults;
  input: PbInputDefaults;
  range: PbRangeDefaults;
  spacer: PbSpacerDefaults;
  heading: PbHeadingDefaults;
  body: PbBodyDefaults;
  link: PbLinkDefaults;
};

export type PbBuilderDefaults = {
  version: 1;
  foundations: PbBuilderFoundations;
  sections: PbSectionDefaults;
  modules: {
    frame: PbModuleFrameDefaults;
  };
  elements: PbElementDefaults;
  workbenchElements?: PbWorkbenchElementDefaults;
};
