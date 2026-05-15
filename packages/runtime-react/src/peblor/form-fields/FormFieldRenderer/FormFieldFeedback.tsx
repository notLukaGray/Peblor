import type { FormFieldBlock } from "@pb/contracts/types";
import type { FormFieldValue } from "..";

export const FORM_FIELD_DESCRIPTION_CLASS = "mt-1 text-xs text-muted-foreground";
export const FORM_FIELD_COUNT_CLASS = "mt-1 text-xs text-muted-foreground";

export function getFieldDescriptionId(field: FormFieldBlock): string | undefined {
  return field.description && field.name ? `form-${field.name}-description` : undefined;
}

export function getFieldErrorId(field: FormFieldBlock, hasError: boolean): string | undefined {
  return hasError && field.name ? `form-${field.name}-error` : undefined;
}

export function getFieldDescribedBy(field: FormFieldBlock, hasError: boolean): string | undefined {
  const ids = [getFieldDescriptionId(field), getFieldErrorId(field, hasError)].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function FormFieldDescription({ field }: { field: FormFieldBlock }) {
  if (!field.description) return null;
  return (
    <p id={getFieldDescriptionId(field)} className={FORM_FIELD_DESCRIPTION_CLASS}>
      {field.description}
    </p>
  );
}

export function FormFieldCharacterCount({
  field,
  value,
}: {
  field: FormFieldBlock;
  value: FormFieldValue;
}) {
  if (!field.showCharacterCount || typeof field.maxLength !== "number") return null;
  const length = typeof value === "string" ? value.length : 0;
  return (
    <p role="status" aria-live="polite" aria-atomic="true" className={FORM_FIELD_COUNT_CLASS}>
      {length} of {field.maxLength} characters
    </p>
  );
}
