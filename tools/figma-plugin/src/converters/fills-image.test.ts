import { describe, expect, it } from "vitest";
import { extractSectionFillPayload } from "./fills-image";

describe("extractSectionFillPayload opacity", () => {
  it("includes sub-unity paint opacity on a single layer", () => {
    const result = extractSectionFillPayload(
      [
        {
          type: "SOLID",
          visible: true,
          color: { r: 1, g: 0, b: 0 },
          opacity: 0.35,
        } as Paint,
      ],
      undefined
    );
    expect(result?.layers).toBeDefined();
    expect(result?.layers?.[0]?.opacity).toBe(0.35);
    expect(result?.fill).toBeUndefined();
  });

  it("omits default unity opacity to keep single-fill shape", () => {
    const result = extractSectionFillPayload(
      [
        {
          type: "SOLID",
          visible: true,
          color: { r: 1, g: 0, b: 0 },
          opacity: 1,
        } as Paint,
      ],
      undefined
    );
    expect(result?.fill).toBeDefined();
    expect(result?.layers).toBeUndefined();
  });

  it("promotes to layered payload when blend mode is present", () => {
    const result = extractSectionFillPayload(
      [
        {
          type: "SOLID",
          visible: true,
          color: { r: 0, g: 0, b: 0 },
          blendMode: "MULTIPLY",
        } as Paint,
      ],
      undefined
    );
    expect(result?.layers?.[0]).toMatchObject({ blendMode: "multiply" });
    expect(result?.fill).toBeUndefined();
  });

  it("clamps invalid opacity values into supported range", () => {
    const result = extractSectionFillPayload(
      [
        {
          type: "SOLID",
          visible: true,
          color: { r: 1, g: 1, b: 1 },
          opacity: 3,
        } as Paint,
      ],
      undefined
    );
    expect(result?.fill).toBeDefined();
    expect(result?.layers).toBeUndefined();
  });
});
