import { describe, expect, it } from "vitest";
import { elementCodeSchema } from "./element-code-schemas";

describe("elementCode schema", () => {
  it("validates a minimal code block with required code field", () => {
    const result = elementCodeSchema.safeParse({
      type: "elementCode",
      code: "const x = 1;",
    });
    expect(result.success).toBe(true);
  });

  it("validates code with a language identifier", () => {
    const result = elementCodeSchema.safeParse({
      type: "elementCode",
      code: "print('hello')",
      language: "python",
    });
    expect(result.success).toBe(true);
  });

  it("validates code with wrap:true", () => {
    const result = elementCodeSchema.safeParse({
      type: "elementCode",
      code: "very long line that should wrap",
      wrap: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates code with showLineNumbers:true", () => {
    const result = elementCodeSchema.safeParse({
      type: "elementCode",
      code: "line 1\nline 2",
      showLineNumbers: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates code with all optional fields set", () => {
    const result = elementCodeSchema.safeParse({
      type: "elementCode",
      code: "function foo() {}",
      language: "typescript",
      wrap: false,
      showLineNumbers: true,
      fontSize: "0.875rem",
      fontFamily: "monospace",
      width: "100%",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when code field is missing", () => {
    const result = elementCodeSchema.safeParse({
      type: "elementCode",
      language: "typescript",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when code is not a string", () => {
    const result = elementCodeSchema.safeParse({
      type: "elementCode",
      code: 42,
    });
    expect(result.success).toBe(false);
  });

  it("validates code with layout overrides", () => {
    const result = elementCodeSchema.safeParse({
      type: "elementCode",
      code: "body { margin: 0; }",
      language: "css",
      width: "80%",
      marginTop: "1rem",
    });
    expect(result.success).toBe(true);
  });
});
