/**
 * Element block types for the peblor schema.
 */

import type { LayoutProps, TriggerAction } from "./peblor-primitives";

export type ElementType =
  | "elementHeading"
  | "elementBody"
  | "elementLink"
  | "elementImage"
  | "elementVideo"
  | "elementVector"
  | "elementSVG"
  | "elementRichText"
  | "elementRange"
  | "elementVideoTime"
  | "elementSpacer"
  | "elementScrollProgressBar"
  | "elementInput"
  | "elementButton"
  | "elementModel3D"
  | "elementRive"
  | "elementGroup"
  | "elementAudio"
  | "elementTabs"
  | "elementTooltip"
  | "elementLottie"
  | "elementCounter"
  | "elementMarquee"
  | "elementDrag"
  | "elementFormField";

export interface ElementHeading extends LayoutProps {
  type: "elementHeading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  semanticLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  wordWrap?: boolean;
  letterSpacing?: string | number;
  lineSpacing?: string | number;
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontFeatureSettings?: string;
  textOverflow?: string;
  textStroke?: string;
  verticalAlign?: string;
  paragraphSpacing?: string | number;
  maxLines?: number;
}

export interface ElementBody extends LayoutProps {
  type: "elementBody";
  text: string;
  level?: number | [number, number];
  wordWrap?: boolean;
  letterSpacing?: string | number;
  lineSpacing?: string | number;
  lineHeight?: string | number;
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  /** Direct text color override. Applied as an inline style; takes precedence over typography class. */
  color?: string;
  fontFeatureSettings?: string;
  textOverflow?: string;
  textStroke?: string;
  verticalAlign?: string;
  paragraphSpacing?: string | number;
  maxLines?: number;
}

export interface ElementLink extends LayoutProps {
  type: "elementLink";
  label: string;
  href: string;
  external?: boolean;
  copyType: "heading" | "body";
  level?: number | [number, number];
  wordWrap?: boolean;
  linkDefault?: string;
  linkHover?: string;
  linkActive?: string;
  linkDisabled?: string;
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
}

export interface ElementImage extends LayoutProps {
  type: "elementImage";
  src: string;
  alt: string;
  objectFit?: string | [string, string];
  objectPosition?: string;
  aspectRatio?: import("./peblor-primitives").ResponsiveString;
  imageRotation?: number;
  imageCrop?: import("./peblor-primitives").ImageCrop;
  imageFilters?: import("./peblor-primitives").ImageFilters;
  fillOpacity?: number;
  link?: { ref: string; external: boolean };
}

export interface ElementVideo extends LayoutProps {
  type: "elementVideo";
  src: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  showPlayButton?: boolean;
  aspectRatio?: string;
  objectFit?: string | [string, string];
  /** Video module ID for modal / fullscreen player. */
  module?: string;
}

export interface ElementRichText extends LayoutProps {
  type: "elementRichText";
  content: string;
  /** Raw HTML markup if available */
  markup?: string;
}

export interface ElementSVG extends LayoutProps {
  type: "elementSVG";
  markup: string;
  ariaLabel?: string;
}

export interface ElementButton extends LayoutProps {
  type: "elementButton";
  label: string;
  action?: string;
  href?: string;
  variant?: string;
  size?: string;
  disabled?: boolean;
  pointerDownAction?: TriggerAction;
  pointerUpAction?: TriggerAction;
}

export interface ElementSpacer extends LayoutProps {
  type: "elementSpacer";
}

export interface ElementInput extends LayoutProps {
  type: "elementInput";
  placeholder?: string;
  ariaLabel?: string;
  showIcon?: boolean;
  color?: string;
}

// Simplified generic element block
export type ElementBlock =
  | ElementHeading
  | ElementBody
  | ElementLink
  | ElementButton
  | ElementImage
  | ElementVideo
  | ElementSVG
  | ElementRichText
  | ElementSpacer
  | ElementInput
  | { type: ElementType; id?: string; [key: string]: unknown };
