"use client";

import type { AnyField, PatchField } from "./form-field-composer-types";
import {
  AffixControls,
  CharacterCountControls,
  DescriptionControl,
  LabelControl,
  NameControl,
  ParagraphControls,
  PlaceholderControl,
  RequiredControl,
} from "./FormFieldBasicControls";
import {
  ButtonControls,
  ChoiceControls,
  FileControls,
  HiddenControl,
  NumericControls,
  RowFieldControls,
} from "./FormFieldSpecialControls";

export function FieldControls({ field, onPatch }: { field: AnyField; onPatch: PatchField }) {
  if (field.fieldType === "row") return <RowFieldControls field={field} onPatch={onPatch} />;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <NameControl field={field} onPatch={onPatch} />
      <LabelControl field={field} onPatch={onPatch} />
      <DescriptionControl field={field} onPatch={onPatch} />
      <PlaceholderControl field={field} onPatch={onPatch} />
      <AffixControls field={field} onPatch={onPatch} />
      <CharacterCountControls field={field} onPatch={onPatch} />
      <ParagraphControls field={field} onPatch={onPatch} />
      <NumericControls field={field} onPatch={onPatch} />
      <ChoiceControls field={field} onPatch={onPatch} />
      <FileControls field={field} onPatch={onPatch} />
      <HiddenControl field={field} onPatch={onPatch} />
      <ButtonControls field={field} onPatch={onPatch} />
      <RequiredControl field={field} onPatch={onPatch} />
    </div>
  );
}
