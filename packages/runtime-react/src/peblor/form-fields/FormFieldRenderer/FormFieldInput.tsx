"use client";

import type { FormFieldBlock } from "@pb/contracts/types";
import type { ElementBodyVariant } from "@pb/contracts/types";
import type { FormFieldValue } from "..";
import { formFieldStructuralClasses } from "./form-field-classes";
import {
  FormFieldCharacterCount,
  FormFieldDescription,
  getFieldDescribedBy,
  getFieldErrorId,
} from "./FormFieldFeedback";
import { FormFieldShell } from "./FormFieldShell";
import {
  getFormFieldLabelClass,
  getFormFieldInputClass,
  getFormFieldErrorClass,
  REQUIRED_INDICATOR,
  STRUCTURAL_INPUT_BASE,
} from "./form-field-typography";
import { lowerThemeStyleObject } from "@/peblor/theme/theme-string";

const INPUT_FIELD_TYPES = [
  "text",
  "email",
  "password",
  "tel",
  "url",
  "number",
  "date",
  "time",
  "datetime-local",
  "color",
  "search",
] as const;

function isInputFieldType(t: string): t is (typeof INPUT_FIELD_TYPES)[number] {
  return (INPUT_FIELD_TYPES as readonly string[]).includes(t);
}

type Props = {
  field: FormFieldBlock;
  value: FormFieldValue;
  onChange: (value: FormFieldValue) => void;
  error?: string;
  disabled?: boolean;
  style: React.CSSProperties;
  resolvedLevel?: ElementBodyVariant;
};

export function FormFieldInput({
  field,
  value,
  onChange,
  error,
  disabled,
  style,
  resolvedLevel,
}: Props) {
  if (!isInputFieldType(field.fieldType)) return null;

  const fieldDisabled = disabled || field.disabled === true;
  const strValue = typeof value === "string" ? value : "";
  const id = field.name ? `form-${field.name}` : undefined;
  const hasError = Boolean(error);
  const labelClass = getFormFieldLabelClass(resolvedLevel, field.labelClassName);
  const inputClass = getFormFieldInputClass(
    resolvedLevel,
    field.inputClassName,
    STRUCTURAL_INPUT_BASE
  );
  const errorClass = getFormFieldErrorClass(field.errorClassName);
  const hasAffix = Boolean(field.prefix || field.suffix);
  const describedBy = getFieldDescribedBy(field, hasError);
  const inputElement = (
    <input
      id={id}
      name={field.name}
      type={field.fieldType}
      value={strValue}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required}
      disabled={fieldDisabled}
      readOnly={field.readOnly}
      autoComplete={field.autocomplete}
      min={field.min as string | number | undefined}
      max={field.max as string | number | undefined}
      step={field.step as string | number | undefined}
      minLength={field.minLength}
      maxLength={field.maxLength}
      pattern={field.pattern}
      inputMode={field.inputMode as React.HTMLAttributes<HTMLInputElement>["inputMode"]}
      spellCheck={field.spellCheck}
      aria-invalid={hasError}
      aria-describedby={describedBy}
      aria-required={field.required}
      className={hasAffix ? `${inputClass} min-w-0 flex-1` : inputClass}
      style={{
        ...(lowerThemeStyleObject(field.inputStyle) as React.CSSProperties | undefined),
        borderColor: hasError ? formFieldStructuralClasses.inputBorderError : undefined,
      }}
    />
  );

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
      {hasAffix ? (
        <div className="flex items-center gap-2">
          {field.prefix && <span className="text-sm text-muted-foreground">{field.prefix}</span>}
          {inputElement}
          {field.suffix && <span className="text-sm text-muted-foreground">{field.suffix}</span>}
        </div>
      ) : (
        inputElement
      )}
      <FormFieldDescription field={field} />
      <FormFieldCharacterCount field={field} value={strValue} />
      {hasError && error && (
        <p id={getFieldErrorId(field, hasError)} className={errorClass} role="alert">
          {error}
        </p>
      )}
    </FormFieldShell>
  );
}
