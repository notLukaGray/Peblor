import type { CSSProperties } from "react";

import type { PbContentGuidelines } from "./pb-guidelines-expand";
import type { PbBuilderDefaults, PbBuilderFoundations } from "./pb-builder-defaults.types";
import { createImageAnimationFineTune } from "./pb-builder-defaults.animation";

const MIN_SPACING_REM = 0.125;
const MIN_RADIUS_REM = 0.25;

function rem(n: number): string {
  return `${n}rem`;
}

function normalizeSpacingBaseRem(n: number): number {
  return Number.isFinite(n) ? Math.max(MIN_SPACING_REM, n) : MIN_SPACING_REM;
}

function normalizeRadiusBaseRem(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function toTextAlign(
  alignment: PbBuilderFoundations["alignment"]
): NonNullable<CSSProperties["textAlign"]> {
  if (alignment === "center") return "center";
  if (alignment === "end") return "right";
  return "start";
}

function toFlexAlignItems(
  alignment: PbBuilderFoundations["alignment"]
): NonNullable<CSSProperties["alignItems"]> {
  if (alignment === "center") return "center";
  if (alignment === "end") return "flex-end";
  return "flex-start";
}

function toFlexJustifyContent(alignment: PbBuilderFoundations["alignment"]): string {
  if (alignment === "center") return "center";
  if (alignment === "end") return "flex-end";
  return "flex-start";
}

export const DEFAULT_PB_BUILDER_FOUNDATIONS: PbBuilderFoundations = {
  alignment: "center",
  spacingBaseRem: 0.5,
  radiusBaseRem: 0.375,
  sectionGap: null,
};

/**
 * Foundations-first generator for grouped peblor defaults.
 * Colors/fonts remain managed in their own tools; this controls spacing/alignment/radius defaults.
 */
export function createPbBuilderDefaultsFromFoundations(
  foundations: PbBuilderFoundations
): PbBuilderDefaults {
  const spacingBaseRem = normalizeSpacingBaseRem(foundations.spacingBaseRem);
  const radiusBaseRem = normalizeRadiusBaseRem(foundations.radiusBaseRem);
  const textAlign = toTextAlign(foundations.alignment);
  const alignItems = toFlexAlignItems(foundations.alignment);
  const justifyContent = toFlexJustifyContent(foundations.alignment);
  const radiusCss = rem(Math.max(MIN_RADIUS_REM, radiusBaseRem));

  return {
    version: 1,
    foundations: {
      alignment: foundations.alignment,
      spacingBaseRem,
      radiusBaseRem,
    },
    sections: {
      defaultTextAlign: textAlign,
    },
    modules: {
      frame: {
        gapWhenUnset: rem(spacingBaseRem * 2),
        rowGapWhenUnset: null,
        columnGapWhenUnset: null,
        alignItemsDefault: alignItems,
        flexDirectionDefault: "row",
        justifyContentDefault: justifyContent,
        paddingDefault: "0",
        flexWrapDefault: "nowrap",
        borderRadiusDefault: radiusCss,
      },
    },
    elements: {
      richText: {
        paragraphGap: rem(spacingBaseRem),
        codeBorderRadius: rem(Math.max(MIN_RADIUS_REM, spacingBaseRem)),
        headingH1Margin: `${rem(spacingBaseRem * 2)} ${rem(spacingBaseRem * 0.5)}`,
        headingH1MarginTop: null,
        headingH1MarginBottom: null,
        headingH2Margin: `${rem(spacingBaseRem * 1.5)} ${rem(spacingBaseRem * 0.5)}`,
        headingH2MarginTop: null,
        headingH2MarginBottom: null,
        headingH3Margin: `${rem(spacingBaseRem * 1)} ${rem(spacingBaseRem * 0.5)}`,
        headingH3MarginTop: null,
        headingH3MarginBottom: null,
        listMarginY: rem(spacingBaseRem),
        blockquoteMarginY: rem(spacingBaseRem),
        hrMarginY: rem(spacingBaseRem * 1.5),
        preWrapMarginY: rem(spacingBaseRem * 1.5),
      },
      button: {
        labelGap: rem(spacingBaseRem),
        nakedPadding: `${rem(spacingBaseRem)} ${rem(spacingBaseRem * 2.5)}`,
        nakedPaddingY: null,
        nakedPaddingX: null,
        nakedBorderRadius: radiusCss,
        defaultVariant: "default",
        variants: {
          default: {
            typography: { copyType: "body", level: 4 },
          },
          accent: {
            typography: { copyType: "body", level: 3 },
            wrapperFill: "var(--pb-accent)",
            wrapperBorderRadius: radiusCss,
          },
          ghost: {
            typography: { copyType: "body", level: 5 },
            wrapperStroke: "var(--pb-border)",
            wrapperBorderRadius: radiusCss,
          },
          /** Naked text link — no wrapper styling, just typography binding. */
          text: {
            typography: { copyType: "body", level: 5 },
          },
        },
      },
      image: {
        borderRadius: radiusCss,
        defaultVariant: "hero",
        variants: {
          hero: {
            layoutMode: "aspectRatio",
            objectFit: "cover",
            aspectRatio: "16 / 9",
            borderRadius: radiusCss,
            objectPosition: "center",
            selfAlign: "center",
            alignY: "center",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            scroll: "hidden",
            hidden: false,
            priority: true,
            animation: {
              trigger: "onFirstVisible",
              exitTrigger: "manual",
              entrancePreset: "slideUp",
              exitPreset: "fade",
              fineTune: createImageAnimationFineTune("up", "up"),
            },
          },
          inline: {
            layoutMode: "aspectRatio",
            objectFit: "contain",
            aspectRatio: "4 / 3",
            borderRadius: radiusCss,
            objectPosition: "center",
            selfAlign: "left",
            alignY: "top",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            scroll: "visible",
            hidden: false,
            priority: false,
            animation: {
              trigger: "onFirstVisible",
              exitTrigger: "manual",
              entrancePreset: "fade",
              exitPreset: "fade",
              fineTune: createImageAnimationFineTune("none", "none"),
            },
          },
          fullCover: {
            layoutMode: "fill",
            objectFit: "cover",
            width: "100%",
            height: "100%",
            borderRadius: "0",
            objectPosition: "center",
            selfAlign: "center",
            alignY: "center",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            scroll: "hidden",
            hidden: false,
            priority: true,
            animation: {
              trigger: "onMount",
              exitTrigger: "manual",
              entrancePreset: "fade",
              exitPreset: "fade",
              fineTune: createImageAnimationFineTune("none", "none"),
            },
          },
          feature: {
            layoutMode: "aspectRatio",
            objectFit: "cover",
            aspectRatio: "3 / 4",
            borderRadius: radiusCss,
            objectPosition: "center top",
            selfAlign: "center",
            alignY: "center",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            scroll: "hidden",
            hidden: false,
            priority: false,
            animation: {
              trigger: "onFirstVisible",
              exitTrigger: "manual",
              entrancePreset: "slideLeft",
              exitPreset: "slideRight",
              fineTune: createImageAnimationFineTune("left", "right"),
            },
          },
          crop: {
            layoutMode: "aspectRatio",
            objectFit: "crop",
            aspectRatio: "16 / 9",
            borderRadius: radiusCss,
            objectPosition: "center",
            imageCrop: { x: 0, y: 0, scale: 1 },
            selfAlign: "center",
            alignY: "center",
            flipHorizontal: false,
            flipVertical: false,
            opacity: 1,
            scroll: "hidden",
            hidden: false,
            priority: false,
            animation: {
              trigger: "onFirstVisible",
              exitTrigger: "manual",
              entrancePreset: "fade",
              exitPreset: "fade",
              fineTune: createImageAnimationFineTune("none", "none"),
            },
          },
        },
      },
      video: {
        defaultVariant: "inline",
        variants: {
          inline: {
            objectFit: "cover",
            aspectRatio: "16 / 9",
            showPlayButton: true,
          },
          compact: {
            objectFit: "cover",
            aspectRatio: "4 / 3",
            module: "video-player-compact",
            showPlayButton: true,
          },
          fullcover: {
            objectFit: "cover",
            module: "video-player-full",
            showPlayButton: false,
          },
          hero: {
            objectFit: "cover",
            aspectRatio: "21 / 9",
            module: "video-player",
            showPlayButton: true,
            autoplay: true,
            loop: true,
            muted: true,
          },
        },
      },
      input: {
        defaultVariant: "default",
        variants: {
          default: {
            showIcon: true,
            color: "rgba(255,255,255,0.85)",
          },
          compact: {
            showIcon: false,
            color: "rgba(255,255,255,0.7)",
            height: "2.25rem",
          },
          minimal: {
            showIcon: false,
            color: "rgba(255,255,255,0.5)",
          },
        },
      },
      range: {
        defaultVariant: "default",
        variants: {
          default: {
            style: {
              trackColor: "rgba(255,255,255,0.2)",
              fillColor: "rgba(255,255,255,0.9)",
              trackHeight: "4px",
              thumbSize: "14px",
              borderRadius: "9999px",
            },
          },
          slim: {
            style: {
              trackColor: "rgba(255,255,255,0.1)",
              fillColor: "rgba(255,255,255,0.7)",
              trackHeight: "2px",
              thumbSize: "10px",
              borderRadius: "9999px",
            },
          },
          accent: {
            style: {
              trackColor: "rgba(255,255,255,0.15)",
              fillColor: "#a78bfa",
              trackHeight: "4px",
              thumbSize: "16px",
              borderRadius: "9999px",
            },
          },
        },
      },
      spacer: {
        defaultVariant: "md",
        variants: {
          sm: { height: "1rem" },
          md: { height: "2rem" },
          lg: { height: "4rem" },
        },
      },
      heading: {
        defaultVariant: "display",
        variants: {
          display: {
            variant: "display",
            level: 1,
            text: "Display heading",
            wordWrap: true,
            selfAlign: "left",
            alignY: "center",
          },
          section: {
            variant: "section",
            level: 2,
            text: "Section heading",
            wordWrap: true,
            selfAlign: "left",
            alignY: "top",
          },
          label: {
            variant: "label",
            level: 5,
            text: "Eyebrow label",
            wordWrap: true,
            selfAlign: "left",
            alignY: "center",
          },
        },
      },
      body: {
        defaultVariant: "standard",
        variants: {
          lead: {
            variant: "lead",
            text: "Lead paragraph for introductions and hero copy that should read larger than body text.",
            level: 2,
            wordWrap: true,
            selfAlign: "left",
            alignY: "top",
          },
          standard: {
            variant: "standard",
            text: "Standard body copy for descriptions, lists, and long-form content in layouts.",
            level: 4,
            wordWrap: true,
            selfAlign: "left",
            alignY: "top",
          },
          fine: {
            variant: "fine",
            text: "Fine print, captions, and tertiary supporting text.",
            level: 6,
            wordWrap: true,
            selfAlign: "left",
            alignY: "top",
          },
        },
      },
      link: {
        defaultVariant: "inline",
        variants: {
          inline: {
            variant: "inline",
            label: "Inline link",
            href: "/",
            external: false,
            copyType: "body",
            level: 4,
            wordWrap: true,
            selfAlign: "left",
            alignY: "center",
          },
          emphasis: {
            variant: "emphasis",
            label: "Emphasized link",
            href: "/work",
            external: false,
            copyType: "heading",
            level: 3,
            wordWrap: true,
            selfAlign: "left",
            alignY: "center",
          },
          nav: {
            variant: "nav",
            label: "Navigation link",
            href: "/about",
            external: false,
            copyType: "body",
            level: 4,
            wordWrap: true,
            selfAlign: "center",
            alignY: "center",
          },
        },
      },
    },
  };
}

/**
 * Future-facing grouped defaults model.
 * This is intentionally organized by peblor domains instead of a flat token list.
 */
let pbBuilderDefaultsV1Cache: PbBuilderDefaults | null = null;

export function getPbBuilderDefaultsV1(): PbBuilderDefaults {
  if (pbBuilderDefaultsV1Cache) return pbBuilderDefaultsV1Cache;
  pbBuilderDefaultsV1Cache = createPbBuilderDefaultsFromFoundations(DEFAULT_PB_BUILDER_FOUNDATIONS);
  return pbBuilderDefaultsV1Cache;
}

/**
 * Compatibility adapter while runtime still consumes the flat content-guidelines shape.
 */
export function toPbContentGuidelines(defaults: PbBuilderDefaults): PbContentGuidelines {
  const frame = defaults.modules.frame;
  const rich = defaults.elements.richText;
  const btn = defaults.elements.button;
  return {
    copyTextAlign: defaults.sections.defaultTextAlign,
    frameGapWhenUnset: frame.gapWhenUnset,
    frameRowGapWhenUnset: frame.rowGapWhenUnset,
    frameColumnGapWhenUnset: frame.columnGapWhenUnset,
    frameAlignItemsDefault: frame.alignItemsDefault,
    frameFlexDirectionDefault: frame.flexDirectionDefault,
    frameJustifyContentDefault: frame.justifyContentDefault,
    framePaddingDefault: frame.paddingDefault,
    frameFlexWrapDefault: frame.flexWrapDefault,
    frameBorderRadiusDefault: frame.borderRadiusDefault,
    richTextParagraphGap: rich.paragraphGap,
    richTextCodeBorderRadius: rich.codeBorderRadius,
    richTextHeadingH1Margin: rich.headingH1Margin,
    richTextHeadingH1MarginTop: rich.headingH1MarginTop,
    richTextHeadingH1MarginBottom: rich.headingH1MarginBottom,
    richTextHeadingH2Margin: rich.headingH2Margin,
    richTextHeadingH2MarginTop: rich.headingH2MarginTop,
    richTextHeadingH2MarginBottom: rich.headingH2MarginBottom,
    richTextHeadingH3Margin: rich.headingH3Margin,
    richTextHeadingH3MarginTop: rich.headingH3MarginTop,
    richTextHeadingH3MarginBottom: rich.headingH3MarginBottom,
    richTextListMarginY: rich.listMarginY,
    richTextBlockquoteMarginY: rich.blockquoteMarginY,
    richTextHrMarginY: rich.hrMarginY,
    richTextPreWrapMarginY: rich.preWrapMarginY,
    buttonLabelGap: btn.labelGap,
    buttonNakedPadding: btn.nakedPadding,
    buttonNakedPaddingY: btn.nakedPaddingY,
    buttonNakedPaddingX: btn.nakedPaddingX,
    buttonNakedBorderRadius: btn.nakedBorderRadius,
    sectionGap: defaults.foundations.sectionGap ?? null,
  };
}

/**
 * Shared-radius helper for linked defaults across elements/modules.
 * Example: raising button radius can also raise image/module frame radius in one edit.
 */
export function withUnifiedRadius(
  defaults: PbBuilderDefaults,
  radiusCss: string
): PbBuilderDefaults {
  return {
    ...defaults,
    modules: {
      ...defaults.modules,
      frame: {
        ...defaults.modules.frame,
        borderRadiusDefault: radiusCss,
      },
    },
    elements: {
      ...defaults.elements,
      button: {
        ...defaults.elements.button,
        nakedBorderRadius: radiusCss,
      },
      image: {
        ...defaults.elements.image,
        borderRadius: radiusCss,
        variants: {
          ...defaults.elements.image.variants,
          hero: {
            ...defaults.elements.image.variants.hero,
            borderRadius: radiusCss,
          },
          inline: {
            ...defaults.elements.image.variants.inline,
            borderRadius: radiusCss,
          },
          feature: {
            ...defaults.elements.image.variants.feature,
            borderRadius: radiusCss,
          },
          crop: {
            ...defaults.elements.image.variants.crop,
            borderRadius: radiusCss,
          },
        },
      },
    },
  };
}
