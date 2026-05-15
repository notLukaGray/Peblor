import type { FormFieldBlock } from "@pb/contracts/types";
import type { FormFieldValue } from "..";

function isEmpty(_field: FormFieldBlock, value: FormFieldValue): boolean {
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "boolean") return false;
  return true;
}

export function validateRequired(field: FormFieldBlock, value: FormFieldValue): string | undefined {
  if (!field.required) return undefined;
  if (typeof value === "boolean") return value ? undefined : "This field is required.";
  if (isEmpty(field, value)) return "This field is required.";
  return undefined;
}

export function validateEmail(str: string): string | undefined {
  if (str.length === 0) return undefined;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRe.test(str) ? undefined : "Please enter a valid email address.";
}

export function validateLength(field: FormFieldBlock, str: string): string | undefined {
  if (str.length === 0) return undefined;
  if (field.minLength !== undefined && str.length < field.minLength) {
    return `Please enter at least ${field.minLength} characters.`;
  }
  if (field.maxLength !== undefined && str.length > field.maxLength) {
    return `Please enter no more than ${field.maxLength} characters.`;
  }
  return undefined;
}

export function validatePattern(field: FormFieldBlock, str: string): string | undefined {
  if (!field.pattern || str.length === 0) return undefined;
  try {
    const re = new RegExp(field.pattern);
    return re.test(str) ? undefined : "Please match the requested format.";
  } catch {
    return undefined;
  }
}

export function validateNumberRange(
  field: FormFieldBlock,
  value: FormFieldValue
): string | undefined {
  const str = typeof value === "string" ? value : "";
  const num = str.length > 0 ? Number(value) : NaN;
  if (field.required && (str === "" || Number.isNaN(num))) {
    return "This field is required.";
  }
  if (str.length === 0 || Number.isNaN(num)) return undefined;
  if (field.min !== undefined && num < Number(field.min)) {
    return `Value must be at least ${field.min}.`;
  }
  if (field.max !== undefined && num > Number(field.max)) {
    return `Value must be at most ${field.max}.`;
  }
  return undefined;
}

/**
 * Returns an error message for the field if validation fails, otherwise undefined.
 * Delegates to small validators per rule; output is a single string or none.
 */
export function validateFormField(
  field: FormFieldBlock,
  value: FormFieldValue
): string | undefined {
  if (
    field.fieldType === "hidden" ||
    field.fieldType === "button" ||
    field.fieldType === "submit" ||
    field.fieldType === "row"
  ) {
    return undefined;
  }

  const requiredErr = validateRequired(field, value);
  if (requiredErr) return requiredErr;

  const str = typeof value === "string" ? value.trim() : "";

  if (field.fieldType === "email") {
    const emailErr = validateEmail(str);
    if (emailErr) return emailErr;
  }

  if (field.fieldType === "number" || field.fieldType === "range") {
    const numErr = validateNumberRange(field, value);
    if (numErr) return numErr;
  } else {
    const lengthErr = validateLength(field, str);
    if (lengthErr) return lengthErr;
    const patternErr = validatePattern(field, str);
    if (patternErr) return patternErr;
  }

  return undefined;
}
