import { describe, expect, it } from "vitest";
import { formFieldBlockSchema } from "./form-field-schemas";

describe("formField validationMessages schema", () => {
  it("accepts a text field with no validationMessages (field is optional)", () => {
    const result = formFieldBlockSchema.safeParse({
      type: "formField",
      fieldType: "text",
      name: "username",
      required: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a field with a subset of validationMessages keys", () => {
    const result = formFieldBlockSchema.safeParse({
      type: "formField",
      fieldType: "text",
      name: "username",
      required: true,
      minLength: 3,
      maxLength: 50,
      validationMessages: {
        valueMissing: "Username is required.",
        tooShort: "Username must be at least 3 characters.",
        tooLong: "Username cannot exceed 50 characters.",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid validationMessages keys", () => {
    const result = formFieldBlockSchema.safeParse({
      type: "formField",
      fieldType: "number",
      name: "age",
      min: 18,
      max: 120,
      step: 1,
      pattern: "\\d+",
      validationMessages: {
        valueMissing: "Age is required.",
        typeMismatch: "Please enter a valid number.",
        patternMismatch: "Please enter a whole number.",
        tooShort: "Too short.",
        tooLong: "Too long.",
        rangeUnderflow: "You must be at least 18.",
        rangeOverflow: "Maximum age is 120.",
        stepMismatch: "Please enter a whole number.",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts an email field with typeMismatch message", () => {
    const result = formFieldBlockSchema.safeParse({
      type: "formField",
      fieldType: "email",
      name: "email",
      required: true,
      validationMessages: {
        valueMissing: "Email address is required.",
        typeMismatch: "Please enter a valid email address.",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown validationMessages key (closed object)", () => {
    const result = formFieldBlockSchema.safeParse({
      type: "formField",
      fieldType: "text",
      name: "username",
      validationMessages: {
        valueMissing: "Required.",
        badConstraint: "This key is not valid.",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string values in validationMessages", () => {
    const result = formFieldBlockSchema.safeParse({
      type: "formField",
      fieldType: "text",
      name: "username",
      validationMessages: {
        valueMissing: 42,
      },
    });
    expect(result.success).toBe(false);
  });
});
