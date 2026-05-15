import { describe, expect, it } from "vitest";
import { getDefaultStyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";
import { mergeLayoutFramesSlices, pickLayoutFramesSlices } from "./layout-frames-dev-state";

describe("layout-frames-dev-state", () => {
  it("picks frame slices from style state", () => {
    const style = getDefaultStyleToolPersistedV3();
    const slices = pickLayoutFramesSlices(style);
    expect(slices.guidelines.framePaddingDefault).toBe(style.guidelines.framePaddingDefault);
    expect(slices.locks.framePaddingDefault).toBe(style.locks.framePaddingDefault);
  });

  it("merges frame slices back into style state", () => {
    const style = getDefaultStyleToolPersistedV3();
    const merged = mergeLayoutFramesSlices(style, {
      guidelines: {
        frameGapWhenUnset: "2rem",
        frameRowGapWhenUnset: "1rem",
        frameColumnGapWhenUnset: "1rem",
        frameAlignItemsDefault: "center",
        frameFlexDirectionDefault: "row",
        frameJustifyContentDefault: "space-between",
        framePaddingDefault: "1rem",
        frameFlexWrapDefault: "wrap",
        frameBorderRadiusDefault: "0.5rem",
      },
      locks: {
        frameGapWhenUnset: true,
        frameRowGapWhenUnset: true,
        frameColumnGapWhenUnset: true,
        frameAlignItemsDefault: true,
        frameFlexDirectionDefault: true,
        frameJustifyContentDefault: true,
        framePaddingDefault: true,
        frameFlexWrapDefault: true,
        frameBorderRadiusDefault: true,
      },
    });
    expect(merged.guidelines.frameJustifyContentDefault).toBe("space-between");
    expect(merged.locks.frameJustifyContentDefault).toBe(true);
  });
});
