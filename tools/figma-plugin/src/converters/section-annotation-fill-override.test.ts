import { describe, expect, it } from "vitest";
import { applySectionFillAnnotationOverride } from "./section-annotation-fill-override";

describe("applySectionFillAnnotationOverride", () => {
  it("stashes layers to meta.figma.originalLayers then applies fill", () => {
    const section: Record<string, unknown> = {
      type: "contentBlock",
      layers: [
        { fill: "linear-gradient(red, blue)", blendMode: "multiply" },
        { fill: "#fff", opacity: 0.5 },
      ],
    };
    applySectionFillAnnotationOverride(section, "#ff0000");
    expect(section.fill).toBe("#ff0000");
    expect(section.layers).toBeUndefined();
    const meta = section.meta as { figma?: { originalLayers?: Array<Record<string, unknown>> } };
    expect(meta?.figma?.originalLayers).toHaveLength(2);
    expect(meta?.figma?.originalLayers?.[0]?.fill).toContain("gradient");
    expect(meta?.figma?.originalLayers?.[1]?.opacity).toBe(0.5);
  });

  it("does not add meta when there were no layers to preserve", () => {
    const section: Record<string, unknown> = {
      type: "contentBlock",
      fill: "#000000",
    };
    applySectionFillAnnotationOverride(section, "#ff0000");
    expect(section.fill).toBe("#ff0000");
    expect(section.meta).toBeUndefined();
  });

  it("does not overwrite existing originalLayers", () => {
    const section: Record<string, unknown> = {
      type: "contentBlock",
      layers: [{ fill: "a" }],
      meta: { figma: { originalLayers: [{ fill: "prior" }] } },
    };
    applySectionFillAnnotationOverride(section, "#abc");
    const meta = section.meta as { figma?: { originalLayers?: Array<{ fill?: string }> } };
    expect(meta?.figma?.originalLayers).toEqual([{ fill: "prior" }]);
  });
});
