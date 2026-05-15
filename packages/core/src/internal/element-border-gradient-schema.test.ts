import { describe, expect, it } from "vitest";
import { elementBlockSchema } from "@pb/contracts/peblor/core/peblor-schemas/element-block-schemas";

describe("element borderGradient schema rules", () => {
  const baseGroup = {
    type: "elementGroup",
    id: "card",
    section: { elementOrder: [], definitions: {} },
    wrapperStyle: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      borderRadius: "9999px",
    },
  } as const;

  it("accepts borderGradient when wrapperStyle has no border keys", () => {
    const parsed = elementBlockSchema.safeParse({
      ...baseGroup,
      borderGradient: {
        stroke: "linear-gradient(90deg, #000 0%, #666 100%)",
        width: "1px",
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects borderGradient when wrapperStyle also defines border", () => {
    const parsed = elementBlockSchema.safeParse({
      ...baseGroup,
      borderGradient: {
        stroke: "linear-gradient(90deg, #000 0%, #666 100%)",
        width: "1px",
      },
      wrapperStyle: {
        ...baseGroup.wrapperStyle,
        border: "1px solid #000",
      },
    });
    expect(parsed.success).toBe(false);
  });
});
