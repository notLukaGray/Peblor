"use client";

import type { FormFieldBlock } from "@pb/contracts/types";
import type { ElementBodyVariant } from "@pb/contracts/types";
import type { FormFieldValue } from "..";
import { FormFieldDescription, getFieldDescribedBy, getFieldErrorId } from "./FormFieldFeedback";
import { FormFieldShell } from "./FormFieldShell";
import {
  getFormFieldLabelClass,
  getFormFieldErrorClass,
  REQUIRED_INDICATOR,
} from "./form-field-typography";

type Props = {
  field: FormFieldBlock;
  value: FormFieldValue;
  onChange: (value: FormFieldValue) => void;
  error?: string;
  disabled?: boolean;
  style: React.CSSProperties;
  resolvedLevel?: ElementBodyVariant;
};

export function FormFieldRange({
  field,
  value,
  onChange,
  error,
  disabled,
  style,
  resolvedLevel,
}: Props) {
  if (field.fieldType !== "range") return null;

  const fieldDisabled = disabled || field.disabled === true;
  const strValue = typeof value === "string" ? value : "";
  const id = field.name ? `form-${field.name}` : undefined;
  const numVal = strValue === "" ? (field.min ?? 0) : Number(strValue);
  const hasError = Boolean(error);
  const labelClass = getFormFieldLabelClass(resolvedLevel, field.labelClassName);
  const errorClass = getFormFieldErrorClass(field.errorClassName);
  const describedBy = getFieldDescribedBy(field, hasError);

  return (
    <FormFieldShell field={field} style={style}>
      {field.label && (
        <label htmlFor={id} className={labelClass}>
          {field.label}
          {field.required && (
            <span className={REQUIRED_INDICATOR} aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      <input
        id={id}
        name={field.name}
        type="range"
        value={numVal}
        onChange={(e) => onChange(e.target.value as string)}
        min={field.min as number | string | undefined}
        max={field.max as number | string | undefined}
        step={field.step as number | string | undefined}
        disabled={fieldDisabled}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        className={field.inputClassName ?? "w-full"}
      />
      <FormFieldDescription field={field} />
      {hasError && error && (
        <p id={getFieldErrorId(field, hasError)} className={errorClass} role="alert">
          {error}
        </p>
      )}
    </FormFieldShell>
  );
}
