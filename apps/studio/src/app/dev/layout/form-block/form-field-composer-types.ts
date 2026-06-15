export type AnyField = Record<string, unknown> & {
  type: "formField";
  fieldType: string;
  fields?: AnyField[];
};

export type ChoiceOption = { value: string; label: string };

export type PatchField = (key: string, value: unknown) => void;
