import { describe, it, expect, vi } from "vitest";
import {
  resolveSlotElements,
  reconcileElementOrderWithDefinitions,
  getRegionFromClientX,
  getFeedbackJustifyContent,
  getFeedbackPadding,
  inferSeekFeedbackType,
} from "./module-slot-utils";
import type { ModuleSlotConfig } from "./module-slot-types";
import {
  elementBlockSchema,
  cssGradientDefinitionSchema,
} from "@pb/contracts/peblor/core/peblor-schemas";

function elImage(overrides: { id?: string } & Record<string, unknown> = {}) {
  return elementBlockSchema.parse({ type: "elementImage", src: "", alt: "", ...overrides });
}
function elVideo(overrides: Record<string, unknown> = {}) {
  return elementBlockSchema.parse({ type: "elementVideo", src: "v1", poster: "", ...overrides });
}

describe("module-slot-utils", () => {
  describe("reconcileElementOrderWithDefinitions", () => {
    it("ignores stale order keys and appends unreferenced definitions", () => {
      const definitions = {
        a: elImage({ id: "a" }),
        b: elVideo(),
      };
      expect(reconcileElementOrderWithDefinitions(["missing", "b", "a"], definitions)).toEqual([
        "b",
        "a",
      ]);
    });
    it("handles responsive { base, md } elementOrder shape", () => {
      const definitions = {
        a: elImage({ id: "a" }),
        b: elVideo(),
      };
      const result = reconcileElementOrderWithDefinitions(
        { base: ["a", "b"], md: ["b", "a"] },
        definitions
      );
      // Defaults to md order
      expect(result).toEqual(["b", "a"]);
    });
  });

  describe("resolveSlotElements", () => {
    it("returns empty array when slot has no section or definitions", () => {
      expect(resolveSlotElements({})).toEqual([]);
      expect(resolveSlotElements({ section: {} })).toEqual([]);
    });
    it("returns elements in elementOrder when provided", () => {
      const slot: ModuleSlotConfig = {
        section: {
          elementOrder: ["b", "a"],
          definitions: {
            a: elImage(),
            b: elVideo(),
          },
        },
      };
      const result = resolveSlotElements(slot);
      expect(result).toHaveLength(2);
      expect((result[0] as { type: string }).type).toBe("elementVideo");
      expect((result[1] as { type: string }).type).toBe("elementImage");
    });
    it("uses Object.keys order when elementOrder not provided", () => {
      const slot: ModuleSlotConfig = {
        section: {
          definitions: {
            a: elImage(),
            b: elVideo(),
          },
        },
      };
      const result = resolveSlotElements(slot);
      expect(result).toHaveLength(2);
      expect(result).toMatchObject([
        { id: "a", type: "elementImage" },
        { id: "b", type: "elementVideo" },
      ]);
    });
    it("adds id when definition has no id", () => {
      const slot: ModuleSlotConfig = {
        section: {
          elementOrder: ["x"],
          definitions: {
            x: elImage(),
          },
        },
      };
      const result = resolveSlotElements(slot);
      expect(result[0]).toMatchObject({ id: "x", type: "elementImage" });
    });
    it("filters out cssGradient and invalid entries", () => {
      const slot = {
        section: {
          elementOrder: ["a", "b", "c"],
          definitions: {
            a: elImage(),
            b: cssGradientDefinitionSchema.parse({
              type: "cssGradient",
              value: "linear-gradient(180deg, #000 0%, #fff 100%)",
            }),
            c: null,
          },
        },
      } as unknown as ModuleSlotConfig;
      const result = resolveSlotElements(slot);
      expect(result).toHaveLength(1);
      expect((result[0] as { type: string }).type).toBe("elementImage");
    });
  });

  describe("getRegionFromClientX", () => {
    it("returns left when x in first third", () => {
      const el = document.createElement("div");
      vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
        left: 0,
        width: 300,
        top: 0,
        height: 100,
        right: 300,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      expect(getRegionFromClientX(50, el)).toBe("left");
    });
    it("returns center when x in middle third", () => {
      const el = document.createElement("div");
      vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
        left: 0,
        width: 300,
        top: 0,
        height: 100,
        right: 300,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      expect(getRegionFromClientX(150, el)).toBe("center");
    });
    it("treats exact third boundaries as center", () => {
      const el = document.createElement("div");
      vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
        left: 0,
        width: 300,
        top: 0,
        height: 100,
        right: 300,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      expect(getRegionFromClientX(100, el)).toBe("center");
      expect(getRegionFromClientX(200, el)).toBe("center");
    });
    it("returns right when x in last third", () => {
      const el = document.createElement("div");
      vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
        left: 0,
        width: 300,
        top: 0,
        height: 100,
        right: 300,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      expect(getRegionFromClientX(250, el)).toBe("right");
    });
  });

  describe("getFeedbackJustifyContent", () => {
    it("returns flex-start for seekBack", () => {
      expect(getFeedbackJustifyContent("seekBack")).toBe("flex-start");
    });
    it("returns flex-end for seekForward", () => {
      expect(getFeedbackJustifyContent("seekForward")).toBe("flex-end");
    });
    it("returns center for other types", () => {
      expect(getFeedbackJustifyContent("play")).toBe("center");
    });
  });

  describe("getFeedbackPadding", () => {
    it("returns left padding for seekBack", () => {
      expect(getFeedbackPadding("seekBack")).toBe("0 0 0 15%");
    });
    it("returns right padding for seekForward", () => {
      expect(getFeedbackPadding("seekForward")).toBe("0 15% 0 0");
    });
    it("returns 0 for other types", () => {
      expect(getFeedbackPadding("play")).toBe("0");
    });
  });

  describe("inferSeekFeedbackType", () => {
    it("returns seekBack for negative payload", () => {
      expect(inferSeekFeedbackType(-10)).toBe("seekBack");
    });
    it("returns seekForward for positive payload", () => {
      expect(inferSeekFeedbackType(10)).toBe("seekForward");
    });
    it("returns undefined for undefined payload", () => {
      expect(inferSeekFeedbackType(undefined)).toBeUndefined();
    });
    it("maps zero payload to seekForward", () => {
      expect(inferSeekFeedbackType(0)).toBe("seekForward");
    });
  });
});
