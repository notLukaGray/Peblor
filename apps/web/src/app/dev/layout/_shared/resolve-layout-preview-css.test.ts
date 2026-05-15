import { describe, expect, it } from "vitest";
import { replaceVwUnitsWithPreviewFrameWidth } from "./resolve-layout-preview-css";

describe("replaceVwUnitsWithPreviewFrameWidth", () => {
  it("rewrites vw against the preview frame width", () => {
    expect(replaceVwUnitsWithPreviewFrameWidth("min(90vw, 900px)", 800)).toBe("min(720px, 900px)");
  });

  it("leaves non-vw tokens unchanged", () => {
    expect(replaceVwUnitsWithPreviewFrameWidth("var(--pb-width-narrow)", 800)).toBe(
      "var(--pb-width-narrow)"
    );
    expect(replaceVwUnitsWithPreviewFrameWidth("100%", 800)).toBe("100%");
  });
});
