import { z } from "zod";
import {
  bgBlockSchema,
  bgPatternRepeatSchema,
  bgVarLayerSchema,
} from "./peblor-schemas/background-block-schemas";
import {
  cssGradientDefinitionSchema,
  elementBlockSchema,
  sectionDefinitionBlockSchema,
} from "./peblor-schemas/element-block-schemas";
import {
  elementBodyVariantSchema,
  elementGraphicLinkSchema,
  elementImageObjectFitSchema,
  elementLayoutSchema,
  vectorGradientSchema,
  vectorGradientStopSchema,
  vectorLinearGradientSchema,
  vectorRadialGradientSchema,
  vectorShapeSchema,
  vectorShapeStyleSchema,
} from "./peblor-schemas/element-foundation-schemas";
import {
  cameraDefSchema,
  cameraEffectsSchema,
  canvasDefSchema,
  environmentDefSchema,
  lightDefSchema,
  materialDefSchema,
  modelDefSchema,
  modelInstanceDefSchema,
  postProcessingEffectSchema,
  sceneDefSchema,
  textureDefSchema,
} from "./peblor-schemas/element-model3d-schemas";
import { moduleBlockSchema, moduleSlotSchema } from "./peblor-schemas/module-block-schemas";
import {
  modalBuilderSchema,
  modalTransitionConfigSchema,
} from "./peblor-schemas/modal-block-schemas";
import {
  backgroundTransitionEffectSchema,
  forcedThemeSchema,
  peblorDefinitionBlockSchema,
  pageDensitySchema,
  peblorSchema,
  pageScrollConfigSchema,
  resolvedPageSchema,
} from "./peblor-schemas/page-definition-and-resolution-schemas";
import {
  formFieldOptionSchema,
  formFieldStyleSchema,
  formFieldTypeSchema,
  type FormFieldBlock as FormFieldBlockFromSchema,
} from "./peblor-schemas/form-field-schemas";
import { baseSectionPropsSchema, sectionBlockSchema } from "./peblor-schemas/section-block-schemas";
import {
  backdropBlurEffectSchema,
  blurEffectSchema,
  brightnessEffectSchema,
  columnAssignmentsSchema,
  columnCountSchema,
  columnGapsSchema,
  columnSpanSchema,
  columnStyleSchema,
  columnStylesSchema,
  columnWidthsSchema,
  contrastEffectSchema,
  dividerLayerSchema,
  dropShadowEffectSchema,
  elementOrderSchema,
  glassEffectSchema,
  glowEffectSchema,
  grayscaleEffectSchema,
  innerShadowEffectSchema,
  itemLayoutEntrySchema,
  itemLayoutSchema,
  itemStyleSchema,
  itemStylesSchema,
  opacityEffectSchema,
  saturateEffectSchema,
  sectionBorderSchema,
  sectionEffectSchema,
  sepiaEffectSchema,
} from "./peblor-schemas/section-style-and-column-schemas";
import { cssInlineStyleSchema, elementTextAlignSchema } from "./peblor-schemas/schema-primitives";

export {
  type BackgroundSwitchAction,
  type ContentOverrideAction,
  type Model3DAction,
  type RiveAction,
  type PeblorAction,
  type SectionTriggerOptions,
  type StartTransitionAction,
  type StopTransitionAction,
  type TriggerAction,
  type UpdateTransitionProgressAction,
  OVERRIDE_KEY_BG,
} from "./trigger-action-types";

export * from "./peblor-schemas/background-block-schemas";
export * from "./peblor-schemas/schema-primitives";
export * from "./peblor-schemas/element-foundation-schemas";
export * from "./peblor-schemas/element-button-schemas";
export * from "./peblor-schemas/element-content-schemas";
export * from "./peblor-schemas/element-model3d-schemas";
export * from "./peblor-schemas/element-rive-schemas";
export * from "./peblor-schemas/element-block-schemas";
export * from "./peblor-schemas/element-form-field-schemas";
export * from "./peblor-schemas/element-audio-schemas";
export * from "./peblor-schemas/element-counter-schemas";
export * from "./peblor-schemas/element-marquee-schemas";
export * from "./peblor-schemas/element-image-compare-schemas";
export * from "./peblor-schemas/element-tabs-schemas";
export * from "./peblor-schemas/element-tooltip-schemas";
export * from "./peblor-schemas/element-lottie-schemas";
export * from "./peblor-schemas/section-effect-schemas";
export * from "./peblor-schemas/section-column-layout-schemas";
export * from "./peblor-schemas/section-style-and-column-schemas";
export * from "./peblor-schemas/section-block-base-schemas";
export * from "./peblor-schemas/section-block-schemas";
export * from "./peblor-schemas/form-field-schemas";
export * from "./peblor-schemas/module-block-schemas";
export * from "./peblor-schemas/modal-block-schemas";
export * from "./peblor-schemas/motion-props-schema";
export * from "./peblor-schemas/page-definition-and-resolution-schemas";

export type bgVarLayer = z.infer<typeof bgVarLayerSchema>;
export type bgPatternRepeat = z.infer<typeof bgPatternRepeatSchema>;
export type bgBlock = z.infer<typeof bgBlockSchema>;

export type ElementTextAlign = z.infer<typeof elementTextAlignSchema>;
export type ElementLayout = z.infer<typeof elementLayoutSchema>;
export type ElementImageObjectFit = z.infer<typeof elementImageObjectFitSchema>;
export type ElementBodyVariant = z.infer<typeof elementBodyVariantSchema>;
export type ElementGraphicLink = z.infer<typeof elementGraphicLinkSchema>;
export type VectorShapeStyle = z.infer<typeof vectorShapeStyleSchema>;
export type VectorGradientStop = z.infer<typeof vectorGradientStopSchema>;
export type VectorLinearGradient = z.infer<typeof vectorLinearGradientSchema>;
export type VectorRadialGradient = z.infer<typeof vectorRadialGradientSchema>;
export type VectorGradient = z.infer<typeof vectorGradientSchema>;
export type VectorShape = z.infer<typeof vectorShapeSchema>;
export type ElementBlock = z.infer<typeof elementBlockSchema>;

export type TextureDef = z.infer<typeof textureDefSchema>;
export type MaterialDef = z.infer<typeof materialDefSchema>;
export type ModelDef = z.infer<typeof modelDefSchema>;
export type EnvironmentDef = z.infer<typeof environmentDefSchema>;
export type LightDef = z.infer<typeof lightDefSchema>;
export type CameraDef = z.infer<typeof cameraDefSchema>;
export type ModelInstanceDef = z.infer<typeof modelInstanceDefSchema>;
export type CameraEffectsDef = z.infer<typeof cameraEffectsSchema>;
export type SceneDef = z.infer<typeof sceneDefSchema>;
export type CanvasDef = z.infer<typeof canvasDefSchema>;
export type PostProcessingEffectDef = z.infer<typeof postProcessingEffectSchema>;

export type CssGradientDefinition = z.infer<typeof cssGradientDefinitionSchema>;
export type SectionDefinitionBlock = z.infer<typeof sectionDefinitionBlockSchema>;

export type dividerLayer = z.infer<typeof dividerLayerSchema>;
export type SectionBorder = z.infer<typeof sectionBorderSchema>;
export type BackdropBlurEffect = z.infer<typeof backdropBlurEffectSchema>;
export type GlassEffect = z.infer<typeof glassEffectSchema>;
export type DropShadowEffect = z.infer<typeof dropShadowEffectSchema>;
export type InnerShadowEffect = z.infer<typeof innerShadowEffectSchema>;
export type GlowEffect = z.infer<typeof glowEffectSchema>;
export type OpacityEffect = z.infer<typeof opacityEffectSchema>;
export type BlurEffect = z.infer<typeof blurEffectSchema>;
export type BrightnessEffect = z.infer<typeof brightnessEffectSchema>;
export type ContrastEffect = z.infer<typeof contrastEffectSchema>;
export type SaturateEffect = z.infer<typeof saturateEffectSchema>;
export type GrayscaleEffect = z.infer<typeof grayscaleEffectSchema>;
export type SepiaEffect = z.infer<typeof sepiaEffectSchema>;
export type SectionEffect = z.infer<typeof sectionEffectSchema>;
export type CssInlineStyle = z.infer<typeof cssInlineStyleSchema>;

export type ColumnCount = z.infer<typeof columnCountSchema>;
export type ColumnWidths = z.infer<typeof columnWidthsSchema>;
export type ColumnGaps = z.infer<typeof columnGapsSchema>;
export type ColumnSpan = z.infer<typeof columnSpanSchema>;
export type ColumnStyle = z.infer<typeof columnStyleSchema>;
export type ColumnStyles = z.infer<typeof columnStylesSchema>;
export type ItemStyle = z.infer<typeof itemStyleSchema>;
export type ItemStyles = z.infer<typeof itemStylesSchema>;
export type ItemLayoutEntry = z.infer<typeof itemLayoutEntrySchema>;
export type ItemLayout = z.infer<typeof itemLayoutSchema>;
export type ElementOrder = z.infer<typeof elementOrderSchema>;
export type ColumnAssignments = z.infer<typeof columnAssignmentsSchema>;

export type SectionBlock = z.infer<typeof sectionBlockSchema>;

export type FormFieldOption = z.infer<typeof formFieldOptionSchema>;
export type FormFieldStyle = z.infer<typeof formFieldStyleSchema>;
export type FormFieldType = z.infer<typeof formFieldTypeSchema>;
export type FormFieldBlock = FormFieldBlockFromSchema;
export type ModuleBlock = z.infer<typeof moduleBlockSchema>;
export type ModuleSlot = z.infer<typeof moduleSlotSchema>;
export type ModalBuilder = z.infer<typeof modalBuilderSchema>;
export type ModalTransitionConfigFromSchema = z.infer<typeof modalTransitionConfigSchema>;
export type PeblorDefinitionBlock = z.infer<typeof peblorDefinitionBlockSchema>;
export type Peblor = z.infer<typeof peblorSchema>;
export type ResolvedPage = z.infer<typeof resolvedPageSchema>;
export type BackgroundTransitionEffect = z.infer<typeof backgroundTransitionEffectSchema>;
export type PageScrollConfig = z.infer<typeof pageScrollConfigSchema>;
export type PageDensity = z.infer<typeof pageDensitySchema>;
export type ForcedTheme = z.infer<typeof forcedThemeSchema>;

export type BaseSectionProps = z.infer<typeof baseSectionPropsSchema>;

export type SectionBlockWithElementOrder = Omit<
  Extract<SectionBlock, { elements: ElementBlock[] }>,
  "elements"
> & { elementOrder: string[] };

export const SECTION_TYPE_STRINGS = new Set([
  "divider",
  "contentBlock",
  "scrollContainer",
  "sectionColumn",
  "sectionTrigger",
  "formBlock",
  "revealSection",
]);

export const ASSET_URL_KEYS = new Set(["url", "src", "poster", "image", "video"]);

export const MODEL3D_ASSET_KEYS = new Set(["source", "path", "geometry"]);
