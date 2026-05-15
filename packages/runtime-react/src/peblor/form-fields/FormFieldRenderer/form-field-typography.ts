/**
 * Form field label/input/error class names from config. Uses the same level-based
 * typography as elements (getBodyTypographyClass) so "level" in JSON drives default
 * text size; labelClassName/inputClassName/errorClassName override when set.
 */
import type { ElementBodyVariant } from "@pb/contracts/types";
import { getBodyTypographyClass } from "@pb/core/typography";

const STRUCTURAL_LABEL = "block text-foreground mb-1";
const STRUCTURAL_LABEL_INLINE = "text-foreground";
/** Shared structural base for text inputs, select, textarea (no typography; use level + inputClassName). */
export const STRUCTURAL_INPUT_BASE =
  "w-full px-3 py-2 rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50";
export const STRUCTURAL_TEXTAREA = `${STRUCTURAL_INPUT_BASE} resize-y`;
/** Submit button: layout/focus only; typography from level + inputClassName. */
export const STRUCTURAL_SUBMIT_BUTTON =
  "w-full py-3 px-4 rounded-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50";
const STRUCTURAL_ERROR = "mt-1";
const REQUIRED_INDICATOR = "text-destructive ml-0.5";

export function getFormFieldLabelClass(
  level: ElementBodyVariant | undefined,
  labelClassName?: string
): string {
  const typography = getBodyTypographyClass(level);
  const base = `${STRUCTURAL_LABEL} ${typography}`.trim();
  return labelClassName ? `${base} ${labelClassName}`.trim() : base;
}

export function getFormFieldLabelInlineClass(
  level: ElementBodyVariant | undefined,
  labelClassName?: string
): string {
  const typography = getBodyTypographyClass(level);
  const base = `${STRUCTURAL_LABEL_INLINE} ${typography}`.trim();
  return labelClassName ? `${base} ${labelClassName}`.trim() : base;
}

export function getFormFieldInputClass(
  level: ElementBodyVariant | undefined,
  inputClassName?: string,
  structural: string = STRUCTURAL_INPUT_BASE
): string {
  const typography = getBodyTypographyClass(level);
  const base = `${structural} ${typography}`.trim();
  return inputClassName ? `${base} ${inputClassName}`.trim() : base;
}

export function getFormFieldErrorClass(errorClassName?: string): string {
  const base = `text-destructive ${STRUCTURAL_ERROR}`.trim();
  return errorClassName ? `${base} ${errorClassName}`.trim() : base;
}

export { REQUIRED_INDICATOR };
