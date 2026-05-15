"use client";

import {
  BooleanField,
  Field,
  controlClassName,
} from "@/app/dev/layout/_shared/section-type-workbench";
import type { AnyField, PatchField } from "./form-field-composer-types";
import {
  actionTypeToText,
  isButtonField,
  optionsToText,
  textToOptions,
} from "./form-field-composer-utils";

export function RowFieldControls({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="Columns">
        <input
          type="number"
          min={1}
          value={(field.columns as number) ?? 2}
          onChange={(e) => onPatch("columns", Number(e.target.value))}
          className={controlClassName()}
        />
      </Field>
      <Field label="Gap">
        <input
          value={(field.gap as string) ?? "1rem"}
          onChange={(e) => onPatch("gap", e.target.value)}
          className={controlClassName()}
          placeholder="1rem"
        />
      </Field>
    </div>
  );
}

export function NumericControls({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (field.fieldType !== "number" && field.fieldType !== "range") return null;
  return (
    <>
      <Field label="Min">
        <input
          type="number"
          value={(field.min as number) ?? 0}
          onChange={(e) => onPatch("min", Number(e.target.value))}
          className={controlClassName()}
        />
      </Field>
      <Field label="Max">
        <input
          type="number"
          value={(field.max as number) ?? 100}
          onChange={(e) => onPatch("max", Number(e.target.value))}
          className={controlClassName()}
        />
      </Field>
      <Field label="Step">
        <input
          type="number"
          value={(field.step as number) ?? 1}
          onChange={(e) => onPatch("step", Number(e.target.value))}
          className={controlClassName()}
        />
      </Field>
    </>
  );
}

export function ChoiceControls({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  const isChoice =
    field.fieldType === "select" ||
    field.fieldType === "radio" ||
    field.fieldType === "checkboxGroup";
  if (!isChoice) return null;
  return (
    <Field label="Options (value:label per line)">
      <textarea
        rows={3}
        value={optionsToText(field.options)}
        onChange={(e) => onPatch("options", textToOptions(e.target.value))}
        className={`${controlClassName()} col-span-2`}
      />
    </Field>
  );
}

export function FileControls({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (field.fieldType !== "file") return null;
  return (
    <>
      <Field label="Accept">
        <input
          value={(field.accept as string) ?? ""}
          onChange={(e) => onPatch("accept", e.target.value)}
          className={controlClassName()}
          placeholder="image/*,.pdf"
        />
      </Field>
      <BooleanField
        label="Multiple"
        checked={!!field.multiple}
        onChange={(v) => onPatch("multiple", v)}
      />
    </>
  );
}

export function HiddenControl({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (field.fieldType !== "hidden") return null;
  return (
    <Field label="Value">
      <input
        value={(field.value as string) ?? ""}
        onChange={(e) => onPatch("value", e.target.value)}
        className={controlClassName()}
      />
    </Field>
  );
}

export function ButtonControls({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (!isButtonField(field.fieldType)) return null;
  const buttonType =
    (field.buttonType as string) ?? (field.fieldType === "submit" ? "submit" : "button");
  return (
    <>
      <Field label="Button type">
        <select
          value={buttonType}
          onChange={(e) => onPatch("buttonType", e.target.value)}
          className={controlClassName()}
        >
          <option value="submit">Submit</option>
          <option value="reset">Reset</option>
          <option value="button">Button</option>
        </select>
      </Field>
      {buttonType === "submit" && (
        <Field label="Loading text">
          <input
            value={(field.loadingText as string) ?? ""}
            onChange={(e) => onPatch("loadingText", e.target.value)}
            className={controlClassName()}
            placeholder="Submitting..."
          />
        </Field>
      )}
      {buttonType === "button" && (
        <>
          <Field label="Action type">
            <input
              value={actionTypeToText(field.action)}
              onChange={(e) =>
                onPatch("action", e.target.value ? { type: e.target.value } : undefined)
              }
              className={controlClassName()}
              placeholder="modalOpen"
            />
          </Field>
          <Field label="Href">
            <input
              value={(field.href as string) ?? ""}
              onChange={(e) => onPatch("href", e.target.value || undefined)}
              className={controlClassName()}
              placeholder="/work"
            />
          </Field>
        </>
      )}
    </>
  );
}
