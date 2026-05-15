import { describe, expect, it } from "vitest";
import { elementBlockSchema } from "./element-block-schemas";
import { elementLayoutSchema } from "./element-foundation-schemas";

describe("borderGradient vs wrapperStyle border (SCHEMA-4)", () => {
  it("rejects borderGradient together with border-like wrapperStyle keys on elementLayoutSchema", () => {
    const result = elementLayoutSchema.safeParse({
      borderGradient: { stroke: "#ff0000", width: 2 },
      wrapperStyle: { border: "1px solid red" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join(".") === "wrapperStyle")).toBe(true);
    }
  });

  it("allows borderGradient with wrapperStyle that has no border/outline keys", () => {
    const result = elementLayoutSchema.safeParse({
      borderGradient: { stroke: "#ff0000", width: 2 },
      wrapperStyle: { padding: "8px" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects conflicting combo on a merged element (elementBlockSchema)", () => {
    const result = elementBlockSchema.safeParse({
      type: "elementHeading",
      text: "Title",
      borderGradient: { stroke: "#ff0000", width: 2 },
      wrapperStyle: { outline: "2px solid blue" },
    });
    expect(result.success).toBe(false);
  });
});
