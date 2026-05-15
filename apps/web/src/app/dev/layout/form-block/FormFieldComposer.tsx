"use client";

import { useState } from "react";
import { controlClassName } from "@/app/dev/layout/_shared/section-type-workbench";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  getFieldDefaults,
  type FormFieldType,
} from "./form-field-defaults";
import { FormFieldCard } from "./FormFieldCard";
import type { AnyField } from "./form-field-composer-types";

export type { AnyField } from "./form-field-composer-types";

interface Props {
  fields: AnyField[];
  onChange: (fields: AnyField[]) => void;
}

export function FormFieldComposer({ fields, onChange }: Props) {
  const [addType, setAddType] = useState<FormFieldType>("text");

  function move(index: number, dir: -1 | 1) {
    const next = [...fields];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const current = next[index];
    const dest = next[target];
    if (!current || !dest) return;
    next[index] = dest;
    next[target] = current;
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <FormFieldCard
          key={index}
          field={field}
          index={index}
          total={fields.length}
          onChangeField={(f) => onChange(fields.map((x, i) => (i === index ? f : x)))}
          onMove={(dir) => move(index, dir)}
          onRemove={() => onChange(fields.filter((_, i) => i !== index))}
        />
      ))}

      <div className="flex gap-2 border-t border-border pt-3 mt-1">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value as FormFieldType)}
          className={`${controlClassName()} flex-1`}
        >
          {FIELD_TYPES.map((ft) => (
            <option key={ft} value={ft}>
              {FIELD_TYPE_LABELS[ft]}
            </option>
          ))}
        </select>
        <button
          onClick={() => onChange([...fields, getFieldDefaults(addType) as unknown as AnyField])}
          className="rounded border border-border bg-background px-3 py-1.5 text-[12px] hover:bg-muted whitespace-nowrap"
        >
          Add field
        </button>
      </div>
    </div>
  );
}
