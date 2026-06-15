import { describe, expect, it } from "vitest";
import { elementBlockquoteSchema } from "./element-blockquote-schemas";

describe("elementBlockquote schema", () => {
  it("validates a minimal blockquote with required text", () => {
    const result = elementBlockquoteSchema.safeParse({
      type: "elementBlockquote",
      text: "The best way to predict the future is to invent it.",
    });
    expect(result.success).toBe(true);
  });

  it("validates a blockquote with cite URL", () => {
    const result = elementBlockquoteSchema.safeParse({
      type: "elementBlockquote",
      text: "Design is not just what it looks like and feels like.",
      cite: "https://example.com/source",
    });
    expect(result.success).toBe(true);
  });

  it("validates a blockquote with attribution", () => {
    const result = elementBlockquoteSchema.safeParse({
      type: "elementBlockquote",
      text: "Simplicity is the ultimate sophistication.",
      attribution: "Leonardo da Vinci",
    });
    expect(result.success).toBe(true);
  });

  it("validates a blockquote with all optional fields", () => {
    const result = elementBlockquoteSchema.safeParse({
      type: "elementBlockquote",
      text: "In the middle of every difficulty lies opportunity.",
      cite: "https://example.com/einstein",
      attribution: "Albert Einstein",
      fontSize: "1.25rem",
      lineHeight: 1.8,
      width: "80%",
      align: "center",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when text is missing", () => {
    const result = elementBlockquoteSchema.safeParse({
      type: "elementBlockquote",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when text is not a string", () => {
    const result = elementBlockquoteSchema.safeParse({
      type: "elementBlockquote",
      text: 42,
    });
    expect(result.success).toBe(false);
  });
});
