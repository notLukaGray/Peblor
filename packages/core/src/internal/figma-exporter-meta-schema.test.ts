import { describe, expect, it } from "vitest";
import { elementBlockSchema } from "@pb/contracts/peblor/core/peblor-schemas/element-block-schemas";
import {
  figmaExporterMetaSchema,
  peblorMetaSchema,
} from "@pb/contracts/peblor/core/peblor-schemas/figma-exporter-meta-schema";

describe("peblorMetaSchema", () => {
  it("accepts meta.figma and preserves extension keys on meta and figma", () => {
    const parsed = peblorMetaSchema.safeParse({
      figma: {
        sourceType: "STICKY",
        futureField: "kept",
      },
      otherVendor: { x: 1 },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.figma?.sourceType).toBe("STICKY");
      expect(parsed.data.figma && "futureField" in parsed.data.figma).toBe(true);
      expect("otherVendor" in parsed.data).toBe(true);
    }
  });

  it("accepts originalLayers aligned with divider layers", () => {
    const parsed = figmaExporterMetaSchema.safeParse({
      originalLayers: [{ fill: "#000", blendMode: "multiply", opacity: 0.5 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.originalLayers).toEqual([
        { fill: "#000", blendMode: "multiply", opacity: 0.5 },
      ]);
    }
  });

  it("rejects invalid originalLayers entries", () => {
    const parsed = figmaExporterMetaSchema.safeParse({
      originalLayers: [{ fill: 42 }],
    });
    expect(parsed.success).toBe(false);
  });
});

describe("elementBlockSchema with meta.figma", () => {
  it("parses elementHeading with nested exporter metadata", () => {
    const parsed = elementBlockSchema.safeParse({
      type: "elementHeading",
      level: 2,
      text: "Hi",
      meta: {
        figma: {
          sourceName: "Title",
          fallbackReason: "test-reason",
          exporterNote: "parity",
        },
      },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.meta?.figma).toMatchObject({
        sourceName: "Title",
        fallbackReason: "test-reason",
        exporterNote: "parity",
      });
    }
  });
});
