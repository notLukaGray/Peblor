import type { FormFieldType } from "./form-field-defaults";
import type { ChoiceOption } from "./form-field-composer-types";

export function optionsToText(options: unknown): string {
  if (!Array.isArray(options)) return "";
  return (options as ChoiceOption[]).map((o) => `${o.value}:${o.label}`).join("\n");
}

export function textToOptions(raw: string): ChoiceOption[] {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [value, ...rest] = line.split(":");
      const safeValue = value?.trim() ?? "";
      return { value: safeValue, label: rest.join(":").trim() || safeValue };
    });
}

export function isButtonField(fieldType: string): boolean {
  return fieldType === "button" || fieldType === "submit";
}

export function normalizeFieldType(fieldType: string): FormFieldType {
  return fieldType === "submit" ? "button" : (fieldType as FormFieldType);
}

export function actionTypeToText(action: unknown): string {
  if (!action || typeof action !== "object") return "";
  const type = (action as { type?: unknown }).type;
  return typeof type === "string" ? type : "";
}
