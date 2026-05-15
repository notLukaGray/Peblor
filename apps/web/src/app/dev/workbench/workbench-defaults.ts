/* eslint-disable max-lines */
import type { ColorToolPersistedV2 } from "@/app/dev/colors/color-tool-persistence";
import {
  getDefaultColorToolPersistedV2,
  getProductionColorToolPersistedV2,
} from "@/app/dev/colors/color-tool-persistence";
import {
  DEV_NEUTRAL_BODY_DEFAULTS,
  DEV_NEUTRAL_HEADING_DEFAULTS,
  DEV_NEUTRAL_IMAGE_DEFAULTS,
  DEV_NEUTRAL_LINK_DEFAULTS,
  DEV_PRODUCTION_BODY_DEFAULTS,
  DEV_PRODUCTION_HEADING_DEFAULTS,
  DEV_PRODUCTION_IMAGE_DEFAULTS,
  DEV_PRODUCTION_LINK_DEFAULTS,
} from "@/app/dev/elements/element-dev-baseline";
import type { PersistedBodyDefaults } from "@/app/dev/elements/body/types";
import type { PersistedHeadingDefaults } from "@/app/dev/elements/heading/types";
import type { PersistedImageDefaults } from "@/app/dev/elements/image/types";
import type { PersistedLinkDefaults } from "@/app/dev/elements/link/types";
import { BASE_DEFAULTS as BUTTON_BASE_DEFAULTS } from "@/app/dev/elements/button/constants";
import type { PersistedButtonDefaults } from "@/app/dev/elements/button/types";
import { BASE_DEFAULTS as RICH_TEXT_BASE_DEFAULTS } from "@/app/dev/elements/rich-text/constants";
import type { PersistedRichTextDefaults } from "@/app/dev/elements/rich-text/types";
import { BASE_DEFAULTS as INPUT_BASE_DEFAULTS } from "@/app/dev/elements/input/constants";
import type { PersistedInputDefaults } from "@/app/dev/elements/input/types";
import { BASE_DEFAULTS as RANGE_BASE_DEFAULTS } from "@/app/dev/elements/range/constants";
import type { PersistedRangeDefaults } from "@/app/dev/elements/range/types";
import { BASE_DEFAULTS as VIDEO_BASE_DEFAULTS } from "@/app/dev/elements/video/constants";
import type { PersistedVideoDefaults } from "@/app/dev/elements/video/types";
import { BASE_DEFAULTS as VIDEO_TIME_BASE_DEFAULTS } from "@/app/dev/elements/video-time/constants";
import type { PersistedVideoTimeDefaults } from "@/app/dev/elements/video-time/types";
import { BASE_DEFAULTS as VECTOR_BASE_DEFAULTS } from "@/app/dev/elements/vector/constants";
import type { PersistedVectorDefaults } from "@/app/dev/elements/vector/types";
import { BASE_DEFAULTS as SVG_BASE_DEFAULTS } from "@/app/dev/elements/svg/constants";
import type { PersistedSvgDefaults } from "@/app/dev/elements/svg/types";
import { BASE_DEFAULTS as MODEL_3D_BASE_DEFAULTS } from "@/app/dev/elements/model-3d/constants";
import type { PersistedModel3dDefaults } from "@/app/dev/elements/model-3d/types";
import { BASE_DEFAULTS as RIVE_BASE_DEFAULTS } from "@/app/dev/elements/rive/constants";
import type { PersistedRiveDefaults } from "@/app/dev/elements/rive/types";
import { BASE_DEFAULTS as SPACER_BASE_DEFAULTS } from "@/app/dev/elements/spacer/constants";
import type { PersistedSpacerDefaults } from "@/app/dev/elements/spacer/types";
import { BASE_DEFAULTS as SCROLL_PROGRESS_BAR_BASE_DEFAULTS } from "@/app/dev/elements/scroll-progress-bar/constants";
import type { PersistedScrollProgressBarDefaults } from "@/app/dev/elements/scroll-progress-bar/types";
import {
  DEV_NEUTRAL_FONT_CONFIGS,
  DEV_NEUTRAL_TYPE_SCALE,
  type FontWorkbenchSlotConfig,
} from "@/app/dev/fonts/font-tool-baseline";
import {
  getDefaultStyleToolPersistedV3,
  getProductionStyleToolPersistedV3,
  type StyleToolPersistedV3,
} from "@/app/dev/style/style-tool-persistence";
import type { FontWeightMap } from "@/app/fonts/config";
import { monoFontConfig, primaryFontConfig, secondaryFontConfig } from "@/app/fonts/config";
import { typeScaleConfig } from "@/app/fonts/type-scale";
import {
  DEFAULT_LETTER_SPACING_SCALE,
  DEFAULT_LINE_HEIGHT_SCALE,
  type LetterSpacingScale,
  type LineHeightScale,
} from "@/app/theme/pb-spacing-tokens";
import {
  hasCompleteWorkbenchStorageShape,
  mergeWorkbenchSessionShape,
} from "@/app/dev/workbench/workbench-session-shape";

const DEFAULT_PREVIEW_PHRASE = "The quick brown fox jumps over the lazy dog. 0123456789";

export type FontWorkbenchPrefsV2 = {
  v: 2;
  configs: Record<
    "primary" | "secondary" | "mono",
    {
      family: string;
      weights: FontWeightMap;
      italic: boolean;
      source: "local" | "webfont";
      localRoleFiles?: Partial<Record<keyof FontWeightMap, string>>;
    }
  >;
  slotPreviewMode: Record<"primary" | "secondary" | "mono", "catalog" | "local">;
  typeScale: typeof typeScaleConfig;
  previewSampleText: string;
  lineHeightScale: LineHeightScale;
  letterSpacingScale: LetterSpacingScale;
};

function toSlotState(config: FontWorkbenchSlotConfig): FontWorkbenchPrefsV2["configs"]["primary"] {
  return {
    family: config.family,
    weights: { ...config.weights },
    italic: config.italic,
    source: config.source,
  };
}

function toProductionSlotState(
  cfg: typeof primaryFontConfig
): FontWorkbenchPrefsV2["configs"]["primary"] {
  return {
    family: cfg.webfont.family,
    weights: { ...cfg.weights },
    italic: cfg.italic,
    source: cfg.source === "local" ? "local" : "webfont",
  };
}

function createFontsWorkbenchPrefs(
  configs: Record<"primary" | "secondary" | "mono", FontWorkbenchPrefsV2["configs"]["primary"]>,
  scale: FontWorkbenchPrefsV2["typeScale"],
  lineHeightScale: LineHeightScale = DEFAULT_LINE_HEIGHT_SCALE,
  letterSpacingScale: LetterSpacingScale = DEFAULT_LETTER_SPACING_SCALE
): FontWorkbenchPrefsV2 {
  return {
    v: 2,
    configs,
    slotPreviewMode: { primary: "catalog", secondary: "catalog", mono: "catalog" },
    typeScale: structuredClone(scale),
    previewSampleText: DEFAULT_PREVIEW_PHRASE,
    lineHeightScale: { ...lineHeightScale },
    letterSpacingScale: { ...letterSpacingScale },
  };
}

export function getDefaultFontsWorkbenchPrefs(): FontWorkbenchPrefsV2 {
  return createFontsWorkbenchPrefs(
    {
      primary: toSlotState(DEV_NEUTRAL_FONT_CONFIGS.primary),
      secondary: toSlotState(DEV_NEUTRAL_FONT_CONFIGS.secondary),
      mono: toSlotState(DEV_NEUTRAL_FONT_CONFIGS.mono),
    },
    DEV_NEUTRAL_TYPE_SCALE
  );
}

export function getProductionFontsWorkbenchPrefs(): FontWorkbenchPrefsV2 {
  return createFontsWorkbenchPrefs(
    {
      primary: toProductionSlotState(primaryFontConfig),
      secondary: toProductionSlotState(secondaryFontConfig),
      mono: toProductionSlotState(monoFontConfig),
    },
    typeScaleConfig
  );
}

export function getDefaultImageElementPersisted(): PersistedImageDefaults {
  return {
    v: 3,
    defaultVariant: DEV_NEUTRAL_IMAGE_DEFAULTS.defaultVariant,
    variants: structuredClone(DEV_NEUTRAL_IMAGE_DEFAULTS.variants),
  };
}

export function getProductionImageElementPersisted(): PersistedImageDefaults {
  return {
    v: 3,
    defaultVariant: DEV_PRODUCTION_IMAGE_DEFAULTS.defaultVariant,
    variants: structuredClone(DEV_PRODUCTION_IMAGE_DEFAULTS.variants),
  };
}

export function getDefaultBodyElementPersisted(): PersistedBodyDefaults {
  return {
    v: 1,
    defaultVariant: DEV_NEUTRAL_BODY_DEFAULTS.defaultVariant,
    variants: structuredClone(
      DEV_NEUTRAL_BODY_DEFAULTS.variants
    ) as PersistedBodyDefaults["variants"],
  };
}

export function getProductionBodyElementPersisted(): PersistedBodyDefaults {
  return {
    v: 1,
    defaultVariant: DEV_PRODUCTION_BODY_DEFAULTS.defaultVariant,
    variants: structuredClone(
      DEV_PRODUCTION_BODY_DEFAULTS.variants
    ) as PersistedBodyDefaults["variants"],
  };
}

export function getDefaultHeadingElementPersisted(): PersistedHeadingDefaults {
  return {
    v: 1,
    defaultVariant: DEV_NEUTRAL_HEADING_DEFAULTS.defaultVariant,
    variants: structuredClone(
      DEV_NEUTRAL_HEADING_DEFAULTS.variants
    ) as PersistedHeadingDefaults["variants"],
  };
}

export function getProductionHeadingElementPersisted(): PersistedHeadingDefaults {
  return {
    v: 1,
    defaultVariant: DEV_PRODUCTION_HEADING_DEFAULTS.defaultVariant,
    variants: structuredClone(
      DEV_PRODUCTION_HEADING_DEFAULTS.variants
    ) as PersistedHeadingDefaults["variants"],
  };
}

export function getDefaultLinkElementPersisted(): PersistedLinkDefaults {
  return {
    v: 1,
    defaultVariant: DEV_NEUTRAL_LINK_DEFAULTS.defaultVariant,
    variants: structuredClone(
      DEV_NEUTRAL_LINK_DEFAULTS.variants
    ) as PersistedLinkDefaults["variants"],
  };
}

export function getProductionLinkElementPersisted(): PersistedLinkDefaults {
  return {
    v: 1,
    defaultVariant: DEV_PRODUCTION_LINK_DEFAULTS.defaultVariant,
    variants: structuredClone(
      DEV_PRODUCTION_LINK_DEFAULTS.variants
    ) as PersistedLinkDefaults["variants"],
  };
}

export function getDefaultButtonElementPersisted(): PersistedButtonDefaults {
  return {
    v: 1,
    defaultVariant: BUTTON_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(BUTTON_BASE_DEFAULTS.variants),
  };
}

export function getProductionButtonElementPersisted(): PersistedButtonDefaults {
  return getDefaultButtonElementPersisted();
}

export function getDefaultRichTextElementPersisted(): PersistedRichTextDefaults {
  return {
    v: 1,
    defaultVariant: RICH_TEXT_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(RICH_TEXT_BASE_DEFAULTS.variants),
  };
}

export function getProductionRichTextElementPersisted(): PersistedRichTextDefaults {
  return getDefaultRichTextElementPersisted();
}

export function getDefaultInputElementPersisted(): PersistedInputDefaults {
  return {
    v: 1,
    defaultVariant: INPUT_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(INPUT_BASE_DEFAULTS.variants),
  };
}

export function getProductionInputElementPersisted(): PersistedInputDefaults {
  return getDefaultInputElementPersisted();
}

export function getDefaultRangeElementPersisted(): PersistedRangeDefaults {
  return {
    v: 1,
    defaultVariant: RANGE_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(RANGE_BASE_DEFAULTS.variants),
  };
}

export function getProductionRangeElementPersisted(): PersistedRangeDefaults {
  return getDefaultRangeElementPersisted();
}

export function getDefaultVideoElementPersisted(): PersistedVideoDefaults {
  return {
    v: 1,
    defaultVariant: VIDEO_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(VIDEO_BASE_DEFAULTS.variants),
  };
}

export function getProductionVideoElementPersisted(): PersistedVideoDefaults {
  return getDefaultVideoElementPersisted();
}

export function getDefaultVideoTimeElementPersisted(): PersistedVideoTimeDefaults {
  return {
    v: 1,
    defaultVariant: VIDEO_TIME_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(VIDEO_TIME_BASE_DEFAULTS.variants),
  };
}

export function getProductionVideoTimeElementPersisted(): PersistedVideoTimeDefaults {
  return getDefaultVideoTimeElementPersisted();
}

export function getDefaultVectorElementPersisted(): PersistedVectorDefaults {
  return {
    v: 1,
    defaultVariant: VECTOR_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(VECTOR_BASE_DEFAULTS.variants),
  };
}

export function getProductionVectorElementPersisted(): PersistedVectorDefaults {
  return getDefaultVectorElementPersisted();
}

export function getDefaultSvgElementPersisted(): PersistedSvgDefaults {
  return {
    v: 1,
    defaultVariant: SVG_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(SVG_BASE_DEFAULTS.variants),
  };
}

export function getProductionSvgElementPersisted(): PersistedSvgDefaults {
  return getDefaultSvgElementPersisted();
}

export function getDefaultModel3dElementPersisted(): PersistedModel3dDefaults {
  return {
    v: 1,
    defaultVariant: MODEL_3D_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(MODEL_3D_BASE_DEFAULTS.variants),
  };
}

export function getProductionModel3dElementPersisted(): PersistedModel3dDefaults {
  return getDefaultModel3dElementPersisted();
}

export function getDefaultRiveElementPersisted(): PersistedRiveDefaults {
  return {
    v: 1,
    defaultVariant: RIVE_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(RIVE_BASE_DEFAULTS.variants),
  };
}

export function getProductionRiveElementPersisted(): PersistedRiveDefaults {
  return getDefaultRiveElementPersisted();
}

export function getDefaultSpacerElementPersisted(): PersistedSpacerDefaults {
  return {
    v: 1,
    defaultVariant: SPACER_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(SPACER_BASE_DEFAULTS.variants),
  };
}

export function getProductionSpacerElementPersisted(): PersistedSpacerDefaults {
  return getDefaultSpacerElementPersisted();
}

export function getDefaultScrollProgressBarElementPersisted(): PersistedScrollProgressBarDefaults {
  return {
    v: 1,
    defaultVariant: SCROLL_PROGRESS_BAR_BASE_DEFAULTS.defaultVariant,
    variants: structuredClone(SCROLL_PROGRESS_BAR_BASE_DEFAULTS.variants),
  };
}

export function getProductionScrollProgressBarElementPersisted(): PersistedScrollProgressBarDefaults {
  return getDefaultScrollProgressBarElementPersisted();
}

export type WorkbenchSessionV2 = {
  v: 2;
  colors: ColorToolPersistedV2;
  fonts: FontWorkbenchPrefsV2;
  style: StyleToolPersistedV3;
  elements: {
    image: PersistedImageDefaults;
    body: PersistedBodyDefaults;
    heading: PersistedHeadingDefaults;
    link: PersistedLinkDefaults;
    button: PersistedButtonDefaults;
    richText: PersistedRichTextDefaults;
    input: PersistedInputDefaults;
    range: PersistedRangeDefaults;
    video: PersistedVideoDefaults;
    videoTime: PersistedVideoTimeDefaults;
    vector: PersistedVectorDefaults;
    svg: PersistedSvgDefaults;
    model3d: PersistedModel3dDefaults;
    rive: PersistedRiveDefaults;
    spacer: PersistedSpacerDefaults;
    scrollProgressBar: PersistedScrollProgressBarDefaults;
  };
};

export const WORKBENCH_ELEMENT_KEYS = [
  "image",
  "body",
  "heading",
  "link",
  "button",
  "richText",
  "input",
  "range",
  "video",
  "videoTime",
  "vector",
  "svg",
  "model3d",
  "rive",
  "spacer",
  "scrollProgressBar",
] as const;

function createWorkbenchSession(
  colors: ColorToolPersistedV2,
  fonts: FontWorkbenchPrefsV2,
  style: StyleToolPersistedV3,
  elements: WorkbenchSessionV2["elements"]
): WorkbenchSessionV2 {
  return { v: 2, colors, fonts, style, elements };
}

export function getDefaultWorkbenchSession(): WorkbenchSessionV2 {
  return createWorkbenchSession(
    getDefaultColorToolPersistedV2(),
    getDefaultFontsWorkbenchPrefs(),
    getDefaultStyleToolPersistedV3(),
    {
      image: getDefaultImageElementPersisted(),
      body: getDefaultBodyElementPersisted(),
      heading: getDefaultHeadingElementPersisted(),
      link: getDefaultLinkElementPersisted(),
      button: getDefaultButtonElementPersisted(),
      richText: getDefaultRichTextElementPersisted(),
      input: getDefaultInputElementPersisted(),
      range: getDefaultRangeElementPersisted(),
      video: getDefaultVideoElementPersisted(),
      videoTime: getDefaultVideoTimeElementPersisted(),
      vector: getDefaultVectorElementPersisted(),
      svg: getDefaultSvgElementPersisted(),
      model3d: getDefaultModel3dElementPersisted(),
      rive: getDefaultRiveElementPersisted(),
      spacer: getDefaultSpacerElementPersisted(),
      scrollProgressBar: getDefaultScrollProgressBarElementPersisted(),
    }
  );
}

export function getProductionWorkbenchSession(): WorkbenchSessionV2 {
  return createWorkbenchSession(
    getProductionColorToolPersistedV2(),
    getProductionFontsWorkbenchPrefs(),
    getProductionStyleToolPersistedV3(),
    {
      image: getProductionImageElementPersisted(),
      body: getProductionBodyElementPersisted(),
      heading: getProductionHeadingElementPersisted(),
      link: getProductionLinkElementPersisted(),
      button: getProductionButtonElementPersisted(),
      richText: getProductionRichTextElementPersisted(),
      input: getProductionInputElementPersisted(),
      range: getProductionRangeElementPersisted(),
      video: getProductionVideoElementPersisted(),
      videoTime: getProductionVideoTimeElementPersisted(),
      vector: getProductionVectorElementPersisted(),
      svg: getProductionSvgElementPersisted(),
      model3d: getProductionModel3dElementPersisted(),
      rive: getProductionRiveElementPersisted(),
      spacer: getProductionSpacerElementPersisted(),
      scrollProgressBar: getProductionScrollProgressBarElementPersisted(),
    }
  );
}

export function mergeWorkbenchSessionWithDefaults(
  session: Partial<Omit<WorkbenchSessionV2, "elements">> & {
    v?: 2;
    elements?: Partial<WorkbenchSessionV2["elements"]>;
  }
): WorkbenchSessionV2 {
  return mergeWorkbenchSessionShape(session, getDefaultWorkbenchSession()) as WorkbenchSessionV2;
}

export function isWorkbenchStorageJsonComplete(raw: string | null): boolean {
  return hasCompleteWorkbenchStorageShape(raw);
}
