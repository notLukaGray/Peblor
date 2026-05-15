const CHOICE_OPTIONS = [
  { value: "option_a", label: "Option A" },
  { value: "option_b", label: "Option B" },
  { value: "option_c", label: "Option C" },
];

export const FIELD_TYPES = [
  "text",
  "email",
  "password",
  "tel",
  "url",
  "number",
  "date",
  "time",
  "datetime-local",
  "color",
  "search",
  "paragraph",
  "checkbox",
  "checkboxGroup",
  "radio",
  "select",
  "switch",
  "range",
  "file",
  "hidden",
  "button",
  "row",
] as const;

export type FormFieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Text",
  email: "Email",
  password: "Password",
  tel: "Tel",
  url: "URL",
  number: "Number",
  date: "Date",
  time: "Time",
  "datetime-local": "Date + Time",
  color: "Color",
  search: "Search",
  paragraph: "Paragraph",
  checkbox: "Checkbox",
  checkboxGroup: "Checkbox Group",
  radio: "Radio",
  select: "Select",
  switch: "Switch",
  range: "Range",
  file: "File",
  hidden: "Hidden",
  button: "Button",
  row: "Row",
};

function toLabel(s: string): string {
  return s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

type DefaultBuilder = (base: Record<string, unknown>) => Record<string, unknown>;

const withPlaceholder: DefaultBuilder = (base) => ({ ...base, placeholder: "", required: false });
const withRequiredFalse: DefaultBuilder = (base) => ({ ...base, required: false });
const withNumberBounds: DefaultBuilder = (base) => ({
  ...base,
  placeholder: "",
  required: false,
  min: 0,
  max: 100,
  step: 1,
});

const DEFAULT_BUILDERS: Record<FormFieldType, DefaultBuilder> = {
  text: withPlaceholder,
  email: withPlaceholder,
  password: withPlaceholder,
  tel: withPlaceholder,
  url: withPlaceholder,
  number: withNumberBounds,
  date: withRequiredFalse,
  time: withRequiredFalse,
  "datetime-local": withRequiredFalse,
  color: withRequiredFalse,
  search: withPlaceholder,
  paragraph: (base) => ({ ...base, placeholder: "", required: false, rows: 4 }),
  checkbox: withRequiredFalse,
  checkboxGroup: (base) => ({ ...base, required: false, options: CHOICE_OPTIONS }),
  radio: (base) => ({ ...base, required: false, options: CHOICE_OPTIONS }),
  select: (base) => ({ ...base, required: false, options: CHOICE_OPTIONS }),
  switch: withRequiredFalse,
  range: (base) => ({ ...base, min: 0, max: 100, step: 1 }),
  file: (base) => ({ ...base, required: false, multiple: false, accept: "" }),
  hidden: (base) => ({ ...base, value: "" }),
  button: (_base) => ({
    type: "formField",
    fieldType: "button",
    buttonType: "submit",
    label: "Submit",
    loadingText: "Submitting...",
  }),
  row: (_base) => ({
    type: "formField",
    fieldType: "row",
    columns: 2,
    gap: "1rem",
    fields: [
      { ...getFieldDefaults("text"), name: "first_name", label: "First name" },
      { ...getFieldDefaults("text"), name: "last_name", label: "Last name" },
    ],
  }),
};

// Returns a sensible default field object for each fieldType.
// Typed loosely so callers don't need to import FormFieldBlock.
export function getFieldDefaults(fieldType: FormFieldType): Record<string, unknown> {
  const base = {
    type: "formField",
    fieldType,
    name: fieldType,
    label: toLabel(fieldType),
    level: 3,
  };
  return DEFAULT_BUILDERS[fieldType](base);
}
