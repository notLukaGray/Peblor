import type { FormFieldBlock } from "@pb/contracts/types";
import type { FormFieldValue } from "..";

type Props = {
  field: FormFieldBlock;
  value: FormFieldValue;
};

export function FormFieldHidden({ field, value }: Props) {
  if (field.fieldType !== "hidden" || !field.name) return null;

  const strValue = typeof value === "string" ? value : String(field.value ?? "");
  return <input type="hidden" name={field.name} value={strValue} />;
}
