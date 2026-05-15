/**
 * Barrel — re-exports all peblor schema types.
 * No logic lives here.
 */

export type {
  ResponsiveString,
  ResponsiveNumber,
  LayoutProps,
  ImageCrop,
  ImageFilters,
  CursorType,
  ElementInteractions,
  ElementCondition,
  ElementVisibleWhen,
  TriggerAction,
} from "./peblor-primitives";

export type {
  ElementType,
  ElementHeading,
  ElementBody,
  ElementLink,
  ElementImage,
  ElementVideo,
  ElementRichText,
  ElementSVG,
  ElementButton,
  ElementSpacer,
  ElementBlock,
} from "./peblor-element";

export type {
  SectionType,
  BaseSectionProps,
  ContentBlock,
  SectionColumnBlock,
  SectionBlock,
  BgBlock,
  PeblorPage,
  ContentBlockProps,
} from "./peblor-section";

export type { TypographyOverrides } from "./peblor-typography";
