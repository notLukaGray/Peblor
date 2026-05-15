import { describe, expect, it } from "vitest";
import { normalizeImageTransformParams } from "./cdn-image-params";

describe("normalizeImageTransformParams", () => {
  it("normalizes, aliases, and clamps supported params", () => {
    const out = normalizeImageTransformParams({
      w: "99999",
      q: "0",
      format: "WEBP",
      aspect_ratio: "16/9",
      class: "hero-banner",
      bogus: "x",
    });

    expect(out).toEqual({
      width: "4096",
      quality: "1",
      format: "webp",
      aspect_ratio: "16:9",
      class: "hero-banner",
    });
  });

  it.each([
    [{ width: "not-a-number" }, undefined],
    [{ class: "bad class" }, undefined],
    [{ format: "gif" }, undefined],
    [{ aspect_ratio: "16x9" }, undefined],
  ])("drops invalid-only payload %j", (input, expected) => {
    expect(normalizeImageTransformParams(input as Record<string, unknown>)).toEqual(expected);
  });
});
