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
  STRUCTURAL_TEXTAREA,
} from "./form-field-typography";
import { lowerThemeStyleObject } from "@/peblor/theme/theme-string";

type Props = {
  field: FormFieldBlock;
  value: FormFieldValue;
  onChange: (value: FormFieldValue) => void;
  error?: string;
  disabled?: boolean;
  style: React.CSSProperties;
  resolvedLevel?: ElementBodyVariant;
};

export function FormFieldParagraph({
  field,
  value,
  onChange,
  error,
  disabled,
  style,
  resolvedLevel,
}: Props) {
  if (field.fieldType !== "paragraph") return null;

  const fieldDisabled = disabled || field.disabled === true;
  const strValue = typeof value === "string" ? value : "";
  const id = field.name ? `form-${field.name}` : undefined;
  const hasError = Boolean(error);
  const labelClass = getFormFieldLabelClass(resolvedLevel, field.labelClassName);
  const inputClass = getFormFieldInputClass(
    resolvedLevel,
    field.inputClassName,
    STRUCTURAL_TEXTAREA
  );
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
      <textarea
        id={id}
        name={field.name}
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        disabled={fieldDisabled}
        readOnly={field.readOnly}
        autoComplete={field.autocomplete}
        rows={field.rows ?? 3}
        maxLength={field.maxLength}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        aria-required={field.required}
        className={inputClass}
        style={{
          ...(lowerThemeStyleObject(field.inputStyle) as React.CSSProperties | undefined),
          borderColor: hasError ? formFieldStructuralClasses.inputBorderError : undefined,
        }}
      />
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
