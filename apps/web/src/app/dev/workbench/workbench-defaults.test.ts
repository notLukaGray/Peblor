import { describe, expect, it } from "vitest";
import {
  getDefaultWorkbenchSession,
  mergeWorkbenchSessionWithDefaults,
} from "@/app/dev/workbench/workbench-defaults";

describe("workbench-defaults", () => {
  it("fills missing element slices when merging partial sessions", () => {
    const defaults = getDefaultWorkbenchSession();
    const merged = mergeWorkbenchSessionWithDefaults({
      v: 2,
      elements: {
        button: {
          ...defaults.elements.button,
          defaultVariant: "accent",
        },
      },
    });

    expect(merged.elements.button.defaultVariant).toBe("accent");
    expect(merged.elements.image).toEqual(defaults.elements.image);
    expect(merged.elements.body).toEqual(defaults.elements.body);
    expect(merged.elements.heading).toEqual(defaults.elements.heading);
    expect(merged.elements.link).toEqual(defaults.elements.link);
    expect(merged.elements.richText).toEqual(defaults.elements.richText);
    expect(merged.elements.input).toEqual(defaults.elements.input);
    expect(merged.elements.range).toEqual(defaults.elements.range);
    expect(merged.elements.video).toEqual(defaults.elements.video);
    expect(merged.elements.videoTime).toEqual(defaults.elements.videoTime);
    expect(merged.elements.vector).toEqual(defaults.elements.vector);
    expect(merged.elements.svg).toEqual(defaults.elements.svg);
    expect(merged.elements.model3d).toEqual(defaults.elements.model3d);
    expect(merged.elements.rive).toEqual(defaults.elements.rive);
    expect(merged.elements.spacer).toEqual(defaults.elements.spacer);
    expect(merged.elements.scrollProgressBar).toEqual(defaults.elements.scrollProgressBar);
  });
});
