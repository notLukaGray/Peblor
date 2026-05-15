/**
 * Structural class names for form controls (no typography). Typography comes from
 * level + labelClassName/inputClassName in JSON via form-field-typography helpers.
 */
export const formFieldStructuralClasses = {
  choiceLabel: "flex items-center gap-2 cursor-pointer",
  choiceGroup: "space-y-2",
  checkbox: "rounded border-input",
  radio: "border-input",
  checkboxGroupItem: "border-input rounded",
  fileInput:
    "w-full text-foreground file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground",
  inputBorderError: "var(--destructive)",
} as const;
