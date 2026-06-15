import { useCallback, useState } from "react";
import type { FormFieldBlock } from "@pb/contracts/types";
import type { FormFieldValue } from "@/peblor/form-fields";
import { validateFormField } from "@/peblor/form-fields/FormFieldRenderer/form-field-validation";

export type FormFieldPath = number[];

export function isFormFieldButton(field: FormFieldBlock): boolean {
  return field.fieldType === "button";
}

export function isFormFieldLayout(field: FormFieldBlock): boolean {
  return field.fieldType === "row";
}

export function getFieldKey(field: FormFieldBlock, path: FormFieldPath | number): string {
  if (field.name && !isFormFieldButton(field) && !isFormFieldLayout(field)) return field.name;
  const pathLabel = Array.isArray(path) ? path.join("_") : String(path);
  return `field_${pathLabel}`;
}

export function collectFormFields(
  fields: FormFieldBlock[],
  basePath: FormFieldPath = []
): Array<{ field: FormFieldBlock; path: FormFieldPath }> {
  return fields.flatMap((field, index) => {
    const path = [...basePath, index];
    if (field.fieldType === "row") {
      return collectFormFields(field.fields ?? [], path);
    }
    return [{ field, path }];
  });
}

function getInitialValue(field: FormFieldBlock): FormFieldValue {
  if (field.fieldType === "checkbox" || field.fieldType === "switch") return false;
  if (field.fieldType === "checkboxGroup") return [];
  if (field.fieldType === "hidden" && field.value !== undefined) return field.value;
  return "";
}

export function useFormBlockState(fields: FormFieldBlock[]) {
  const [values, setValues] = useState<Record<string, FormFieldValue>>(() => {
    const init: Record<string, FormFieldValue> = {};
    collectFormFields(fields).forEach(({ field, path }) => {
      const key = getFieldKey(field, path);
      if (!isFormFieldButton(field)) init[key] = getInitialValue(field);
    });
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((key: string, value: FormFieldValue) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validateAll = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};
    collectFormFields(fields).forEach(({ field, path }) => {
      const key = getFieldKey(field, path);
      if (isFormFieldButton(field) || field.fieldType === "hidden") return;
      const value =
        values[key] ??
        (field.fieldType === "checkbox" || field.fieldType === "switch"
          ? false
          : field.fieldType === "checkboxGroup"
            ? []
            : "");
      const err = validateFormField(field, value);
      if (err) nextErrors[key] = err;
    });
    setErrors(nextErrors);
    setSubmitError(null);
    const isValid = Object.keys(nextErrors).length === 0;
    if (!isValid) {
      setTimeout(() => {
        const firstInvalidField = document.querySelector<HTMLElement>('[aria-invalid="true"]');
        firstInvalidField?.focus();
      }, 0);
    }
    return isValid;
  }, [fields, values]);

  return {
    values,
    errors,
    submitError,
    isSubmitting,
    setValues,
    setErrors,
    setSubmitError,
    setIsSubmitting,
    setValue,
    validateAll,
    getFieldKey,
  };
}
