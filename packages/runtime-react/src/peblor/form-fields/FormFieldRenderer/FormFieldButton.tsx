"use client";

import type { FormFieldBlock } from "@pb/contracts/types";
import type { ElementBodyVariant } from "@pb/contracts/types";
import { firePeblorAction } from "@/peblor/triggers";
import { FormFieldShell } from "./FormFieldShell";
import { getFormFieldInputClass, STRUCTURAL_SUBMIT_BUTTON } from "./form-field-typography";
import { lowerThemeStyleObject } from "@/peblor/theme/theme-string";
import { resolveAuthoredUrl } from "@pb/runtime-react/core/lib/url-policy";
import { globals } from "@pb/runtime-react/core/lib/globals";

type Props = {
  field: FormFieldBlock;
  value?: unknown;
  disabled?: boolean;
  loadingText?: string;
  isSubmitting?: boolean;
  style: React.CSSProperties;
  resolvedLevel?: ElementBodyVariant;
};

export function FormFieldButton({
  field,
  disabled,
  loadingText,
  isSubmitting,
  style,
  resolvedLevel,
}: Props) {
  if (field.fieldType !== "button") return null;

  const label = field.label ?? globals.stringsLabelSubmitButton;
  const buttonType = field.buttonType ?? "submit";
  const fieldDisabled = disabled || field.disabled === true || isSubmitting;
  const displayLabel =
    buttonType === "submit" && isSubmitting && (loadingText ?? field.loadingText)
      ? (loadingText ?? field.loadingText)
      : label;

  const buttonClass = getFormFieldInputClass(
    resolvedLevel,
    field.inputClassName,
    STRUCTURAL_SUBMIT_BUTTON
  );

  const handleClick = () => {
    if (fieldDisabled || buttonType !== "button") return;
    if (field.action) firePeblorAction(field.action, "trigger");
    if (field.href) {
      const result = resolveAuthoredUrl(field.href, "any");
      if (result.ok) window.location.href = result.url;
    }
  };

  return (
    <FormFieldShell field={field} style={style}>
      <button
        type={buttonType}
        disabled={fieldDisabled}
        onClick={handleClick}
        className={buttonClass}
        style={lowerThemeStyleObject(field.inputStyle) as React.CSSProperties | undefined}
      >
        {displayLabel}
      </button>
    </FormFieldShell>
  );
}
