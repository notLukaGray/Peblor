"use client";

import {
  BooleanField,
  Field,
  controlClassName,
} from "@/app/dev/layout/_shared/section-type-workbench";
import type { AnyField, PatchField } from "./form-field-composer-types";
import { isButtonField } from "./form-field-composer-utils";
import { INPUT_FIELD_TYPES } from "./form-field-variant-mapper";

export function NameControl({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (isButtonField(field.fieldType)) return null;
  return (
    <Field label="Name">
      <input
        value={(field.name as string) ?? ""}
        onChange={(e) => onPatch("name", e.target.value)}
        className={controlClassName()}
      />
    </Field>
  );
}

export function LabelControl({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (field.fieldType === "hidden") return null;
  return (
    <Field label="Label">
      <input
        value={(field.label as string) ?? ""}
        onChange={(e) => onPatch("label", e.target.value)}
        className={controlClassName()}
      />
    </Field>
  );
}

export function DescriptionControl({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (field.fieldType === "hidden" || isButtonField(field.fieldType)) return null;
  return (
    <Field label="Description">
      <input
        value={(field.description as string) ?? ""}
        onChange={(e) => onPatch("description", e.target.value || undefined)}
        className={controlClassName()}
      />
    </Field>
  );
}

export function PlaceholderControl({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (!(INPUT_FIELD_TYPES as readonly string[]).includes(field.fieldType)) return null;
  return (
    <Field label="Placeholder">
      <input
        value={(field.placeholder as string) ?? ""}
        onChange={(e) => onPatch("placeholder", e.target.value)}
        className={controlClassName()}
      />
    </Field>
  );
}

export function AffixControls({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  const hasInput = (INPUT_FIELD_TYPES as readonly string[]).includes(field.fieldType);
  if (!hasInput || field.fieldType === "paragraph" || field.fieldType === "color") return null;
  return (
    <>
      <Field label="Prefix">
        <input
          value={(field.prefix as string) ?? ""}
          onChange={(e) => onPatch("prefix", e.target.value || undefined)}
          className={controlClassName()}
        />
      </Field>
      <Field label="Suffix">
        <input
          value={(field.suffix as string) ?? ""}
          onChange={(e) => onPatch("suffix", e.target.value || undefined)}
          className={controlClassName()}
        />
      </Field>
    </>
  );
}

export function CharacterCountControls({
  field,
  onPatch,
}: {
  field: AnyField;
  onPatch: PatchField;
}) {
  const enabled =
    field.fieldType === "text" || field.fieldType === "search" || field.fieldType === "paragraph";
  if (!enabled) return null;
  return (
    <>
      <Field label="Max length">
        <input
          type="number"
          value={(field.maxLength as number) ?? ""}
          onChange={(e) =>
            onPatch("maxLength", e.target.value ? Number(e.target.value) : undefined)
          }
          className={controlClassName()}
        />
      </Field>
      <BooleanField
        label="Show character count"
        checked={!!field.showCharacterCount}
        onChange={(v) => onPatch("showCharacterCount", v)}
      />
    </>
  );
}

export function ParagraphControls({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (field.fieldType !== "paragraph") return null;
  return (
    <Field label="Rows">
      <input
        type="number"
        value={(field.rows as number) ?? 4}
        onChange={(e) => onPatch("rows", Number(e.target.value))}
        className={controlClassName()}
      />
    </Field>
  );
}

export function RequiredControl({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (field.fieldType === "hidden" || isButtonField(field.fieldType)) return null;
  return (
    <BooleanField
      label="Required"
      checked={!!field.required}
      onChange={(v) => onPatch("required", v)}
    />
  );
}
