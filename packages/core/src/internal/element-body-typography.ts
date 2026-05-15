/**
 * Single typography mapping: level/variant in JSON → CSS class. Used by ElementBody,
 * ElementRichText, ElementHeading, ElementLink, ElementButton, ElementVideoTime, and
 * form fields. Revise typography in two places only: globals.css (styles) and this module (level → class).
 */
import type { ElementBodyVariant } from "@pb/contracts";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const BODY_TYPOGRAPHY_CLASS_BY_LEVEL: Record<ElementBodyVariant, string> = {
  1: "typography-body-2xl",
  2: "typography-body-xl",
  3: "typography-body-lg",
  4: "typography-body-md",
  5: "typography-body-sm",
  6: "typography-body-xs",
};

export const HEADING_TYPOGRAPHY_CLASS_BY_LEVEL: Record<HeadingLevel, string> = {
  1: "typography-heading-2xl",
  2: "typography-heading-xl",
  3: "typography-heading-lg",
  4: "typography-heading-md",
  5: "typography-heading-sm",
  6: "typography-heading-xs",
};

export const DEFAULT_BODY_LEVEL: ElementBodyVariant = 3;

export function getBodyTypographyClass(level: ElementBodyVariant | undefined): string {
  const resolved = level ?? DEFAULT_BODY_LEVEL;
  return BODY_TYPOGRAPHY_CLASS_BY_LEVEL[resolved];
}

export function getHeadingTypographyClass(level: HeadingLevel | undefined): string {
  const resolved = level ?? 1;
  return HEADING_TYPOGRAPHY_CLASS_BY_LEVEL[resolved];
}
