import { describe, it, expect } from "vitest";
import {
  looksLikeElementBlock,
  applyElementOverrides,
  isBgBlockPayload,
  type OverridesMap,
} from "./peblor-overrides";
import type { SectionBlock, ElementBlock } from "@pb/contracts/peblor/core/peblor-schemas";

describe("peblor-overrides", () => {
  describe("looksLikeElementBlock", () => {
    it("returns false for null and undefined", () => {
      expect(looksLikeElementBlock(null)).toBe(false);
      expect(looksLikeElementBlock(undefined)).toBe(false);
    });

    it("returns false for non-objects", () => {
      expect(looksLikeElementBlock("")).toBe(false);
      expect(looksLikeElementBlock(0)).toBe(false);
    });

    it("returns false for object without type", () => {
      expect(looksLikeElementBlock({})).toBe(false);
      expect(looksLikeElementBlock({ id: "x" })).toBe(false);
    });

    it("returns false when type is not a string", () => {
      expect(looksLikeElementBlock({ type: 1 })).toBe(false);
    });

    it("returns true for object with string type", () => {
      expect(looksLikeElementBlock({ type: "elementVideo" })).toBe(true);
      expect(looksLikeElementBlock({ type: "elementImage", id: "img1" })).toBe(true);
    });
  });

  describe("applyElementOverrides", () => {
    const sectionWithElements = {
      type: "sectionColumn" as const,
      id: "s1",
      columns: 1,
      columnAssignments: {} as Record<string, number>,
      elements: [
        { type: "elementVideo" as const, id: "v1", src: "a" },
        { type: "elementImage" as const, id: "v2", ref: "b" },
      ],
    } as SectionBlock;

    it("returns sections unchanged when overrides is empty", () => {
      const sections = [sectionWithElements] as SectionBlock[];
      expect(applyElementOverrides(sections, {})).toBe(sections);
    });

    it("overrides element by id when override looks like element block", () => {
      const sections = [
        {
          ...sectionWithElements,
          elements: [
            ...(sectionWithElements as SectionBlock & { elements?: ElementBlock[] }).elements!,
          ],
        },
      ] as SectionBlock[];
      const overrides: OverridesMap = {
        v1: { type: "elementVideo", id: "v1", src: "overridden" },
      };
      const result = applyElementOverrides(sections, overrides);
      const el0 = (result[0] as SectionBlock & { elements?: ElementBlock[] }).elements?.[0];
      expect(el0).toBeDefined();
      expect((el0 as { src?: string }).src).toBe("overridden");
    });

    it("leaves section without elements unchanged", () => {
      const sectionNoElements = {
        type: "sectionColumn" as const,
        id: "s2",
        columns: 1,
        columnAssignments: {} as Record<string, number>,
      } as SectionBlock;
      const sections = [sectionNoElements] as SectionBlock[];
      const overrides: OverridesMap = { v1: { type: "elementVideo", src: "x" } };
      const result = applyElementOverrides(sections, overrides);
      expect(result[0]).toEqual(sectionNoElements);
    });

    it("ignores override that does not look like element block", () => {
      const sections = [
        {
          ...sectionWithElements,
          elements: [
            ...(sectionWithElements as SectionBlock & { elements?: ElementBlock[] }).elements!,
          ],
        },
      ] as SectionBlock[];
      const overrides: OverridesMap = { v1: { notType: "junk" } };
      const result = applyElementOverrides(sections, overrides);
      const el0 = (result[0] as SectionBlock & { elements?: ElementBlock[] }).elements?.[0];
      expect((el0 as { src?: string }).src).toBe("a");
    });
  });

  describe("isBgBlockPayload", () => {
    it("returns false for null and undefined", () => {
      expect(isBgBlockPayload(null)).toBe(false);
      expect(isBgBlockPayload(undefined)).toBe(false);
    });

    it("returns false for non-objects", () => {
      expect(isBgBlockPayload("backgroundVariable")).toBe(false);
    });

    it("returns false for object without type", () => {
      expect(isBgBlockPayload({})).toBe(false);
    });

    it("returns true for known background types", () => {
      expect(isBgBlockPayload({ type: "backgroundVariable" })).toBe(true);
      expect(isBgBlockPayload({ type: "backgroundImage" })).toBe(true);
      expect(isBgBlockPayload({ type: "backgroundTransition" })).toBe(true);
    });

    it("returns false for unknown type string", () => {
      expect(isBgBlockPayload({ type: "backgroundColor" })).toBe(false);
      expect(isBgBlockPayload({ type: "unknownBg" })).toBe(false);
    });
  });
});
