import { describe, it, expect } from "vitest";
import { pageOutline } from "./page-outline.js";

describe("page_outline", () => {
  it("returns a compact structural overview for a known page", async () => {
    const result = (await pageOutline.run({ route: "/presets/cards-basic" })) as {
      route: string;
      filePath: string;
      title: string;
      presets: string[];
      overlays: string[];
      sectionCount: number;
      sections: Array<{
        key: string;
        type: string;
        source: string;
        elementCount: number;
        elements: Array<{ key: string; type: string; source: string }>;
      }>;
    };

    expect(result.route).toBe("/presets/cards-basic");
    expect(typeof result.filePath).toBe("string");
    expect(result.title).toContain("Cards Basic");
    expect(result.sectionCount).toBeGreaterThan(0);
    expect(Array.isArray(result.sections)).toBe(true);
    expect(Array.isArray(result.overlays)).toBe(true);
    expect(Array.isArray(result.presets)).toBe(true);
  });

  it("sections include type and source annotations", async () => {
    const result = (await pageOutline.run({ route: "/presets/type-scale" })) as {
      sections: Array<{ key: string; type: string; source: string; elements: unknown[] }>;
    };

    expect(result.sections.length).toBeGreaterThan(0);
    for (const section of result.sections) {
      expect(typeof section.key).toBe("string");
      expect(typeof section.type).toBe("string");
      expect(typeof section.source).toBe("string");
      expect(Array.isArray(section.elements)).toBe(true);
    }
  });

  it("includes a text preview for elementHeading elements", async () => {
    const result = (await pageOutline.run({ route: "/presets/type-scale" })) as {
      sections: Array<{
        elements: Array<{ key: string; type: string; preview?: string }>;
      }>;
    };

    const allElements = result.sections.flatMap((s) => s.elements);
    // type-scale page has multiple heading elements with text
    const withPreview = allElements.filter((e) => e.preview !== undefined);
    expect(withPreview.length).toBeGreaterThan(0);
  });

  it("includes childCount for elementGroup elements", async () => {
    const result = (await pageOutline.run({ route: "/presets/cards-basic" })) as {
      sections: Array<{
        elements: Array<{ key: string; type: string; childCount?: number }>;
      }>;
    };

    const allElements = result.sections.flatMap((s) => s.elements);
    const groups = allElements.filter((e) => e.type === "elementGroup");
    // cards-basic has elementGroup elements (cards rows)
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(typeof group.childCount).toBe("number");
    }
  });

  it("overlays list includes header", async () => {
    const result = (await pageOutline.run({ route: "/presets/cards-basic" })) as {
      overlays: string[];
    };
    expect(result.overlays).toContain("header");
  });

  it("throws for a non-existent route", async () => {
    await expect(pageOutline.run({ route: "/nonexistent-page" })).rejects.toThrow();
  });
});
