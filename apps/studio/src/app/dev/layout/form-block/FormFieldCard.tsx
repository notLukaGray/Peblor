"use client";

import { useState } from "react";
import { controlClassName } from "@/app/dev/layout/_shared/section-type-workbench";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  getFieldDefaults,
  type FormFieldType,
} from "./form-field-defaults";
import type { AnyField } from "./form-field-composer-types";
import { normalizeFieldType } from "./form-field-composer-utils";
import { FieldControls } from "./FormFieldControls";
import { VariantPicker } from "./FormFieldVariantPicker";

type Props = {
  field: AnyField;
  index: number;
  total: number;
  onChangeField: (field: AnyField) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
};

function isNamelessType(fieldType: FormFieldType): boolean {
  return fieldType === "button" || fieldType === "row";
}

function childFields(field: AnyField): AnyField[] {
  return Array.isArray(field.fields) ? field.fields : [];
}

function JsonEditor({
  text,
  error,
  onTextChange,
  onCommit,
}: {
  text: string;
  error: string | null;
  onTextChange: (text: string) => void;
  onCommit: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onBlur={onCommit}
        rows={10}
        spellCheck={false}
        className={`${controlClassName()} w-full resize-y font-mono text-[11px] leading-5`}
      />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

function RowChildren({
  field,
  onChangeField,
}: {
  field: AnyField;
  onChangeField: (field: AnyField) => void;
}) {
  if (field.fieldType !== "row") return null;
  const children = childFields(field);
  const setChildren = (fields: AnyField[]) => onChangeField({ ...field, fields });
  const moveChild = (childIndex: number, dir: -1 | 1) => {
    const next = [...children];
    const target = childIndex + dir;
    if (target < 0 || target >= next.length) return;
    const current = next[childIndex];
    const dest = next[target];
    if (!current || !dest) return;
    next[childIndex] = dest;
    next[target] = current;
    setChildren(next);
  };

  return (
    <div className="space-y-2 rounded border border-border/60 bg-muted/10 p-2">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70">
        Row fields
      </p>
      {children.map((child, childIndex) => (
        <FormFieldCard
          key={childIndex}
          field={child}
          index={childIndex}
          total={children.length}
          onChangeField={(next) =>
            setChildren(children.map((item, i) => (i === childIndex ? next : item)))
          }
          onMove={(dir) => moveChild(childIndex, dir)}
          onRemove={() => setChildren(children.filter((_, i) => i !== childIndex))}
        />
      ))}
      <button
        onClick={() => setChildren([...children, getFieldDefaults("text") as unknown as AnyField])}
        className="rounded border border-border bg-background px-3 py-1.5 text-[12px] hover:bg-muted"
      >
        Add row field
      </button>
    </div>
  );
}

export function FormFieldCard({ field, index, total, onChangeField, onMove, onRemove }: Props) {
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(field, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  function toggleJsonMode() {
    setJsonMode((current) => {
      const next = !current;
      if (next) {
        setJsonText(JSON.stringify(field, null, 2));
        setJsonError(null);
      }
      return next;
    });
  }

  function commitJson() {
    try {
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      if (parsed["type"] !== "formField") throw new Error('Must have type: "formField"');
      onChangeField(parsed as AnyField);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  function changeType(fieldType: FormFieldType) {
    const defaults = getFieldDefaults(fieldType);
    onChangeField({
      ...defaults,
      name: isNamelessType(fieldType) ? undefined : ((field.name as string) ?? fieldType),
    } as unknown as AnyField);
  }

  const tabBtn = (active: boolean) =>
    `rounded border px-2 py-0.5 text-[10px] font-mono transition-colors ${active ? "border-foreground/40 bg-foreground/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted/60"}`;

  return (
    <div className="rounded border border-border bg-background/40 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={normalizeFieldType(field.fieldType)}
          onChange={(e) => changeType(e.target.value as FormFieldType)}
          className={`${controlClassName()} flex-1 text-[11px]`}
        >
          {FIELD_TYPES.map((ft) => (
            <option key={ft} value={ft}>
              {FIELD_TYPE_LABELS[ft]}
            </option>
          ))}
        </select>
        <button onClick={toggleJsonMode} className={tabBtn(jsonMode)}>
          {"{...}"}
        </button>
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="rounded border border-border px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-30"
        >
          Up
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="rounded border border-border px-2 py-1 text-[11px] hover:bg-muted disabled:opacity-30"
        >
          Down
        </button>
        <button
          onClick={onRemove}
          className="rounded border border-destructive/40 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
        >
          Remove
        </button>
      </div>
      <VariantPicker field={field} onApply={(patch) => onChangeField({ ...field, ...patch })} />
      {jsonMode ? (
        <JsonEditor
          text={jsonText}
          error={jsonError}
          onTextChange={setJsonText}
          onCommit={commitJson}
        />
      ) : (
        <>
          <FieldControls
            field={field}
            onPatch={(key, value) => onChangeField({ ...field, [key]: value })}
          />
          <RowChildren field={field} onChangeField={onChangeField} />
        </>
      )}
    </div>
  );
}
