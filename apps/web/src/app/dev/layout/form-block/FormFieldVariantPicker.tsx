"use client";

import { useState } from "react";
import {
  VARIANT_LABELS as BUTTON_VARIANT_LABELS,
  VARIANT_ORDER as BUTTON_VARIANT_ORDER,
} from "@/app/dev/elements/button/constants";
import {
  VARIANT_LABELS as INPUT_VARIANT_LABELS,
  VARIANT_ORDER as INPUT_VARIANT_ORDER,
} from "@/app/dev/elements/input/constants";
import { controlClassName } from "@/app/dev/layout/_shared/section-type-workbench";
import { getWorkbenchSession } from "@/app/dev/workbench/workbench-session";
import type { AnyField } from "./form-field-composer-types";
import { isButtonField } from "./form-field-composer-utils";
import {
  INPUT_FIELD_TYPES,
  getButtonVariantStylePatch,
  getInputVariantStylePatch,
} from "./form-field-variant-mapper";

export function VariantPicker({
  field,
  onApply,
}: {
  field: AnyField;
  onApply: (patch: Record<string, unknown>) => void;
}) {
  const [selected, setSelected] = useState("");
  const isInput = (INPUT_FIELD_TYPES as readonly string[]).includes(field.fieldType);
  const isButton = isButtonField(field.fieldType);
  if (!isInput && !isButton) return null;

  function handleChange(variantKey: string) {
    if (!variantKey) return;
    const session = getWorkbenchSession();
    const patch = isButton
      ? getButtonVariantStylePatch(variantKey, session)
      : getInputVariantStylePatch(variantKey, session);
    onApply(patch);
    setSelected("");
  }

  const options = isButton
    ? BUTTON_VARIANT_ORDER.map((key) => (
        <option key={key} value={key}>
          {BUTTON_VARIANT_LABELS[key]}
        </option>
      ))
    : INPUT_VARIANT_ORDER.map((key) => (
        <option key={key} value={key}>
          {INPUT_VARIANT_LABELS[key]}
        </option>
      ));

  return (
    <div className="flex items-center gap-2 border-t border-border/50 pt-2">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60 shrink-0">
        {isButton ? "button" : "input"} variant
      </span>
      <select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          handleChange(e.target.value);
        }}
        className={`${controlClassName()} flex-1 text-[11px]`}
      >
        <option value="">Apply variant styles...</option>
        {options}
      </select>
    </div>
  );
}
